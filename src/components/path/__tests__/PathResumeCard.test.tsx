// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PathResumeCard } from "../PathResumeCard";

afterEach(cleanup);

const LONG = "Compare and contrast various types of security controls, and explain how each one is applied";

function card(props: Partial<Parameters<typeof PathResumeCard>[0]> = {}) {
  return render(
    <PathResumeCard
      href="/path/security-plus-sy0-701"
      examName="Security+"
      done={4}
      total={38}
      nextTitle="Security controls"
      {...props}
    />
  );
}

describe("the study path's card on the dashboard", () => {
  it("says where the learner is on the study path, names the next step and leads back in", () => {
    card();
    expect(screen.getByText("Your Security+ study path. You have completed 4 of 38 steps.")).toBeInTheDocument();
    expect(screen.getByText("Next step: Security controls")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /^Continue/ });
    expect(link).toHaveAttribute("href", "/path/security-plus-sy0-701");
  });

  it("offers to begin where nothing is known to be done, and to continue where no step can be named", () => {
    const first = card({ done: null, total: null, nextTitle: null });
    expect(screen.getByText("Your Security+ study path.")).toBeInTheDocument();
    expect(screen.getByText("Begin with the introductory questions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Start the study path/ })).toBeInTheDocument();
    first.unmount();

    card({ nextTitle: null });
    expect(screen.getByText("Continue from where you stopped")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Continue/ })).toBeInTheDocument();
  });

  it("lets a long title wrap: it is never cut short with an ellipsis", () => {
    card({ nextTitle: LONG });
    const title = screen.getByText(`Next step: ${LONG}`);
    // Nothing on the title, or on any box around it, cuts a line short or keeps it on one line.
    for (let el: HTMLElement | null = title; el; el = el.parentElement) {
      expect(el.className).not.toMatch(/truncate|line-clamp|text-ellipsis|whitespace-nowrap|overflow-hidden/);
    }
    // Its block may shrink, and takes the room that the button leaves.
    expect(title.parentElement?.className).toContain("min-w-0");
    expect(title.parentElement?.className).toContain("flex-1");
  });

  it("is set in the page's own type and corners, with no icon in a tinted tile", () => {
    const { container } = card();
    expect(container.innerHTML).not.toMatch(/rounded-(?:xl|2xl|3xl)|font-display/);
    expect(screen.getByText("Next step: Security controls").className).toContain("cb-statement");
    // The only drawing on the card is the arrow on its button, which means "this continues your study path".
    const drawings = [...container.querySelectorAll("svg")];
    expect(drawings).toHaveLength(1);
    expect(drawings[0].closest("a")).toBe(screen.getByRole("link", { name: /^Continue/ }));
    // No tile stands beside the words: apart from the button, only the progress bar's own fill is in the pressable colour.
    const tinted = [...container.querySelectorAll<HTMLElement>("[class*='primary']")].filter((el) => !el.closest("a"));
    expect(tinted.map((el) => el.className)).toEqual([expect.stringContaining("origin-left")]);
  });

  it("draws the steps completed as the one progress bar, at its final length, beside the sentence that gives the figure", () => {
    const { container } = card({ done: 19, total: 38 });
    const fill = container.querySelector<HTMLElement>("[aria-hidden='true'] .origin-left");
    expect(fill?.style.transform).toBe("scaleX(0.5)");
    expect(container.innerHTML).not.toContain("rounded-full");
    cleanup();
    // No bar before anything is done.
    const fresh = card({ done: 0, total: 38 });
    expect(fresh.container.querySelector(".origin-left")).toBeNull();
  });
});
