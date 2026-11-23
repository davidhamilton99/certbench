// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ObjectiveStatus, PathStructure } from "@/core/path/types";
import { ExamMap, MapLegend, REHEARSAL_TILE, labTileKey, objectiveStanding, type LabState } from "../ExamMap";

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
        { code: "1.3", title: "Change management" },
        { code: "1.4", title: "Cryptography" },
      ],
      lab: { id: "certificate-lifecycle", title: "PKI Certificate Lifecycle", minutes: 5 },
    },
    {
      number: "2.0",
      title: "Threats, Vulnerabilities, and Mitigations",
      weight: 22,
      objectives: [
        { code: "2.1", title: "Threat actors" },
        { code: "2.2", title: "Threat vectors" },
      ],
      lab: { id: "attack-definitions", title: "Match Attacks to Descriptions", minutes: 4 },
    },
  ],
};

const statuses = new Map<string, ObjectiveStatus>([
  ["1.2", "got"],
  ["1.3", "got"],
  ["1.4", "missed"],
  ["2.2", "missed"],
]);

const labs = (first: LabState, second: LabState) => new Map<string, LabState>([["1.0", first], ["2.0", second]]);
const exam = (state: LabState, score?: number) => ({ state, questions: 90, minutes: 90, score });

/**
 * The row that reads `text`. No row has a label of its own (the first test holds
 * that), so the text a row holds is its accessible name. The rows are found by
 * their text and not through the test library's own naming, which drops the
 * spaces that a browser keeps between the parts of a row.
 */
function row(text: string): HTMLElement {
  const rows = screen.getAllByRole("button");
  const found = rows.find((b) => b.textContent === text);
  if (!found) throw new Error(`No row reads "${text}". The rows read: ${rows.map((b) => b.textContent).join(" | ")}`);
  return found;
}

afterEach(cleanup);

describe("the course outline's rows", () => {
  it("are named by the words they show, in the order they show them", () => {
    render(
      <ExamMap
        structure={structure}
        statuses={statuses}
        doneStops={new Set(["1.2", "1.4"])}
        current={new Set(["1.1"])}
        labs={labs("locked", "free")}
        rehearsal={exam("locked")}
        onSelect={() => {}}
      />
    );
    expect(row("1.1 Security controls, Next step")).toBeInTheDocument();
    expect(row("1.2 Core security concepts, Complete")).toBeInTheDocument();
    expect(row("1.4 Cryptography, To review")).toBeInTheDocument();
    expect(row("2.1 Threat actors, Not started")).toBeInTheDocument();
    expect(row("Lab, PKI Certificate Lifecycle, Included with Pro")).toBeInTheDocument();
    expect(row("Lab, Match Attacks to Descriptions, Free")).toBeInTheDocument();
    expect(row("Exam, Full-length timed practice exam, One practice exam is free.")).toBeInTheDocument();

    // No row carries a second name or a tooltip that could differ from its text.
    for (const button of screen.getAllByRole("button")) {
      expect(button.hasAttribute("aria-label")).toBe(false);
      expect(button.hasAttribute("aria-labelledby")).toBe(false);
      expect(button.hasAttribute("title")).toBe(false);
    }
    expect(screen.getAllByRole("button")).toHaveLength(9);
  });

  it("carry no label or tooltip of their own where they cannot be pressed", () => {
    const { container } = render(
      <ExamMap structure={structure} statuses={statuses} labs={labs("locked", "free")} rehearsal={exam("locked")} />
    );
    expect(screen.queryByRole("button")).toBeNull();
    const items = [...container.querySelectorAll("li")];
    expect(items).toHaveLength(9);
    for (const item of items) {
      expect(item.hasAttribute("aria-label")).toBe(false);
      expect(item.hasAttribute("title")).toBe(false);
    }
    expect(items[1].textContent).toBe("1.2 Core security concepts, Complete");
    // Each list is named by the heading over it.
    expect(screen.getByRole("list", { name: "Domain 1: General Security Concepts" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Practice exam" })).toBeInTheDocument();
  });

  it("open what is passed beneath the row that is pressed, and close on a second press", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ExamMap structure={structure} statuses={statuses} onSelect={onSelect} detail={<p>About this objective</p>} />
    );
    const row = screen.getByRole("button", { name: /1\.2 Core security concepts/ });
    expect(row.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenLastCalledWith("1.2");
    expect(screen.queryByText("About this objective")).toBeNull();

    rerender(
      <ExamMap
        structure={structure}
        statuses={statuses}
        selected="1.2"
        onSelect={onSelect}
        detail={<p>About this objective</p>}
      />
    );
    const open = screen.getByRole("button", { name: /1\.2 Core security concepts/ });
    expect(open.getAttribute("aria-expanded")).toBe("true");
    expect(open.closest("li")).toContainElement(screen.getByText("About this objective"));
    fireEvent.click(open);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("tell the page when a lab's row is hovered or takes the focus, with the lab's id, and say nothing for any other row", () => {
    const onLabIntent = vi.fn();
    render(
      <ExamMap
        structure={structure}
        statuses={statuses}
        labs={labs("open", "done")}
        rehearsal={exam("open")}
        onSelect={() => {}}
        onLabIntent={onLabIntent}
      />
    );
    fireEvent.pointerEnter(row("Lab, PKI Certificate Lifecycle, Available"));
    expect(onLabIntent).toHaveBeenLastCalledWith("certificate-lifecycle");
    fireEvent.focus(row("Lab, Match Attacks to Descriptions, Complete"));
    expect(onLabIntent).toHaveBeenLastCalledWith("attack-definitions");
    expect(onLabIntent).toHaveBeenCalledTimes(2);

    // An objective's row and the practice exam's row open no lab.
    fireEvent.pointerEnter(row("1.2 Core security concepts, Complete"));
    fireEvent.focus(row("Exam, Full-length timed practice exam, Available"));
    expect(onLabIntent).toHaveBeenCalledTimes(2);
  });

  it("keep the page's focus outline, set inside the row", () => {
    render(<ExamMap structure={structure} statuses={statuses} onSelect={() => {}} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("focus-visible:-outline-offset-2");
      expect(button.className).not.toMatch(/outline-none|focus-visible:ring|focus-visible:outline-ring/);
    }
  });
});

describe("where an objective stands", () => {
  it("is complete only when its own step is finished and nothing is left to review", () => {
    expect(objectiveStanding("got", true)).toBe("complete");
    expect(objectiveStanding("missed", true)).toBe("review");
    // Touched only by other questions: the introductory questions, the checkpoint, a practice exam.
    expect(objectiveStanding("got", false)).toBe("started");
    expect(objectiveStanding("missed", false)).toBe("started");
    expect(objectiveStanding("new", false)).toBe("new");
  });

  it("is told from the answers alone when the caller does not say which steps are finished", () => {
    expect(objectiveStanding("got", null)).toBe("complete");
    expect(objectiveStanding("missed", null)).toBe("review");
    expect(objectiveStanding("new", null)).toBe("new");
  });

  it("shows Started for an objective that only other questions have touched, and counts the domain the same way", () => {
    render(<ExamMap structure={structure} statuses={statuses} doneStops={new Set(["1.2", "1.4"])} onSelect={() => {}} />);
    // 1.2 is studied and right; 1.3 was answered correctly elsewhere; 1.4 is studied with a miss.
    expect(row("1.2 Core security concepts, Complete")).toBeInTheDocument();
    expect(row("1.3 Change management, Started")).toBeInTheDocument();
    expect(row("1.4 Cryptography, To review")).toBeInTheDocument();
    expect(row("2.2 Threat vectors, Started")).toBeInTheDocument();
    expect(screen.getByText("12% of the exam. 1 of 4 complete.")).toBeInTheDocument();
    expect(screen.getByText("22% of the exam. 0 of 2 complete.")).toBeInTheDocument();
  });

  it("names the next step as next even when other questions have touched it", () => {
    render(
      <ExamMap
        structure={structure}
        statuses={statuses}
        doneStops={new Set(["1.2"])}
        current={new Set(["1.3"])}
        onSelect={() => {}}
      />
    );
    expect(row("1.3 Change management, Next step")).toBeInTheDocument();
  });
});

describe("what the outline tints and aligns", () => {
  it("tints the next step's row and no other, whatever the rows around it have just become", () => {
    // Three other objectives have answers: none of their rows is marked out for it.
    render(<ExamMap structure={structure} statuses={statuses} current={new Set(["1.1"])} onSelect={() => {}} />);
    const tinted = screen.getAllByRole("button").filter((b) => /\bbg-tint-selected\b/.test(b.className));
    expect(tinted).toHaveLength(1);
    expect(tinted[0].textContent).toBe("1.1 Security controls, Next step");
  });

  it("sets a status and its check mark on the row's baseline", () => {
    render(<ExamMap structure={structure} statuses={statuses} onSelect={() => {}} />);
    const marked = screen.getAllByText("Complete", { selector: "span" });
    expect(marked.length).toBeGreaterThan(0);
    for (const status of marked) {
      expect(status.className).toContain("items-baseline");
      expect(status.className).not.toContain("items-center");
      expect(status.querySelector("svg")?.getAttribute("class")).toContain("translate-y-0.5");
    }
  });
});

describe("the practice exam's row", () => {
  it("says that one practice exam is free to anyone without Pro", () => {
    for (const state of ["locked", "free"] as const) {
      const { unmount } = render(<ExamMap structure={structure} statuses={statuses} rehearsal={exam(state, 64)} onSelect={() => {}} />);
      expect(row("Exam, Full-length timed practice exam, One practice exam is free.")).toBeInTheDocument();
      unmount();
    }
  });

  it("shows a Pro learner that it is available, and then the last result", () => {
    const { rerender } = render(
      <ExamMap structure={structure} statuses={statuses} rehearsal={exam("open")} onSelect={() => {}} />
    );
    expect(row("Exam, Full-length timed practice exam, Available")).toBeInTheDocument();
    rerender(<ExamMap structure={structure} statuses={statuses} rehearsal={exam("done", 72)} onSelect={() => {}} />);
    expect(row("Exam, Full-length timed practice exam, Last result: 72%")).toBeInTheDocument();
    expect(screen.getByText("90 questions in 90 minutes.")).toBeInTheDocument();
  });

  it("has the keys the study path opens rows by", () => {
    const onSelect = vi.fn();
    render(
      <ExamMap structure={structure} statuses={statuses} labs={labs("open", "done")} rehearsal={exam("open")} onSelect={onSelect} />
    );
    fireEvent.click(row("Lab, PKI Certificate Lifecycle, Available"));
    expect(onSelect).toHaveBeenLastCalledWith(labTileKey("1.0"));
    fireEvent.click(row("Lab, Match Attacks to Descriptions, Complete"));
    expect(onSelect).toHaveBeenLastCalledWith("lab:2.0");
    fireEvent.click(row("Exam, Full-length timed practice exam, Available"));
    expect(onSelect).toHaveBeenLastCalledWith(REHEARSAL_TILE);
  });
});

describe("the sentence under the outline", () => {
  it("says what is free before what Pro adds", () => {
    render(<MapLegend labs="locked" />);
    expect(
      screen.getByText("One practice exam and 12 labs are free. Further labs and practice exams are included with Pro.")
    ).toBeInTheDocument();
  });

  it("is left out for a learner with Pro, and where the outline has no labs", () => {
    const { container, rerender } = render(<MapLegend labs="open" />);
    expect(container.textContent).toBe("");
    rerender(<MapLegend />);
    expect(container.textContent).toBe("");
  });
});
