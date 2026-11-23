// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SessionBlock } from "@/core/session-plan/compute-plan";
import { DIAGNOSTIC_QUESTION_COUNT } from "@/core/constants";
import { DiagnosticGate } from "@/components/workspace/DiagnosticGate";
import { ReadinessPanel } from "@/components/workspace/ReadinessPanel";
import { SessionBlockCard } from "@/components/workspace/SessionBlockCard";

const DRILL: SessionBlock = {
  type: "domain_drill",
  priority: 2,
  title: "Domain drill: Security operations",
  description: "Your score in this domain is 48%. The domain is 28% of the exam.",
  reason: "This is your weakest domain, and it is 28% of the exam.",
  domainId: "d4",
  questionCount: 10,
  estimatedMinutes: 15,
  color: "danger",
};

describe("SessionBlockCard", () => {
  it("is one link that says its place, what it is and how long it takes", () => {
    render(<SessionBlockCard block={DRILL} certSlug="security-plus-sy0-701" order={2} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/certifications/security-plus-sy0-701/domain/d4");
    // The place is said in the name ("2. ") and drawn once in a box that is not read twice.
    expect(link).toHaveTextContent("2. Domain drill: Security operations");
    expect(link).toHaveTextContent("Your score in this domain is 48%. The domain is 28% of the exam.");
    expect(link).toHaveTextContent("10 questions, about 15 minutes.");
  });

  it("is drawn in ink: no status colour and no arrow", () => {
    const { container } = render(<SessionBlockCard block={DRILL} certSlug="security-plus-sy0-701" order={2} />);
    expect(container.innerHTML).not.toMatch(/danger|warning|success|destructive/);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("says when the block needs Pro", () => {
    render(<SessionBlockCard block={DRILL} certSlug="security-plus-sy0-701" locked />);
    expect(screen.getByRole("link")).toHaveTextContent("This is included with Pro.");
  });

  it("opens each kind of work at its own address", () => {
    const hrefOf = (type: SessionBlock["type"]) => {
      const { unmount } = render(<SessionBlockCard block={{ ...DRILL, type }} certSlug="x" />);
      const href = screen.getByRole("link").getAttribute("href");
      unmount();
      return href;
    };
    expect(hrefOf("diagnostic")).toBe("/certifications/x/diagnostic");
    expect(hrefOf("srs_review")).toBe("/certifications/x/srs");
    expect(hrefOf("weak_points")).toBe("/certifications/x/exam?type=weak_points");
    expect(hrefOf("practice_exam")).toBe("/certifications/x/exam?type=full");
    expect(hrefOf("new_content")).toBe("/certifications/x/exam?type=full&fresh=1");
  });
});

describe("DiagnosticGate", () => {
  it("says what the diagnostic is, with the real number of questions, and offers one action", () => {
    render(<DiagnosticGate certName="Security+" examCode="SY0-701" href="/certifications/s/diagnostic" />);
    expect(screen.getByRole("heading", { level: 1, name: "Study plan for Security+" })).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`The diagnostic has ${DIAGNOSTIC_QUESTION_COUNT} questions from every domain of Security\\+`)
      )
    ).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Start the diagnostic");
    expect(links[0]).toHaveAttribute("href", "/certifications/s/diagnostic");
  });

  it("promises only what the study plan does, in sentences, with no decoration", () => {
    const { container } = render(<DiagnosticGate certName="Security+" examCode="SY0-701" href="/d" />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Your readiness score is shown, with a score for each domain.",
      "Each day, the most useful work is set out for you in order.",
      "You practice the domains in which you make mistakes, and not those that you already know.",
    ]);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("ReadinessPanel", () => {
  const plan = {
    blocks: [],
    readinessScore: 62,
    readinessIsPreliminary: false,
    readinessTrend: { delta: 4, daysSpan: 7 } as never,
    domainScores: [
      { domainId: "d1", domainNumber: "1.0", title: "General security concepts", examWeight: 12, score: 80, attempted: 10, correct: 8 },
      { domainId: "d2", domainNumber: "2.0", title: "Threats", examWeight: 22, score: 0, attempted: 0, correct: 0 },
    ],
    totalQuestionsSeen: 40,
    totalQuestions: 800,
    examDate: null,
    daysUntilExam: 12,
  };

  it("prints the score and every domain's bar at its final length: nothing grows from empty", () => {
    const { container } = render(<ReadinessPanel plan={plan} />);
    expect(screen.getByRole("heading", { level: 2, name: "Readiness" })).toBeInTheDocument();
    expect(container).toHaveTextContent("62%");
    const fills = [...container.querySelectorAll<HTMLElement>("[aria-hidden] .origin-left")];
    expect(fills.map((el) => el.style.transform)).toEqual(["scaleX(0.62)", "scaleX(0.8)", "scaleX(0)"]);
    expect(container.innerHTML).not.toMatch(/animate-bar|animate-gauge|bar-grow|gauge-sweep/);
    expect(screen.getByText("Not scored")).toBeInTheDocument();
  });

  it("says the basis, the change and the days to the exam in sentences", () => {
    const { container } = render(<ReadinessPanel plan={plan} />);
    expect(container).toHaveTextContent(
      "This score is based on 40 answered questions. It has risen by 4 points in the last 7 days. Your exam is in 12 days."
    );
  });

  it("calls a preliminary score a baseline in progress, not a failure", () => {
    render(<ReadinessPanel plan={{ ...plan, readinessIsPreliminary: true, readinessTrend: null }} />);
    expect(screen.getByText("Baseline in progress")).toBeInTheDocument();
    expect(screen.queryByText("Below target")).toBeNull();
  });
});
