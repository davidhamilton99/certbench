// @vitest-environment jsdom
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// The link as an anchor that shows what it was told about fetching its page early.
vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    ...rest
  }: { prefetch?: boolean | null; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

import {
  LanderBlock,
  LanderHero,
  LanderProse,
  LanderSection,
  LanderStage,
  Specs,
} from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero, ArticleRow, ArticleSection, CtaBand } from "@/components/marketing/lander/Article";
import { ExamOutline } from "@/components/marketing/lander/ExamOutline";
import { TileGrid } from "@/components/marketing/lander/TileGrid";
import { COLUMN, PAGE } from "@/components/marketing/lander/layout";

/** The classes of the page's container: the header's and the footer's own. */
const PAGE_CLASSES = PAGE.split(" ");

describe("the two widths", () => {
  it("sets a page in the container that the header and the footer use", () => {
    expect(PAGE_CLASSES).toEqual(expect.arrayContaining(["mx-auto", "max-w-6xl", "px-5", "sm:px-6"]));
    expect(COLUMN).toBe("max-w-3xl");
  });
});

describe("Specs", () => {
  const FACTS = [
    { label: "Questions", value: "90" },
    { label: "Time limit", value: "90 minutes" },
    { label: "Scoring", value: "By domain" },
    { label: "Question bank", value: "842 questions" },
  ];

  it("sets labelled facts as a summary list: each fact a term and its value", () => {
    const { container } = render(<Specs items={FACTS} />);
    const list = container.querySelector("dl")!;
    expect(list).not.toBeNull();
    expect([...list.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual(FACTS.map((f) => f.label));
    expect([...list.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual(FACTS.map((f) => f.value));
    // Each pair is one group, so a term stays with its value.
    for (const dt of list.querySelectorAll("dt")) expect(dt.parentElement?.querySelector("dd")).not.toBeNull();
  });

  it.each([
    [1, "sm:grid-cols-1"],
    [2, "sm:grid-cols-2"],
    [3, "sm:grid-cols-3"],
    [4, "sm:grid-cols-4"],
    [5, "sm:grid-cols-4"],
  ])("gives %i facts equal columns, so none falls to a row by itself behind a stray rule", (count, columns) => {
    const items = Array.from({ length: count }, (_, i) => ({ label: `Fact ${i + 1}`, value: String(i) }));
    const { container } = render(<Specs items={items} />);
    const list = container.querySelector("dl")!;
    // A grid, two columns on a phone: nothing in it is a flex row that wraps.
    expect(list).toHaveClass("grid", "grid-cols-2", columns);
    expect(list.className).not.toMatch(/flex/);
    // The rules are the list's own top and bottom: no cell draws one at its side.
    expect(list).toHaveClass("border-y");
    for (const cell of list.children) expect(cell.className).not.toMatch(/border/);
  });

  it("still accepts plain strings, as a list of facts without labels", () => {
    const { container } = render(<Specs items={["Marked as you answer", "No account is required"]} />);
    expect(container.querySelector("dl")).toBeNull();
    expect([...container.querySelectorAll("ul > li")].map((li) => li.textContent)).toEqual([
      "Marked as you answer",
      "No account is required",
    ]);
    expect(container.querySelector("ul")).toHaveClass("grid", "sm:grid-cols-2");
  });
});

describe("LanderHero", () => {
  it("has the page's one title on the type scale, with the sentence under it at its measure", () => {
    const { container } = render(
      <LanderHero eyebrow="CompTIA Security+ (SY0-701)" title="Free Security+ (SY0-701) practice test" sub="A sentence." specs={[{ label: "Questions", value: "90" }]} />
    );
    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveClass("cb-title");
    expect(title.className).not.toMatch(/cb-display|text-\[|leading-|tracking-/);
    // The exam code is kept whole where the title wraps.
    expect(within(title).getByText("(SY0-701)")).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("A sentence.")).toHaveClass("cb-measure", "text-lede");
    expect(container.querySelector("dl")).not.toBeNull();
    // On the page's left edge: the container, then the reading column.
    expect(container.querySelector("section > div")).toHaveClass(...PAGE_CLASSES);
    expect(container.querySelector("section > div > div")).toHaveClass(COLUMN);
    expect(container.innerHTML).not.toMatch(/text-center|justify-items-center/);
  });
});

describe("LanderSection, LanderBlock, LanderStage and LanderProse", () => {
  it("heads a section with a second-level heading on the scale, under a rule", () => {
    render(
      <LanderSection title="What the exam covers" sub="The table shows each domain's share of the exam.">
        <p>Body</p>
      </LanderSection>
    );
    const heading = screen.getByRole("heading", { level: 2, name: "What the exam covers" });
    expect(heading).toHaveClass("cb-section");
    expect(heading.className).not.toMatch(/cb-display|text-\[/);
    expect(heading.parentElement).toHaveClass("border-t", "text-left");
    expect(screen.getByText(/The table shows/)).toHaveClass("cb-measure", "text-body");
  });

  it("keeps a section to the reading column unless it is wide", () => {
    const { container, rerender } = render(
      <LanderSection title="Narrow">
        <p>Body</p>
      </LanderSection>
    );
    expect(container.querySelector("section")).toHaveClass(...PAGE_CLASSES);
    expect(container.querySelector("section > div")).toHaveClass(COLUMN);
    rerender(
      <LanderSection title="Wide" width="xl">
        <p>Body</p>
      </LanderSection>
    );
    expect(container.querySelector("section > div")).not.toHaveClass(COLUMN);
    // The heading keeps to the column even there: only the table runs wide.
    expect(screen.getByRole("heading", { name: "Wide" })).toHaveClass(COLUMN);
  });

  it("puts a block, the stage and the page's own words on the same left edge", () => {
    const { container } = render(
      <>
        <LanderBlock className="mt-10">
          <p>Block</p>
        </LanderBlock>
        <LanderBlock wide>
          <p>Wide block</p>
        </LanderBlock>
        <LanderStage>
          <p>Stage</p>
        </LanderStage>
        <LanderProse>
          <p>Prose</p>
        </LanderProse>
      </>
    );
    const [block, wide, stage, prose] = [...container.children];
    for (const outer of [block, wide, stage, prose]) expect(outer).toHaveClass(...PAGE_CLASSES);
    expect(block.firstElementChild).toHaveClass(COLUMN, "mt-10");
    expect(wide.firstElementChild).not.toHaveClass(COLUMN);
    expect(stage.firstElementChild).toHaveClass(COLUMN);
    expect(prose.firstElementChild).toHaveClass("cb-measure", "text-body");
  });
});

describe("TileGrid", () => {
  const GROUPS = [
    {
      label: "Domain 1: General Security Concepts",
      tiles: [
        { href: "/objectives/x/1-1", code: "1.1", title: "Security controls", detail: "Compare and contrast various types of security controls" },
        { href: "/objectives/x/1-2", code: "1.2", title: "Core security concepts", detail: "Summarize fundamental security concepts" },
      ],
    },
    { tiles: [{ href: "/tools/port-numbers-quiz", title: "Port numbers quiz", detail: "The ports that the exams test" }] },
  ];

  it("sets links as ruled rows under a heading, one link to a row, and no box around any of them", () => {
    const { container } = render(<TileGrid groups={GROUPS} />);
    const lists = container.querySelectorAll("ul");
    expect(lists).toHaveLength(2);
    expect(lists[0]).toHaveClass("divide-y", "border-b");
    expect(lists[0].querySelectorAll("li")).toHaveLength(2);
    for (const li of container.querySelectorAll("li")) {
      expect(li.querySelectorAll("a")).toHaveLength(1);
      // A row, not a card: no panel, no border of its own, no rounded corner.
      expect(li.innerHTML).not.toMatch(/\bglass\b|rounded-/);
    }
    const first = within(lists[0]).getAllByRole("link")[0];
    expect(first).toHaveAttribute("href", "/objectives/x/1-1");
    // The parts of a row are separate words in the text itself, whatever draws them apart on screen.
    expect(first.textContent).toBe("1.1 Security controls Compare and contrast various types of security controls");
    expect(first).toHaveAccessibleName("1.1 Security controls Compare and contrast various types of security controls");
    // The code is set in the mono face, and the title carries the link's underline.
    expect(within(first).getByText("1.1")).toHaveClass("font-mono");
    expect(within(first).getByText("Security controls")).toHaveClass("cb-link");
  });

  it("appends no arrow to a row", () => {
    const { container } = render(<TileGrid groups={GROUPS} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("gives each part of a row its own size, so the line about a row is never larger than its title", () => {
    const { container } = render(<TileGrid groups={GROUPS} details="always" />);
    const row = container.querySelector("a")!;
    const [code, title, detail] = [...row.children];
    expect(code).toHaveClass("text-note");
    expect(title).toHaveClass("text-small");
    expect(detail).toHaveClass("text-note");
    expect(detail).not.toHaveClass("hidden");
  });

  it("leaves the line about a row off a phone unless asked to keep it", () => {
    const { container } = render(<TileGrid groups={GROUPS} />);
    const detail = container.querySelector("a")!.children[2];
    expect(detail).toHaveClass("hidden", "sm:block");
  });

  it("heads a group at the level the page needs", () => {
    const { rerender } = render(<TileGrid groups={GROUPS} />);
    expect(screen.getByRole("heading", { level: 3, name: "Domain 1: General Security Concepts" })).toBeInTheDocument();
    rerender(<TileGrid groups={GROUPS} headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2, name: "Domain 1: General Security Concepts" })).toBeInTheDocument();
  });

  it("fetches none of its pages until a visitor shows that they mean to open one", () => {
    render(<TileGrid groups={GROUPS} />);
    for (const link of screen.getAllByRole("link")) expect(link).toHaveAttribute("data-prefetch", "false");
  });
});

describe("ExamOutline", () => {
  const EXAM = {
    name: "CompTIA Security+",
    examCode: "SY0-701",
    domains: [
      { number: "1.0", title: "General Security Concepts", weight: 12 },
      { number: "4.0", title: "Security Operations", weight: 28 },
    ],
  };

  it("is a plain table: each domain, and its share of the exam as a figure at the right", () => {
    render(<ExamOutline exams={[EXAM]} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Domain", "Share of the exam"]);
    const rows = within(table).getAllByRole("row").slice(1);
    // The number and the name are two words, so a screen reader does not run them together.
    expect(rows.map((row) => within(row).getByRole("rowheader").textContent)).toEqual([
      "1 General Security Concepts",
      "4 Security Operations",
    ]);
    expect(rows.map((row) => within(row).getByRole("cell").textContent)).toEqual(["12%", "28%"]);
    for (const row of rows) expect(within(row).getByRole("cell")).toHaveClass("text-right");
  });

  it("draws no bars: the largest domain is not made to look like the whole exam", () => {
    const { container } = render(<ExamOutline exams={[EXAM]} />);
    expect(container.querySelector("[style]")).toBeNull();
    expect(container.innerHTML).not.toMatch(/rounded-full|bg-primary|aria-hidden/);
  });

  it("names each table when two exams stand side by side", () => {
    render(<ExamOutline exams={[EXAM, { ...EXAM, name: "CompTIA A+ Core 2", examCode: "220-1202" }]} />);
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getByRole("table", { name: /CompTIA A\+ Core 2\s+220-1202/ })).toBeInTheDocument();
  });
});

describe("the reading page", () => {
  it("has one title on the scale, the introduction as its lede, and sections under their own headings", () => {
    const { container } = render(
      <ArticleBody>
        <ArticleHero eyebrow="Comparison" title="CertBench and Boson ExSim compared">
          <p>First paragraph.</p>
          <p>Second paragraph.</p>
        </ArticleHero>
        <ArticleSection id="detail" title="Side by side" sub="A sentence about the table.">
          <p>Body</p>
        </ArticleSection>
        <ArticleSection title="A table" wide>
          <table />
        </ArticleSection>
      </ArticleBody>
    );
    expect(container.firstElementChild).toHaveClass(...PAGE_CLASSES);
    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveClass("cb-title");
    expect(title.closest("header")).toHaveClass(COLUMN);
    // The introduction is capped by its measure, not by its container.
    expect(screen.getByText("First paragraph.").parentElement).toHaveClass("cb-measure");

    const section = screen.getByRole("heading", { level: 2, name: "Side by side" });
    expect(section).toHaveClass("cb-subsection");
    expect(section.className).not.toMatch(/cb-display|text-\[/);
    expect(section.closest("section")).toHaveAttribute("id", "detail");
    expect(section.closest("section")).toHaveClass(COLUMN);
    expect(screen.getByText("A sentence about the table.")).toHaveClass("cb-measure");
    // A wide section leaves the column; its heading does not.
    const wide = screen.getByRole("heading", { level: 2, name: "A table" });
    expect(wide.closest("section")).not.toHaveClass(COLUMN);
    expect(wide).toHaveClass(COLUMN);
    expect(container.innerHTML).not.toMatch(/text-center/);
  });

  it("sets a statement and what stands behind it as a term and its description", () => {
    const { container } = render(
      <dl>
        <ArticleRow term="Written for CertBench">
          <p>Every question is written for CertBench.</p>
        </ArticleRow>
      </dl>
    );
    expect(container.querySelector("dt")).toHaveTextContent("Written for CertBench");
    const description = container.querySelector("dd")!;
    expect(description).toHaveTextContent("Every question is written for CertBench.");
    expect(description).toHaveClass("cb-measure", "text-body");
  });
});

describe("CtaBand", () => {
  it("is the navy band set left on the page's edge, with one heading", () => {
    const { container } = render(
      <CtaBand title="Try the questions">
        <p>A sentence.</p>
        <a href="/start">Choose your exam</a>
      </CtaBand>
    );
    const band = container.querySelector("section")!;
    expect(band).toHaveClass("cb-sheet");
    // The band itself has no width of its own and no rounded corner: it runs the width of what holds it.
    expect(band.className).not.toMatch(/max-w-|rounded|mx-auto/);
    expect(band.firstElementChild).toHaveClass(...PAGE_CLASSES, "justify-items-start", "text-left");
    expect(screen.getByRole("heading", { level: 2, name: "Try the questions" })).toHaveClass("cb-subsection");
    expect(container.innerHTML).not.toMatch(/text-center|justify-items-center|justify-center/);
  });
});
