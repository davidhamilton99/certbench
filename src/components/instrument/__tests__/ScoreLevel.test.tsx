// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { bandFor } from "@/lib/readiness/band";
import { READY_AT, ScoreBar, ScoreLevel } from "../ScoreLevel";

describe("a score against the ready line", () => {
  it("rules the line where the app calls a score exam-ready", () => {
    expect(READY_AT).toBe(75);
    const { container } = render(<ScoreBar value={40} color="red" />);
    const line = container.querySelector("span");
    expect(line?.getAttribute("style")).toContain("left: 75%");
  });

  it("draws no line where a reading is too small to call anyone ready", () => {
    const { container } = render(<ScoreBar value={40} readyLine={false} />);
    expect(container.querySelector("span")).toBeNull();
  });

  it("clamps a bar to the scale, and leaves it empty where nothing was asked", () => {
    // The fill is the full width, scaled from the left: a score is drawn at
    // its final length in the markup and never starts from nothing.
    const fill = (value: number | null) =>
      render(<ScoreBar value={value} />).container.querySelector("[style*='scaleX']")?.getAttribute("style") ?? "";
    expect(fill(140)).toContain("scaleX(1)");
    expect(fill(-5)).toContain("scaleX(0)");
    expect(fill(null)).toContain("scaleX(0)");
    expect(fill(82)).toContain("scaleX(0.82)");
  });

  it("prints an example and leaves it still", () => {
    const { container } = render(<ScoreLevel score={82} from={61} band={bandFor(82)} still />);
    expect(screen.getByText("82")).toBeTruthy();
    expect(container.querySelector("[style*='scaleX']")?.getAttribute("style")).toContain("scaleX(0.82)");
  });

  it("prints the score, its verdict and the change since the last reading", () => {
    render(<ScoreLevel score={82} from={61} band={bandFor(82)} caption="Practice exam" />);
    expect(screen.getByText("Practice exam")).toBeTruthy();
    // The server prints the final figure, so it reads with no script running.
    expect(screen.getByText("82")).toBeTruthy();
    expect(screen.getByText("Target met")).toBeTruthy();
    expect(
      screen.getByText(
        "The readiness target is 75%. This result is 21 points higher than your previous result of 61%."
      )
    ).toBeTruthy();
  });

  it("uses a text color that reads on paper for a middling score", () => {
    render(<ScoreLevel score={60} band={bandFor(60)} readyMark={false} />);
    const verdict = screen.getByText("Approaching target");
    expect(verdict.getAttribute("style")).toContain("var(--warning-ink)");
    expect(screen.queryByText(/The readiness target is/)).toBeNull();
  });
});
