// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

import { ReadinessCheck } from "../ReadinessCheck";
import type { CheckQuestion } from "@/lib/tools/readiness-estimate";

const QUESTIONS: CheckQuestion[] = [
  {
    questionText: "Which port does DNS use?",
    options: ["53", "80", "443", "22"],
    correctIndex: 0,
    explanation: "DNS uses port 53. It answers over UDP, and over TCP for zone transfers.",
    domainTitle: "Networking Concepts",
    examWeight: 60,
  },
  {
    questionText: "Which protocol encrypts a remote shell?",
    options: ["Telnet", "SSH"],
    correctIndex: 1,
    explanation: "SSH encrypts the session.",
    domainTitle: "Network Security",
    examWeight: 40,
  },
];

function check() {
  return render(
    <ReadinessCheck cert="network-plus-n10-009" questions={QUESTIONS} shortCertName="Network+" objectiveCount={5} />
  );
}

const answers = (prompt: string) => within(screen.getByRole("group", { name: prompt }));

beforeEach(() => {
  track.mockClear();
});

describe("ReadinessCheck", () => {
  it("opens on the first question without taking the focus", () => {
    check();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Networking Concepts")).toBeInTheDocument();
    // The answers are a group named by the question, and each is a plain button.
    expect(answers("Which port does DNS use?").getAllByRole("button")).toHaveLength(4);
    expect(document.body).toHaveFocus();
  });

  it("says in words that an answer was incorrect, and what the correct answer is", () => {
    check();
    fireEvent.click(answers("Which port does DNS use?").getByRole("button", { name: "80" }));

    // The verdict in a sentence, then the reason.
    expect(screen.getByText("Incorrect. The correct answer is 53.")).toBeInTheDocument();
    expect(screen.getByText(/DNS uses port 53\./)).toBeInTheDocument();
    // The two marked answers say what they are, not only by colour.
    expect(answers("Which port does DNS use?").getByRole("button", { name: /^Correct answer: ?53$/ })).toBeDisabled();
    expect(
      answers("Which port does DNS use?").getByRole("button", { name: /^Your answer, which is incorrect: ?80$/ })
    ).toBeDisabled();
    // Continue takes the focus and is described by the verdict, so the verdict is read with it.
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toHaveFocus();
    expect(next).toHaveAccessibleDescription(/^Incorrect\. The correct answer is 53\. DNS uses port 53\./);
  });

  it("says that an answer was correct, and gives the next question the focus", () => {
    check();
    fireEvent.click(answers("Which port does DNS use?").getByRole("button", { name: "53" }));
    expect(screen.getByText("Correct.")).toBeInTheDocument();
    expect(
      answers("Which port does DNS use?").getByRole("button", { name: /^Your answer, which is correct: ?53$/ })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Network Security")).toBeInTheDocument();
    // A question that follows an answer is read: its prompt has the focus.
    expect(screen.getByText("Which protocol encrypts a remote shell?")).toHaveFocus();
  });

  it("ends on the estimate, in the words every score report uses", () => {
    check();
    fireEvent.click(answers("Which port does DNS use?").getByRole("button", { name: "53" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(answers("Which protocol encrypts a remote shell?").getByRole("button", { name: "Telnet" }));
    // The last question's button says what follows.
    fireEvent.click(screen.getByRole("button", { name: "View my estimate" }));

    const heading = screen.getByRole("heading", { level: 2, name: "You answered 1 of 2 questions correctly." });
    expect(heading).toHaveFocus();
    // 60% of the weight correct: between the two thresholds.
    const estimate = within(screen.getByRole("region", { name: "Network+ readiness estimate" }));
    expect(estimate.getByText("Estimated readiness")).toBeInTheDocument();
    expect(estimate.getByText("Approaching target")).toBeInTheDocument();
    expect(estimate.getByText(/The readiness target is 75%\./)).toBeInTheDocument();
    const domains = within(estimate.getByRole("list", { name: "Your answers by exam domain" })).getAllByRole("listitem");
    expect(domains.map((d) => d.textContent)).toEqual([
      "Networking Concepts1 of 1 correct",
      "Network Security0 of 1 correct",
    ]);

    const path = estimate.getByRole("link", { name: "Start the Network+ study path" });
    expect(path).toHaveAttribute("href", "/path/network-plus-n10-009");
    path.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(path);
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "readiness_check",
      href: "/path/network-plus-n10-009",
    });
  });

  // The Network+ study path is set out by CertBench's own topics, which are not
  // CompTIA's N10-009 objectives, so its count is never called objectives.
  it("counts the Network+ study path in topics, and an exam with CompTIA's own objectives in objectives", () => {
    const playToEstimate = () => {
      fireEvent.click(answers("Which port does DNS use?").getByRole("button", { name: "53" }));
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      fireEvent.click(answers("Which protocol encrypts a remote shell?").getByRole("button", { name: "SSH" }));
      fireEvent.click(screen.getByRole("button", { name: "View my estimate" }));
    };

    const network = check();
    playToEstimate();
    const networkEstimate = screen.getByRole("region", { name: "Network+ readiness estimate" });
    expect(networkEstimate).toHaveTextContent("The Network+ study path covers all 5 topics, one short step at a time");
    expect(networkEstimate.textContent).not.toMatch(/objectives/);
    network.unmount();

    render(
      <ReadinessCheck cert="security-plus-sy0-701" questions={QUESTIONS} shortCertName="Security+" objectiveCount={28} />
    );
    playToEstimate();
    expect(screen.getByRole("region", { name: "Security+ readiness estimate" })).toHaveTextContent(
      "The Security+ study path covers all 28 objectives, one short step at a time"
    );
  });

  // On a two-line domain name the count sat on the first line and the bar was
  // centred on both (DE-13): each row now sets its parts at the top, and the bar
  // on the label's first line.
  it("sets each domain's bar on the first line of its name, beside the count", () => {
    check();
    fireEvent.click(answers("Which port does DNS use?").getByRole("button", { name: "53" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(answers("Which protocol encrypts a remote shell?").getByRole("button", { name: "SSH" }));
    fireEvent.click(screen.getByRole("button", { name: "View my estimate" }));
    const rows = within(screen.getByRole("list", { name: "Your answers by exam domain" })).getAllByRole("listitem");
    for (const row of rows) {
      expect(row.className).toContain("items-start");
      expect(row.className).not.toContain("items-center");
      // The bar is drawn only; its first-line offset applies where it stands beside the label.
      expect(row.querySelector("[aria-hidden]")?.className).toContain("sm:mt-2");
    }
  });

  it("names the band from the shared readiness bands", () => {
    check();
    fireEvent.click(answers("Which port does DNS use?").getByRole("button", { name: "53" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(answers("Which protocol encrypts a remote shell?").getByRole("button", { name: "SSH" }));
    fireEvent.click(screen.getByRole("button", { name: "View my estimate" }));
    expect(screen.getByText("Target met")).toBeInTheDocument();
    expect(screen.queryByText(/At or above/)).toBeNull();
  });

  it("starts again from the first question, which then takes the focus", () => {
    check();
    fireEvent.click(answers("Which port does DNS use?").getByRole("button", { name: "22" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(answers("Which protocol encrypts a remote shell?").getByRole("button", { name: "Telnet" }));
    fireEvent.click(screen.getByRole("button", { name: "View my estimate" }));
    expect(screen.getByText("Below target")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Take the check again" }));
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Which port does DNS use?")).toHaveFocus();
    // Nothing is carried over: every answer is open again.
    expect(answers("Which port does DNS use?").getByRole("button", { name: "22" })).toBeEnabled();
  });

  it("answers with a letter key only while the focus is inside the card", () => {
    check();
    // A key pressed elsewhere on the page does nothing.
    fireEvent.keyDown(document.body, { key: "b" });
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();

    const option = answers("Which port does DNS use?").getByRole("button", { name: "80" });
    option.focus();
    fireEvent.keyDown(option, { key: "b" });
    expect(screen.getByText("Incorrect. The correct answer is 53.")).toBeInTheDocument();
  });
});
