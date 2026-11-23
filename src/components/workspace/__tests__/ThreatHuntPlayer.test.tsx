// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ThreatHuntScenario } from "@/data/pbq/types";
import { gradeThreatHunt } from "@/core/pbq/grade-threat-hunt";
import { ThreatHuntPlayer } from "../ThreatHuntPlayer";

const DOT = String.fromCharCode(0xb7);

const hunt: ThreatHuntScenario = {
  type: "threat-hunt",
  id: "hunt-test",
  title: "Compromised SSH server",
  briefing: "An alert fired on web-prod-01. Flag the evidence, then say what happened.",
  domain_number: "4.0",
  domain_title: "Security Operations",
  // The bank files a source with a dot between its parts.
  logSource: `/var/log/auth.log ${DOT} web-prod-01`,
  lines: [
    { text: "02:03:11 Failed password for root", malicious: true, note: "The start of the burst." },
    { text: "02:03:12 Failed password for admin", malicious: true, note: "The same source, one second later." },
    { text: "02:03:24 Accepted password for root", malicious: true, note: "The guessing worked." },
    { text: "02:03:15 CRON session opened", malicious: false, note: "A routine job." },
    { text: "02:05:02 Accepted publickey for deploy", malicious: false },
  ],
  question: "What does this evidence indicate?",
  options: ["A brute-force attack that succeeded", "A denial-of-service attack", "A failing backup job"],
  correctOption: 0,
  explanation: "One address guesses passwords in a burst and then signs in as root.",
  estimatedMinutes: 4,
};

const line = (text: RegExp | string) => screen.getByRole("button", { name: text });
const analyze = () => screen.getByRole("button", { name: "Analyze" });
const answers = () => within(screen.getByRole("radiogroup", { name: "What does this evidence indicate?" }));
const score = () => screen.getByRole("group", { name: "Your score" });
/** The name of an answer once it is marked: what a screen reader is told, then the answer. */
const marked = (said: string, answer: string) => new RegExp(`^${said}:\\s*${answer}$`);

describe("threat hunts", () => {
  it("draws the log in the console frame every lab shares, in that frame's own ink", () => {
    render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} />);
    const log = screen.getByRole("list", { name: "Log lines" });
    // The frame is dark paper in both themes: everything inside takes the dark theme's tokens.
    const frame = log.closest(".dark");
    expect(frame).not.toBeNull();
    // Nothing inside names a colour of its own, and nothing is set in the page's button ink
    // (that token is dark in the dark theme, which made the console unreadable there).
    const classes = [frame!, ...frame!.querySelectorAll("*")].map((el) => el.getAttribute("class") ?? "").join(" ");
    expect(classes).not.toMatch(
      /#|primary-foreground|\b(?:text|bg|border|fill|stroke|ring)-(?:white|black|amber|emerald|sky|rose|slate|zinc|gray)\b/
    );
    // The source reads as a list, with no dot between its parts.
    expect(within(frame as HTMLElement).getByText("/var/log/auth.log, web-prod-01")).toBeInTheDocument();
    expect(frame!.textContent).not.toContain(DOT);
    // Line numbers are drawn for the eye and are not read out with each line.
    expect(line("02:03:11 Failed password for root")).toBeInTheDocument();
    expect(log.querySelectorAll('li span[aria-hidden="true"]').length).toBeGreaterThanOrEqual(hunt.lines.length);
  });

  it("flags a line with a press and removes the flag with another, and says how many are flagged", () => {
    render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} />);
    expect(screen.getByText("Choose each line of the log that is evidence.")).toBeInTheDocument();
    const first = line("02:03:11 Failed password for root");
    expect(first).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText("You have flagged 1 line. Choose a flagged line again to remove its flag.")
    ).toBeInTheDocument();
    fireEvent.click(line("02:03:15 CRON session opened"));
    expect(
      screen.getByText("You have flagged 2 lines. Choose a flagged line again to remove its flag.")
    ).toBeInTheDocument();
    fireEvent.click(first);
    fireEvent.click(line("02:03:15 CRON session opened"));
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Choose each line of the log that is evidence.")).toBeInTheDocument();
  });

  it("waits for a flag and an answer, and says so beside the button", () => {
    render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} />);
    expect(analyze()).toBeDisabled();
    expect(analyze()).toHaveAccessibleDescription("Flag at least one line and answer the question before you analyze.");
    fireEvent.click(line("02:03:11 Failed password for root"));
    expect(analyze()).toBeDisabled();
    fireEvent.click(answers().getByRole("radio", { name: "A denial-of-service attack" }));
    expect(analyze()).toBeEnabled();
    expect(screen.queryByText(/before you analyze/)).toBeNull();
  });

  it("asks its question as a radio group: one answer at a time, changed with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} />);
    const radios = answers().getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios.every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    fireEvent.click(radios[1]);
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    radios[1].focus();
    // Held down, as a key is for a moment on a real keyboard: the group moves and checks while it is.
    await user.keyboard("{ArrowDown>}");
    expect(radios[2]).toHaveFocus();
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
    expect(radios[1]).toHaveAttribute("aria-checked", "false");
    await user.keyboard("{/ArrowDown}");
  });

  it("analyzes the hunt once with the grader, and marks every line that mattered in words", () => {
    const onGraded = vi.fn();
    render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} onGraded={onGraded} />);
    // Two of the three lines of evidence, and one line that is not.
    fireEvent.click(line("02:03:11 Failed password for root"));
    fireEvent.click(line("02:03:12 Failed password for admin"));
    fireEvent.click(line("02:03:15 CRON session opened"));
    fireEvent.click(answers().getByRole("radio", { name: "A brute-force attack that succeeded" }));
    fireEvent.click(analyze());

    const graded = gradeThreatHunt(hunt, { flagged: [0, 1, 3], attackChoice: 0 });
    expect(onGraded).toHaveBeenCalledTimes(1);
    expect(onGraded.mock.calls[0][0]).toEqual(graded);

    // The score is the figure, its verdict and a sentence that says what it counts. It takes the focus.
    expect(score()).toHaveFocus();
    expect(graded.score).toBe(71);
    expect(score()).toHaveTextContent("71%");
    expect(score()).toHaveTextContent("Partly identified");
    expect(score()).toHaveTextContent(
      "You flagged 2 of the 3 lines of evidence and 1 line that was not evidence. Your answer to the question was correct."
    );

    // The lines are text now, each mark said in a sentence with the reason beside it.
    const log = within(screen.getByRole("list", { name: "Log lines" }));
    expect(log.queryByRole("button")).toBeNull();
    expect(log.getAllByText("You flagged this evidence.")).toHaveLength(2);
    expect(log.getByText("You missed this evidence.").parentElement).toHaveTextContent(
      "You missed this evidence. The guessing worked."
    );
    expect(log.getByText("This line is not evidence.").parentElement).toHaveTextContent(
      "This line is not evidence. A routine job."
    );
    // A line that was not evidence and was left alone carries no mark.
    expect(log.getByText("02:05:02 Accepted publickey for deploy").closest("li")).not.toHaveTextContent(/evidence/);

    // The answers are marked in words too, and can no longer be changed.
    expect(
      answers().getByRole("radio", { name: marked("Your answer, which is correct", "A brute-force attack that succeeded") })
    ).toBeDisabled();
    expect(screen.getByRole("heading", { name: "What happened" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Analyze" })).toBeNull();
  });

  it("draws the way out after the score as an outline button, never a grey one that looks disabled", () => {
    render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} />);
    fireEvent.click(line("02:03:11 Failed password for root"));
    fireEvent.click(answers().getByRole("radio", { name: "A brute-force attack that succeeded" }));
    fireEvent.click(analyze());
    const ways = screen.getAllByRole("button", { name: "Return to the scenarios" });
    // The last is the button under the score; the first is the arrow beside the title.
    const out = ways[ways.length - 1];
    expect(out).toHaveTextContent("Return to the scenarios");
    expect(out.className).toContain("border-foreground/25");
    expect(out.className).not.toContain("bg-foreground/[0.07]");
  });

  it("names the correct answer when the one chosen was wrong", () => {
    render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} />);
    fireEvent.click(line("02:03:24 Accepted password for root"));
    fireEvent.click(answers().getByRole("radio", { name: "A failing backup job" }));
    fireEvent.click(analyze());
    expect(answers().getByRole("radio", { name: marked("Your answer, which is incorrect", "A failing backup job") })).toBeDisabled();
    expect(
      answers().getByRole("radio", { name: marked("Correct answer", "A brute-force attack that succeeded") })
    ).toBeDisabled();
    expect(score()).toHaveTextContent("Your answer to the question was incorrect.");
  });

  it("words the verdict by the band the score falls in", () => {
    const { unmount } = render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} />);
    for (const l of hunt.lines.filter((x) => x.malicious)) fireEvent.click(line(l.text));
    fireEvent.click(answers().getByRole("radio", { name: "A brute-force attack that succeeded" }));
    fireEvent.click(analyze());
    expect(score()).toHaveTextContent("100%");
    expect(score()).toHaveTextContent("Threat identified");
    expect(score()).toHaveTextContent("You flagged 3 of the 3 lines of evidence. Your answer to the question was correct.");
    unmount();

    render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} />);
    for (const l of hunt.lines.filter((x) => !x.malicious)) fireEvent.click(line(l.text));
    fireEvent.click(answers().getByRole("radio", { name: "A failing backup job" }));
    fireEvent.click(analyze());
    expect(score()).toHaveTextContent("0%");
    expect(score()).toHaveTextContent("Threat not identified");
  });

  it("tells the host once that play has started, at the first flag or answer and not before", () => {
    const onStarted = vi.fn();
    render(<ThreatHuntPlayer scenario={hunt} onBack={vi.fn()} onStarted={onStarted} takeFocus />);
    // Opened in answer to a press: the title has the focus, and nothing has started.
    expect(screen.getByRole("heading", { name: "Compromised SSH server" })).toHaveFocus();
    expect(onStarted).not.toHaveBeenCalled();
    fireEvent.click(answers().getByRole("radio", { name: "A denial-of-service attack" }));
    expect(onStarted).toHaveBeenCalledTimes(1);
    fireEvent.click(line("02:03:11 Failed password for root"));
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it("repeats from a clean log, with the focus on what it asks, and leaves by the host's own words", () => {
    const onBack = vi.fn();
    render(<ThreatHuntPlayer scenario={hunt} onBack={onBack} backLabel="Choose another lab" />);
    fireEvent.click(line("02:03:11 Failed password for root"));
    fireEvent.click(answers().getByRole("radio", { name: "A denial-of-service attack" }));
    fireEvent.click(analyze());
    fireEvent.click(screen.getByRole("button", { name: /Repeat the lab/ }));
    expect(screen.queryByRole("group", { name: "Your score" })).toBeNull();
    expect(screen.getByText("Choose each line of the log that is evidence.")).toHaveFocus();
    expect(line("02:03:11 Failed password for root")).toHaveAttribute("aria-pressed", "false");
    expect(answers().getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Choose another lab" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
