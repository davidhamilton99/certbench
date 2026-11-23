// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { InventoryRow } from "@/core/path/inventory-types";
import { Inventory } from "../Inventory";

const row = (over: Partial<InventoryRow> & Pick<InventoryRow, "cert" | "name" | "code">): InventoryRow => ({
  questions: 842,
  objectives: "28 objectives",
  labs: 19,
  exam: { href: `/${over.cert}-practice-test`, label: "90 questions in 90 minutes" },
  path: `/path/${over.cert}`,
  ...over,
});

const ROWS: InventoryRow[] = [
  row({ cert: "security-plus-sy0-801", name: "Security+", code: "SY0-801", questions: 1008, objectives: "27 objectives", labs: 20 }),
  row({ cert: "security-plus-sy0-701", name: "Security+", code: "SY0-701" }),
  row({ cert: "network-plus-n10-009", name: "Network+", code: "N10-009", questions: 617, objectives: "27 topics", labs: 21 }),
];

const HEADS = ["Exam", "Practice questions", "Coverage", "Hands-on labs", "Free practice exam", "Study path"];

/** The rows of the table's body, each as the text of its cells. */
function body(): string[][] {
  const [, ...rows] = screen.getAllByRole("row");
  return rows.map((r) => [...r.children].map((cell) => (cell.textContent ?? "").replace(/\s+/g, " ").trim()));
}

describe("the table of what each exam includes", () => {
  it("is one table with a named column for each figure and a row for each exam", () => {
    render(<Inventory rows={ROWS} />);
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getByRole("table", { name: "What CertBench includes for each exam" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(HEADS);
    expect(screen.getAllByRole("rowheader").map((h) => h.textContent)).toEqual([
      "Security+ SY0-801",
      "Security+ SY0-701",
      "Network+ N10-009",
    ]);
  });

  it("prints each figure once, so a text reading of the page does not repeat the table", () => {
    const { container } = render(<Inventory rows={ROWS} />);
    const text = container.textContent ?? "";
    for (const figure of ["1,008", "842", "617", "27 topics", "27 objectives", "28 objectives"]) {
      expect(text.split(figure).length - 1, figure).toBe(1);
    }
    // Thousands are separated, and the figure is set in the text face: the mono face is kept for codes.
    const count = screen.getByText("1,008", { exact: false });
    expect(count.className).not.toContain("font-mono");
    expect(screen.getByText("SY0-801").className).toContain("font-mono");
  });

  it("labels every figure inside its own cell, for the phone layout where the head is put away", () => {
    render(<Inventory rows={ROWS} />);
    expect(body()[0]).toEqual([
      "Security+ SY0-801",
      "Practice questions 1,008",
      "Coverage 27 objectives",
      "Hands-on labs 20",
      "Free practice exam 90 questions in 90 minutes, Security+ SY0-801 practice exam",
      "Study path Start the Security+ SY0-801 study path",
    ]);
    // The labels are for a phone only; the head is for every wider screen.
    const [head, first] = screen.getAllByRole("row");
    expect(head.parentElement?.className).toContain("max-sm:hidden");
    for (const label of HEADS.slice(1)) {
      expect(within(first).getByText(label).className).toContain("sm:hidden");
    }
  });

  it("names each link by the words on the page and then the exam it leads to", () => {
    render(<Inventory rows={ROWS} />);
    const start = screen.getByRole("link", { name: "Start the Security+ SY0-801 study path" });
    expect(start.getAttribute("href")).toBe("/path/security-plus-sy0-801");
    const exam = screen.getByRole("link", { name: "90 questions in 90 minutes, Security+ SY0-701 practice exam" });
    expect(exam.getAttribute("href")).toBe("/security-plus-sy0-701-practice-test");
    // No two links share a name, although five say "Start" on the page.
    const names = screen.getAllByRole("link").map((a) => (a.textContent ?? "").replace(/\s+/g, " ").trim());
    expect(names).toHaveLength(ROWS.length * 2);
    expect(new Set(names).size).toBe(names.length);
    // A link here is the pressable color and underlined, with a full-size target on touch, and no arrow.
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("cb-link");
      expect(link.className).toContain("cb-tap");
      expect(link.querySelector("svg")).toBeNull();
    }
  });

  it("states the role of every part, so the table is still a table where CSS draws it as blocks", () => {
    const { container } = render(<Inventory rows={ROWS} />);
    expect(container.querySelector("table")?.getAttribute("role")).toBe("table");
    for (const [selector, role] of [
      ["thead, tbody", "rowgroup"],
      ["tr", "row"],
      ["thead th", "columnheader"],
      ["tbody th", "rowheader"],
      ["td", "cell"],
    ]) {
      const parts = [...container.querySelectorAll(selector)];
      expect(parts.length, selector).toBeGreaterThan(0);
      expect(parts.every((el) => el.getAttribute("role") === role), selector).toBe(true);
    }
  });

  it("leaves a cell empty for an exam that was not counted, and keeps the column for the others", () => {
    render(<Inventory rows={[ROWS[0], { ...ROWS[1], questions: null }]} />);
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(HEADS);
    const [first, second] = body();
    expect(first[1]).toBe("Practice questions 1,008");
    // The cell stays, so the columns still line up; on a phone it is put away with its label.
    expect(second).toHaveLength(6);
    expect(second[1]).toBe("Practice questions");
    const [, , uncounted] = screen.getAllByRole("row");
    expect(uncounted.children[1].className).toContain("max-sm:hidden");
    expect(second[2]).toBe("Coverage 28 objectives");
  });

  it("draws no question column at all when no exam was counted", () => {
    const { container } = render(<Inventory rows={ROWS.map((r) => ({ ...r, questions: null }))} />);
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(HEADS.filter((h) => h !== "Practice questions"));
    expect(container.textContent).not.toContain("Practice questions");
    for (const cells of body()) expect(cells).toHaveLength(5);
  });

  it("prints a count of zero as a figure", () => {
    render(<Inventory rows={[{ ...ROWS[0], questions: 0 }]} />);
    expect(body()[0][1]).toBe("Practice questions 0");
  });
});
