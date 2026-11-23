// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Plan } from "../Plan";

describe("a plan in the home page's summary of prices", () => {
  it("prints the plan's name, its price, the sentence about the price, and what the plan includes", () => {
    const { container } = render(
      <Plan
        name="Pro"
        price="$19"
        note="Each month. The price is $39 every three months, or $99 a year."
        lead="Pro includes:"
        items={["The whole study path, covering every exam objective", "Every hands-on lab, and new timed practice exams"]}
      />
    );
    expect(screen.getByRole("heading", { level: 3, name: "Pro" })).toBeTruthy();
    // The price is a figure in the heading face, sized where it stands.
    expect(screen.getByText("$19").className).toContain("cb-display");
    expect(screen.getByText("Each month. The price is $39 every three months, or $99 a year.")).toBeTruthy();
    // The list completes the sentence above it.
    const list = screen.getByRole("list");
    expect(list.previousElementSibling?.textContent).toBe("Pro includes:");
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "The whole study path, covering every exam objective",
      "Every hands-on lab, and new timed practice exams",
    ]);
    // The ticks are marks beside the words and are not read out.
    const ticks = [...container.querySelectorAll("svg")];
    expect(ticks).toHaveLength(2);
    expect(ticks.every((svg) => svg.getAttribute("aria-hidden") === "true")).toBe(true);
  });
});
