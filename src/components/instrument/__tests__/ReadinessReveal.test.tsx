// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ExamResult } from "@/contracts/quiz";

const api = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ api }));

import { ReadinessReveal } from "@/components/instrument/ReadinessReveal";

const RESULT: ExamResult = {
  attemptId: "a1",
  totalQuestions: 25,
  correctCount: 15,
  scorePercent: 60,
  domainBreakdown: [
    { domainId: "d1", domainNumber: "1.0", title: "General security concepts", total: 5, correct: 5 },
    { domainId: "d2", domainNumber: "2.0", title: "Threats, vulnerabilities and mitigations", total: 10, correct: 4 },
    { domainId: "d3", domainNumber: "3.0", title: "Security architecture", total: 10, correct: 6 },
  ],
  responses: [],
  readiness: null,
};

function reveal(result: ExamResult = RESULT) {
  return render(
    <ReadinessReveal
      result={result}
      certId="cert"
      certName="Security+"
      examCode="SY0-701"
      dashboardHref="/dashboard"
      domainWeights={{ d1: 12, d2: 22, d3: 18 }}
    />
  );
}

describe("ReadinessReveal, the result of the diagnostic", () => {
  it("opens on a sentence that says what was completed, and gives it the focus", () => {
    reveal();
    const heading = screen.getByRole("heading", { name: "You have completed the Security+ SY0-701 diagnostic." });
    expect(heading).toHaveFocus();
  });

  it("states what was measured and nothing else: no projection and no estimate of weeks", () => {
    const { container } = reveal();
    expect(container).not.toHaveTextContent(/week/i);
    expect(container).not.toHaveTextContent(/estimate/i);
    // The old screen drew a curve to a fixed height; no drawing is left.
    expect(container.querySelector("svg path, svg linearGradient")).toBeNull();
    // No dot-joined fragments.
    expect(container.textContent).not.toContain(String.fromCharCode(0x00b7));
    // The size of the sample is said in words.
    expect(container).toHaveTextContent("This result is based on 25 questions, so each answer changes it by about 4 points.");
  });

  it("reports a first result, not a measure of readiness: no mark at the target, and no 'Target met'", () => {
    const strong: ExamResult = {
      ...RESULT,
      correctCount: 22,
      scorePercent: 88,
      domainBreakdown: RESULT.domainBreakdown.map((d) => ({ ...d, correct: d.total })),
    };
    const { container } = reveal(strong);
    expect(screen.getByText("Strong first result")).toBeInTheDocument();
    expect(screen.queryByText("Target met")).toBeNull();
    expect(container).toHaveTextContent(
      "This is a strong first result. The next step is a full-length practice exam under exam conditions."
    );
    // The line at the readiness target is not ruled through the score or the domains.
    expect(container.querySelectorAll('[aria-hidden] > span[style*="left"]')).toHaveLength(0);
    // Every domain is strong, so no domain is singled out, and the labs are offered.
    expect(screen.queryByRole("heading", { name: "The domain to study first" })).toBeNull();
    expect(screen.getByRole("link", { name: "Open the hands-on labs" })).toHaveAttribute("href", "/pbq");
  });

  it("names the target in a sentence for a result that is close to it", () => {
    const { container } = reveal();
    expect(container).toHaveTextContent(
      "This is a first result and not a final one. The readiness target is 75%. The domain results below show where to study next."
    );
    expect(screen.getByText("Approaching target")).toBeInTheDocument();
  });

  it("draws every domain's bar at its final length in the markup, with no delay", () => {
    const { container } = reveal();
    const fills = [...container.querySelectorAll<HTMLElement>("[aria-hidden] .origin-left")];
    // The overall score and the three domains.
    expect(fills.map((el) => el.style.transform)).toEqual([
      "scaleX(0.6)",
      "scaleX(1)",
      "scaleX(0.4)",
      "scaleX(0.6)",
    ]);
    for (const el of fills) {
      expect(el.style.transitionDelay).toBe("");
      expect(el.className).not.toMatch(/rv-fill|animate-/);
    }
    expect(screen.getByText("5 of 5")).toBeInTheDocument();
    expect(screen.getByText("22% of the exam")).toBeInTheDocument();
  });

  it("names the domain with the most of the exam still to gain", () => {
    reveal();
    expect(screen.getByRole("heading", { name: "The domain to study first" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "You answered 4 of 10 questions correctly in Threats, vulnerabilities and mitigations, which is 22% of the exam."
      )
    ).toBeInTheDocument();
  });

  it("offers the study plan through the shared button, as a link", () => {
    reveal();
    const link = screen.getByRole("link", { name: "See your study plan" });
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link).toHaveAttribute("data-slot", "button");
  });

  it("ties the exam date field to its label and its hint, and confirms a saved date in a sentence", async () => {
    api.mockResolvedValue({ updated: true });
    reveal();
    const field = screen.getByLabelText("Exam date");
    expect(field).toHaveAttribute("type", "date");
    expect(field).toHaveAccessibleDescription(/If you have booked your exam, enter the date/);

    const inTenDays = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    fireEvent.change(field, { target: { value: inTenDays } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save the exam date" }));
    });

    expect(api).toHaveBeenCalledWith(expect.objectContaining({ path: expect.any(String) }), {
      certId: "cert",
      examDate: inTenDays,
    });
    const saved = screen.getByText(/Your exam date is saved\./);
    expect(saved).toHaveTextContent(/Your exam is in (9|10) days\./);
    expect(saved).toHaveFocus();
  });

  it("says a failed save in a sentence beside the field", async () => {
    api.mockRejectedValue(new Error("Request failed (500)"));
    reveal();
    const field = screen.getByLabelText("Exam date");
    fireEvent.change(field, { target: { value: "2027-01-15" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save the exam date" }));
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("The date could not be saved. Please try again.");
    expect(screen.getByLabelText("Exam date")).toHaveAttribute("aria-invalid", "true");
  });
});
