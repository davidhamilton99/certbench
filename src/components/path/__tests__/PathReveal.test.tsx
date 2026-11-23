// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { CheckpointResult, PathStructure } from "@/core/path/types";
import { bandFor } from "@/lib/readiness/band";
import { OpportunityNote, PathReveal, ReadingCard } from "../PathReveal";

const structure: PathStructure = {
  certSlug: "security-plus-sy0-701",
  examName: "Security+",
  examCode: "SY0-701",
  domains: [
    {
      number: "1.0",
      title: "General Security Concepts",
      weight: 12,
      objectives: [
        { code: "1.1", title: "Security controls" },
        { code: "1.2", title: "Core security concepts" },
      ],
    },
    {
      number: "2.0",
      title: "Threats, Vulnerabilities, and Mitigations",
      weight: 22,
      objectives: [
        { code: "2.1", title: "Threat actors" },
        { code: "2.2", title: "Threat vectors" },
      ],
    },
    { number: "3.0", title: "Security Architecture", weight: 18, objectives: [{ code: "3.1", title: "Architecture models" }] },
  ],
};

/** A result of `score` from `first` of 6 and `second` of 6 questions in the first two domains. */
const result = (score: number, first = 3, second = 3, total = 6): CheckpointResult => ({
  score,
  at: 1_800_000_000_000,
  domains: [
    { number: "1.0", correct: first, total },
    { number: "2.0", correct: second, total },
  ],
});

function reveal(score: number, props: Partial<Parameters<typeof PathReveal>[0]> = {}) {
  return (
    <PathReveal result={result(score)} structure={structure} goal={null} remainingStops={20} studied={1} {...props}>
      <p>What comes next</p>
    </PathReveal>
  );
}

afterEach(cleanup);

describe("the checkpoint result", () => {
  it("is the screen's title, and what comes next follows it", () => {
    render(reveal(50));
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.textContent).toBe("You are making good progress.");
    // A heading from the type scale, which can take the focus when the screen changes.
    expect(title.className).toBe("cb-section");
    expect(title.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByText("Security+ readiness checkpoint")).toBeInTheDocument();
    expect(screen.getByText("What comes next")).toBeInTheDocument();
  });

  it("describes a score in the words every other page uses for its band", () => {
    for (const score of [20, 50]) {
      const { unmount } = render(reveal(score));
      expect(screen.getByText(bandFor(score).label)).toBeInTheDocument();
      unmount();
    }
    expect(bandFor(20).label).toBe("Below target");
    expect(bandFor(50).label).toBe("Approaching target");
  });

  it("calls a high score a strong first result, and never says that the target is met or marks it", () => {
    const { container } = render(reveal(92));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("This is a strong first result.");
    expect(screen.getByText("Strong first result")).toBeInTheDocument();
    expect(container.textContent).not.toContain(bandFor(92).label);
    expect(container.textContent).not.toMatch(/readiness target is|ready for the exam/i);
  });

  it("says how large the sample was, in a sentence that is right for one point and for several", () => {
    const { unmount } = render(reveal(50));
    expect(
      screen.getByText("This result is based on 12 questions, so each answer changes it by about 8 points. The exam itself has up to 90 questions.")
    ).toBeInTheDocument();
    unmount();
    render(
      <PathReveal result={result(70, 32, 31, 45)} structure={structure} goal={null} remainingStops={20} studied={1} fromExam>
        <p>What comes next</p>
      </PathReveal>
    );
    expect(screen.getByText(/based on 90 questions, so each answer changes it by about 1 point\./)).toBeInTheDocument();
    expect(screen.getByText("Security+ practice exam")).toBeInTheDocument();
    expect(screen.getByText("Practice exam result")).toBeInTheDocument();
  });

  it("draws how much has been studied with the one progress bar, at its final length", () => {
    const { container } = render(reveal(50, { studied: 1 }));
    expect(screen.getByText("You have studied 1 of 5 objectives.")).toBeInTheDocument();
    expect(screen.getByText("There are 4 objectives still to study.")).toBeInTheDocument();
    const sentence = screen.getByText("You have studied 1 of 5 objectives.").closest("div");
    const bar = sentence?.querySelector("[aria-hidden='true']");
    // The sentence gives the figure, so the bar is a drawing of it and is not read twice.
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("role")).toBeNull();
    const fill = bar?.firstElementChild as HTMLElement;
    expect(fill.style.transform).toBe("scaleX(0.2)");
    expect(fill.style.width).toBe("");
    // A rule drawn thick: square ends, and nothing that moves.
    expect(sentence?.innerHTML).not.toMatch(/rounded-full|transition/);
    expect(container.innerHTML).not.toContain("rounded-full");
  });

  it("says when the study path will be finished at the learner's pace", () => {
    render(reveal(50, { goal: { examDate: null, target: null, minutes: 30, at: 1 } }));
    expect(screen.getByText(/^At 30 minutes a day, you will finish the study path by [A-Z][a-z]+ \d{1,2}\.$/)).toBeInTheDocument();
    expect(
      screen.getByText("When you book your exam, enter the date and the study path will keep you on schedule.")
    ).toBeInTheDocument();
  });
});

describe("the score report card", () => {
  it("is a second-level heading unless it is told that it is the screen's title", () => {
    render(
      <ReadingCard
        result={result(80)}
        structure={structure}
        kicker="Security+ practice exam"
        headline="You met the readiness target."
        caption="Practice exam result"
        summary="You scored 80% across 90 questions."
      />
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("You met the readiness target.");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    // With no other verdict given, the band's own words stand beside the score.
    expect(screen.getByText("Target met")).toBeInTheDocument();
    expect(screen.getByText(/The readiness target is 75%\./)).toBeInTheDocument();
  });

  it("gives each domain's result in words, with a bar drawn at its final length beside it", () => {
    const { container } = render(
      <ReadingCard
        result={result(50, 5, 1)}
        structure={structure}
        kicker="Security+ readiness checkpoint"
        headline="You are making good progress."
        caption="Checkpoint result"
        summary="A summary."
      />
    );
    const rows = [...container.querySelectorAll("ul > li")];
    expect(rows.map((row) => row.querySelector("div")?.textContent)).toEqual([
      "Domain 1 General Security Concepts 5 of 6 correct",
      "Domain 2 Threats, Vulnerabilities, and Mitigations 1 of 6 correct",
      "Domain 3 Security Architecture Not asked",
    ]);
    const fills = rows.map((row) => row.querySelector<HTMLElement>("[aria-hidden='true'] .origin-left"));
    expect(fills.map((fill) => fill?.style.transform)).toEqual(["scaleX(0.83)", "scaleX(0.17)", "scaleX(0)"]);
    // A long domain title wraps: it is never cut short.
    expect(container.innerHTML).not.toContain("truncate");
    // Counts are set in the text face; the code face is for codes.
    expect(container.querySelector("ul")?.innerHTML).not.toContain("font-mono");
  });

  it("is drawn with the score display that every page shares", () => {
    const source = readFileSync(join(process.cwd(), "src/components/path/PathReveal.tsx"), "utf8");
    expect(source).not.toMatch(/ReadinessDial/);
    expect(source).toMatch(/from "@\/components\/instrument\/ScoreLevel"/);
    expect(source).toMatch(/from "@\/components\/ui\/progress-bar"/);
  });
});

describe("the note on where to gain the most", () => {
  it("names the domain and its share of the exam", () => {
    render(<OpportunityNote domain={structure.domains[1]} />);
    expect(screen.getByText("The area to focus on next")).toBeInTheDocument();
    expect(
      screen.getByText("Threats, Vulnerabilities, and Mitigations accounts for 22% of the exam, and it is where you can gain the most.")
    ).toBeInTheDocument();
  });
});
