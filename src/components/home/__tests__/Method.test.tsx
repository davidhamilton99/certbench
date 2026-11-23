// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ExamMap } from "@/components/path/ExamMap";
import type { ObjectiveStatus, PathLabInfo, PathStructure } from "@/core/path/types";
import { Method } from "../Method";

const lab = (id: string, title: string, type: PathLabInfo["type"], minutes: number, domain = "1.0"): PathLabInfo => ({
  id,
  title,
  type,
  minutes,
  domain,
});

/** An outline in the shape the bank gives: CompTIA's domain names, and the labs domain by domain. */
const STRUCTURE: PathStructure = {
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
    { number: "4.0", title: "Security Operations", weight: 28, objectives: [{ code: "4.1", title: "Securing devices and apps" }] },
    {
      number: "5.0",
      title: "Security Program Management and Oversight",
      weight: 20,
      objectives: [{ code: "5.1", title: "Governance" }],
    },
  ],
  library: [
    lab("order-1", "Incident Response Order", "ordering", 3),
    lab("sim-1", "Firewall ACL Configuration", "simulation", 12),
    lab("match-1", "Match Attacks to Descriptions", "matching", 3, "2.0"),
    lab("sim-2", "Wireless Access Point Configuration for a Branch Office", "simulation", 10, "3.0"),
    lab("topo-1", "Network Segmentation and Firewall Rules", "topology", 12, "3.0"),
    lab("hunt-1", "Suspicious Sign-in Hunt", "threat-hunt", 1, "4.0"),
    lab("sort-1", "Sort the Controls", "categorization", 3, "5.0"),
  ],
};

const PROPS = {
  structure: STRUCTURE,
  steps: 41,
  minutes: 4,
  sample: { score: 82, from: 61, domains: [88, 79, 74, 83, 86] },
  freeLabs: 12,
  questions: 90,
  examMinutes: 90,
  examHref: "/security-plus-practice-test",
  labsHref: "/security-plus-pbq-examples",
};

const flat = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** The part of the method under a heading: its text column and its figure. */
function part(heading: string): HTMLElement {
  const h3 = screen.getByRole("heading", { level: 3, name: heading });
  return h3.parentElement!.parentElement!;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("how CertBench works, on the home page", () => {
  it("sets out three parts in the order they happen, each under a heading on the type scale", () => {
    render(<Method {...PROPS} />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Study one objective at a time.",
      "Practice in the hands-on labs.",
      "Take a full-length practice exam.",
    ]);
    for (const h of headings) expect(h.className).toBe("cb-subsection");
  });

  it("sets every part the same way round: the words first, the figure second, in two equal columns", () => {
    render(<Method {...PROPS} />);
    for (const name of ["Study one objective at a time.", "Practice in the hands-on labs.", "Take a full-length practice exam."]) {
      const row = part(name);
      expect(row.className).toContain("lg:grid-cols-2");
      expect(row.className).not.toMatch(/order-|flex-row-reverse|\[direction/);
      expect(row.children).toHaveLength(2);
      expect(row.children[0].querySelector("h3")).not.toBeNull();
      expect(row.children[1].tagName).toBe("FIGURE");
    }
  });

  it("prints the exam's code with every count, because the table above lists two versions of Security+", () => {
    const { container } = render(<Method {...PROPS} />);
    const text = flat(container);
    expect(text).toContain("The study path takes the 9 Security+ SY0-701 objectives in CompTIA's order.");
    expect(text).toContain("The Security+ SY0-701 study path has 41 steps, from the first question to a full practice exam.");
    expect(text).toContain("CertBench has 7 hands-on labs for Security+ SY0-701.");
    expect(text).toContain("These are 5 of the 7 Security+ SY0-701 labs.");
    expect(text).toContain("An example from the Security+ SY0-701 course outline.");
    // No count stands beside the exam's name alone.
    expect(text).not.toMatch(/\d+ Security\+ (?!SY0-701)/);
    // The code is kept whole wherever it is printed: a narrow screen must not break it at its hyphen.
    const whole = [...container.querySelectorAll("span.whitespace-nowrap")].filter((s) => s.textContent === "SY0-701");
    expect(whole).toHaveLength(text.split("SY0-701").length - 1);
    expect(whole.length).toBeGreaterThanOrEqual(6);
  });

  it("shows a domain of the course outline in the words the course outline itself prints", () => {
    render(<Method {...PROPS} />);
    const figure = part("Study one objective at a time.").querySelector("figure")!;
    expect(flat(figure.querySelector("p"))).toBe("Domain 1: General Security Concepts");
    expect(flat(figure)).toContain("12% of the exam. 1 of 4 complete.");
    // What is drawn in each row: the code, the title, and where the objective stands.
    const drawn = (li: Element) => [...li.children].filter((c) => !c.classList.contains("sr-only")).map((c) => flat(c));
    const rows = [...figure.querySelectorAll("li")];
    expect(rows.map(drawn)).toEqual([
      ["1.1", "Security controls", "Complete"],
      ["1.2", "Core security concepts", "To review"],
      ["1.3", "Change management", "Next step"],
      ["1.4", "Cryptography", "Not started"],
    ]);
    // "step" is for a screen reader only: the page prints "Next".
    expect(within(figure).getByText("Next").querySelector(".sr-only")?.textContent).toBe(" step");
    // The caption describes exactly those rows.
    expect(flat(figure.querySelector("figcaption"))).toBe(
      "An example from the Security+ SY0-701 course outline. The first objective is complete, the second has a question to review, and the third is next."
    );
    expect(flat(figure)).not.toContain("In progress");
  });

  it("reads, row for row, as the course outline itself does for a learner in that position", () => {
    render(<Method {...PROPS} />);
    const figure = part("Study one objective at a time.").querySelector("figure")!;
    const example = {
      head: flat(figure.querySelector("p")),
      count: flat(figure.querySelectorAll("p")[1]),
      rows: [...figure.querySelectorAll("li")].map((li) => flat(li)),
    };

    // The product's own outline for a learner who has finished the first two
    // steps, has a question from the second to review, and has the third next.
    const { container } = render(
      <ExamMap
        structure={STRUCTURE}
        statuses={new Map<string, ObjectiveStatus>([
          ["1.1", "got"],
          ["1.2", "missed"],
        ])}
        doneStops={new Set(["1.1", "1.2"])}
        current={new Set(["1.3"])}
      />
    );
    const domain = container.querySelector("section")!;
    expect(example).toEqual({
      head: flat(domain.querySelector("h3")),
      count: flat(domain.querySelector("p")),
      rows: [...domain.querySelectorAll("li")].map((li) => flat(li)),
    });
    expect(example.rows).toEqual([
      "1.1 Security controls, Complete",
      "1.2 Core security concepts, To review",
      "1.3 Change management, Next step",
      "1.4 Cryptography, Not started",
    ]);
    // The row that is next carries the same tint in both.
    const tinted = (root: Element) => [...root.querySelectorAll("li")].map((li) => li.className.includes("bg-tint-selected"));
    expect(tinted(figure)).toEqual(tinted(domain));
  });

  it("marks a status with its words and its ink, and keeps the mono face for codes", () => {
    render(<Method {...PROPS} />);
    const figure = part("Study one objective at a time.").querySelector("figure")!;
    expect(within(figure).getByText("1.1").className).toContain("font-mono");
    const complete = within(figure).getByText("Complete");
    expect(complete.className).toContain("text-success");
    // The size survives beside the color (a class merger would read "text-note" as a color and drop it).
    for (const status of ["Complete", "To review", "Next", "Not started"]) {
      expect(within(figure).getByText(status).className).toContain("text-note");
    }
    expect(within(figure).getByText("To review").className).toContain("text-warning-ink");
    expect(within(figure).getByText("Next").className).toContain("text-primary");
    expect(within(figure).getByText(/12% of the exam/).className).not.toContain("font-mono");
  });

  it("lists five of the exam's labs by name, the hands-on kinds first, with nothing cut short", () => {
    const { container } = render(<Method {...PROPS} />);
    const figure = part("Practice in the hands-on labs.").querySelector("figure")!;
    expect([...figure.querySelectorAll("li")].map((li) => [...li.children].map((c) => flat(c)))).toEqual([
      ["Firewall ACL Configuration", "Simulation, 12 minutes"],
      ["Wireless Access Point Configuration for a Branch Office", "Simulation, 10 minutes"],
      ["Network Segmentation and Firewall Rules", "Topology, 12 minutes"],
      ["Suspicious Sign-in Hunt", "Threat hunt, 1 minute"],
      ["Incident Response Order", "Ordering drill, 3 minutes"],
    ]);
    expect(flat(figure.querySelector("li"))).toBe("Firewall ACL Configuration Simulation, 12 minutes");
    // A long name wraps on a narrow screen: no line in any figure is clipped to one line.
    for (const el of container.querySelectorAll("figure *")) {
      const classes = String(el.getAttribute("class") ?? "");
      expect(classes).not.toMatch(/\b(truncate|line-clamp-\d+|text-ellipsis)\b/);
      // The one thing kept on a line is an exam code, which is seven or eight characters.
      if (/\bwhitespace-nowrap\b/.test(classes)) expect(el.textContent).toMatch(/^[A-Z0-9]{2,4}-\d{3,4}$/);
    }
  });

  it("says how many of the labs are free, and never more than the exam has", () => {
    const { container } = render(<Method {...PROPS} />);
    expect(flat(container)).toContain(
      "Of the 7 Security+ SY0-701 labs, 7 are free, and the first three do not require an account."
    );
    const library = Array.from({ length: 19 }, (_, i) => lab(`sim-${i}`, `Lab ${i + 1}`, "simulation", 8));
    const { container: full } = render(<Method {...PROPS} structure={{ ...STRUCTURE, library }} />);
    expect(flat(full)).toContain("Of the 19 Security+ SY0-701 labs, 12 are free, and the first three do not require an account.");
  });

  it("leaves the lab part out for an exam that has no labs", () => {
    render(<Method {...PROPS} structure={{ ...STRUCTURE, library: [] }} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Study one objective at a time.",
      "Take a full-length practice exam.",
    ]);
  });

  it("says that the report is an example before any of its figures", () => {
    render(<Method {...PROPS} />);
    const figure = part("Take a full-length practice exam.").querySelector("figure")!;
    expect(figure.firstElementChild?.tagName).toBe("FIGCAPTION");
    expect(flat(figure.firstElementChild)).toBe(
      "A sample report with example figures, for a second practice exam compared with the first."
    );
    const text = flat(figure);
    expect(text.indexOf("example figures")).toBeLessThan(text.indexOf("82"));
    expect(text.indexOf("Sample practice exam result")).toBeLessThan(text.indexOf("82"));
    // Every figure on the page says what it is first.
    for (const f of document.querySelectorAll("figure")) expect(f.firstElementChild?.tagName).toBe("FIGCAPTION");
  });

  it("prints the sample result and leaves it still", () => {
    vi.useFakeTimers();
    const frames = vi.spyOn(window, "requestAnimationFrame");
    render(<Method {...PROPS} />);
    vi.advanceTimersByTime(2000);
    const figure = part("Take a full-length practice exam.").querySelector("figure")!;
    expect(flat(figure)).toContain("82%");
    expect(flat(figure)).toContain("Target met");
    expect(flat(figure)).toContain(
      "The readiness target is 75%. This result is 21 points higher than your previous result of 61%."
    );
    // Nothing counts up: an example is not a learner's own result.
    expect(frames).not.toHaveBeenCalled();
    frames.mockRestore();
  });

  it("draws each domain of the sample report at its final length, under CompTIA's name for it", () => {
    render(<Method {...PROPS} />);
    const figure = part("Take a full-length practice exam.").querySelector("figure")!;
    const rows = [...figure.querySelectorAll("li")];
    expect(rows.map((li) => flat(li))).toEqual([
      "Domain 1: General Security Concepts 88%",
      "Domain 2: Threats, Vulnerabilities, and Mitigations 79%",
      "Domain 3: Security Architecture 74%",
      "Domain 4: Security Operations 83%",
      "Domain 5: Security Program Management and Oversight 86%",
    ]);
    const lengths = rows.map((li) => li.querySelector("[style*='scaleX']")?.getAttribute("style") ?? "");
    expect(lengths.map((s) => s.match(/scaleX\(([\d.]+)\)/)?.[1])).toEqual(["0.88", "0.79", "0.74", "0.83", "0.86"]);
    // A score below the readiness target is not drawn in the green of one that met it.
    expect(lengths[2]).toContain("var(--warning)");
    expect(lengths[0]).toContain("var(--success)");
  });

  it("describes the practice exam in the paragraph and puts the scaled-score sentence under the link", () => {
    render(<Method {...PROPS} />);
    const words = part("Take a full-length practice exam.").children[0];
    const paragraph = flat(words.querySelector("p"));
    expect(paragraph).toContain("The practice exam has 90 questions and a time limit of 90 minutes.");
    expect(paragraph).toContain("against a readiness target of 75%.");
    // The score is combined by the domains' weights (scoreCheckpoint), as the about page says.
    expect(paragraph).toContain(
      "The report gives your score for the whole exam, weighted by the share of the exam that each domain makes up, and the percentage that you answered correctly in each domain"
    );
    expect(paragraph).not.toContain("scale of 100 to 900");
    const link = within(words as HTMLElement).getByRole("link", { name: "Take the free practice exam" });
    // What CompTIA states (its passing scores are on that scale), and what CertBench does not know.
    expect(flat(link.parentElement)).toBe(
      "Take the free practice exam" +
        "CompTIA states its passing scores on a scale of 100 to 900. CertBench does not know how answers are converted to that scale, so it does not estimate a scaled score."
    );
  });

  it("links each part to the thing itself, as underlined text links with no arrow", () => {
    render(<Method {...PROPS} />);
    const links = screen.getAllByRole("link");
    // The link to the exam list has the one name that every page gives it.
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Choose your exam", "/start"],
      ["Try the free Security+ labs", "/security-plus-pbq-examples"],
      ["Take the free practice exam", "/security-plus-practice-test"],
    ]);
    for (const a of links) {
      expect(a.className).toContain("cb-link");
      expect(a.querySelector("svg")).toBeNull();
    }
  });

  // CompTIA's exam pages say that the exam has performance-based questions. They
  // do not say what those questions ask, so the part says what CertBench's own
  // labs ask and gives no example of the exam's.
  it("calls them hands-on labs, and says of the exam's performance-based questions only what CompTIA states", () => {
    const { container } = render(<Method {...PROPS} />);
    const text = flat(container);
    expect(text).not.toContain("hands-on questions");
    expect(text).toContain(
      "The Security+ SY0-701 exam has performance-based questions as well as multiple-choice questions, and CompTIA does not publish which topics they test."
    );
    expect(text).toContain(
      "In each lab you carry out a task in your browser instead of choosing an answer, and the labs are marked with partial credit."
    );
    expect(text).not.toMatch(/hands-on tasks in the real exam|such as setting firewall rules|work like/);
  });

  it("says what CertBench does, and claims nothing about the real exam's wording or its rules", () => {
    const { container } = render(<Method {...PROPS} />);
    const text = flat(container);
    expect(text).toContain("with quick questions first and then an exam-style question.");
    expect(text).toContain("Answers are not shown until the end, and an unanswered question is counted as incorrect.");
    expect(text).not.toMatch(/wording of the real exam|as it is in the real exam|as in the real exam/);
  });
});
