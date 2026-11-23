// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivityChart } from "@/components/workspace/analytics/ActivityChart";
import { ReadinessChart } from "@/components/workspace/analytics/ReadinessChart";

describe("ReadinessChart", () => {
  const points = [
    { day: "2026-11-01", score: 41.2 },
    { day: "2026-11-10", score: 55 },
    { day: "2026-11-22", score: 68.6 },
  ];

  it("says the first and the latest score in a sentence, with the target", () => {
    render(<ReadinessChart points={points} />);
    expect(screen.getByRole("figure")).toHaveTextContent(
      "Your readiness score was 41% on November 1, 2026 and 69% on November 22, 2026. The darker line marks the readiness target of 75%."
    );
  });

  it("draws the line once, with no glow, no gradient and no scaled text", () => {
    const { container } = render(<ReadinessChart points={points} />);
    const svg = container.querySelector("svg")!;
    expect(svg.querySelector("text")).toBeNull();
    expect(svg.querySelector("linearGradient")).toBeNull();
    expect(container.innerHTML).not.toContain("drop-shadow");
    expect(svg.querySelector("polyline")).toHaveAttribute("vector-effect", "non-scaling-stroke");
    // The drawing illustrates the sentence, so it is not read out a second time.
    expect(svg.closest("[aria-hidden]")).not.toBeNull();
  });

  it("says one score in a sentence when there is one", () => {
    render(<ReadinessChart points={[points[0]]} />);
    expect(screen.getByRole("figure")).toHaveTextContent("Your readiness score was 41% on November 1, 2026.");
  });

  it("says so when there is no history", () => {
    render(<ReadinessChart points={[]} />);
    expect(
      screen.getByText("There is no readiness history yet. The chart appears once a score has been recorded.")
    ).toBeInTheDocument();
  });
});

describe("ActivityChart", () => {
  const days = [
    { day: "2026-11-20", attempts: 0, questions: 0, correct: 0 },
    { day: "2026-11-21", attempts: 1, questions: 10, correct: 7 },
    { day: "2026-11-22", attempts: 2, questions: 25, correct: 20 },
  ];

  it("says the total, the days with work and the most in one day in a sentence", () => {
    render(<ActivityChart days={days} />);
    expect(screen.getByRole("figure")).toHaveTextContent(
      "You answered 35 questions on 2 of the last 3 days. The most in one day was 25."
    );
  });

  it("draws one square-ended bar a day at its height, with nothing for a day without work", () => {
    const { container } = render(<ActivityChart days={days} />);
    const bars = [...container.querySelectorAll<HTMLElement>(".bg-primary")];
    expect(bars).toHaveLength(3);
    expect(bars.map((bar) => bar.style.height)).toEqual(["0%", "40%", "100%"]);
    // A day with any work is always drawn; a day without is not.
    expect(bars.map((bar) => bar.style.minHeight)).toEqual(["0px", "2px", "2px"]);
    expect(container.innerHTML).not.toMatch(/rounded-full|transition|animate/);
  });

  it("says so when nothing was answered", () => {
    render(<ActivityChart days={[days[0]]} />);
    expect(screen.getByRole("figure")).toHaveTextContent("You have not answered any questions in the last day.");
  });
});
