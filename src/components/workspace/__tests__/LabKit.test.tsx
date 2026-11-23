// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SimDropdownField, SimSelectManyField } from "@/data/pbq/types";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

import { FieldMisses, PairList } from "../LabKit";

/** The box that holds a correct answer in a lab's review: the parent of its words for a screen reader. */
const answerBox = (text: string) => {
  const box = screen.getByText(text, { exact: false, selector: "span" }).closest("span.inline-flex");
  if (!box) throw new Error(`no answer box holds ${text}`);
  return box;
};

describe("a lab's review", () => {
  it("lets a long correct answer wrap inside its card, so none of it is cut off on a phone", () => {
    const field: SimDropdownField = {
      type: "dropdown",
      id: "cve",
      label: "Which finding should be patched first?",
      options: ["CVE-2024-38428 (OpenSSL RCE, 9.8)", "CVE-2023-1234 (XSS, 6.1)"],
      correctIndex: 0,
    };
    render(<FieldMisses fields={[field]} answers={{ cve: { type: "dropdown", selectedIndex: 1 } }} />);
    const box = answerBox("CVE-2024-38428 (OpenSSL RCE, 9.8)");
    expect(box).toHaveTextContent("Correct answer: CVE-2024-38428 (OpenSSL RCE, 9.8)");
    // Never wider than its row, and free to break a long token anywhere.
    expect(box.className).toContain("max-w-full");
    expect(box.className).toContain("[overflow-wrap:anywhere]");
    // The learner's own answer beside it wraps too.
    const yours = screen.getByText("Your answer:", { exact: false }).parentElement!;
    expect(yours).toHaveTextContent("CVE-2023-1234 (XSS, 6.1)");
    expect(yours.className).toContain("min-w-0");
    expect(yours.className).toContain("[overflow-wrap:anywhere]");
  });

  it("does the same for a pair in a sort or a match", () => {
    render(<PairList pairs={[["Vendor-supplied patch for a critical flaw", "P3: Medium: Patch within 30 days"]]} />);
    const box = answerBox("P3: Medium: Patch within 30 days");
    expect(box.className).toContain("max-w-full");
    expect(box.className).toContain("[overflow-wrap:anywhere]");
  });

  it("keeps a short answer at its own width beside a long option", () => {
    const field: SimSelectManyField = {
      type: "select-many",
      id: "steps",
      label: "Select ALL safe steps (Select all that apply)",
      options: ["Disconnect the laptop from the power adapter and remove the battery before opening it", "Use a solvent"],
      correctIndices: [0],
    };
    render(<FieldMisses fields={[field]} answers={{ steps: { type: "select-many", selectedIndices: [] } }} />);
    // A yes or no never shrinks to let the line beside it grow.
    expect(answerBox("Yes").className).toContain("shrink-0");
  });
});
