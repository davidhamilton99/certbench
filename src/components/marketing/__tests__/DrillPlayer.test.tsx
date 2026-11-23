// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ChoiceRep } from "@/core/path/types";
import { DrillLoading, DrillPlayer, type Dealt } from "../DrillPlayer";
import type { DrillRounds } from "../useDrillRounds";

/** A stand-in for the browser's ResizeObserver that a test can fire by hand. */
class FakeResizeObserver {
  static last: FakeResizeObserver | null = null;
  target: HTMLElement | null = null;
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.last = this;
  }
  observe(el: HTMLElement) {
    this.target = el;
  }
  disconnect() {}
  fire() {
    this.callback();
  }
}

/** Reports a size for an element, as layout would in a browser. */
function size(el: HTMLElement, width: number, height: number) {
  Object.defineProperty(el, "offsetWidth", { configurable: true, value: width });
  Object.defineProperty(el, "offsetHeight", { configurable: true, value: height });
}

function question(n: number): Dealt {
  const rep: ChoiceRep = {
    id: `q${n}`,
    type: "choice",
    label: "Recall",
    tier: "recall",
    objective: "",
    prompt: `Question text ${n}`,
    options: ["Right", "Wrong"],
    answer: 0,
    takeaway: "The reason.",
  };
  return { rep, item: `item-${n}` };
}

function rounds(over: Partial<DrillRounds> = {}): DrillRounds {
  return {
    tool: "ports",
    answered: 0,
    results: [],
    size: 20,
    linked: false,
    account: "none",
    startedHere: false,
    nextItem: () => null,
    record: vi.fn(),
    advance: vi.fn(() => false),
    ...over,
  } as unknown as DrillRounds;
}

// The test environment lays nothing out, so every element is 0 wide. A card
// is given a width from the start, as it has in a browser.
const jsdomWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")!;

beforeEach(() => {
  FakeResizeObserver.last = null;
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 700 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", jsdomWidth);
});

describe("DrillPlayer", () => {
  it("keeps the card at least as tall as the tallest it has been, so nothing under it moves back up", () => {
    let n = 0;
    render(<DrillPlayer rounds={rounds()} label="Port numbers, round 1" deal={() => question(++n)} />);
    const observer = FakeResizeObserver.last!;
    const body = observer.target!;
    expect(body.style.minHeight).toBe("");

    // The first question, as laid out.
    size(body, 700, 380);
    act(() => observer.fire());
    expect(body.style.minHeight).toBe("380px");

    // An answer brings the verdict, and the card grows for it.
    size(body, 700, 430);
    act(() => observer.fire());
    expect(body.style.minHeight).toBe("430px");

    // A shorter question follows: the card does not shrink back.
    size(body, 700, 400);
    act(() => observer.fire());
    expect(body.style.minHeight).toBe("430px");
  });

  it("forgets the height when the card changes width, where it no longer means anything", () => {
    let n = 0;
    render(<DrillPlayer rounds={rounds()} label="Port numbers, round 1" deal={() => question(++n)} />);
    const observer = FakeResizeObserver.last!;
    const body = observer.target!;
    size(body, 700, 430);
    act(() => observer.fire());
    expect(body.style.minHeight).toBe("430px");

    // A phone turned on its side: the same card, narrower or wider.
    size(body, 340, 520);
    act(() => observer.fire());
    expect(body.style.minHeight).toBe("");
    act(() => observer.fire());
    expect(body.style.minHeight).toBe("520px");
  });

  it("holds the same room while it loads as its first question will take", () => {
    for (const shape of ["choices", "typed"] as const) {
      const loading = render(<DrillLoading label="Port numbers" size={20} shape={shape} />);
      const held = screen.getByRole("status").parentElement!.className;
      loading.unmount();

      let n = 0;
      const playing = render(
        <DrillPlayer rounds={rounds()} label="Port numbers, round 1" deal={() => question(++n)} shape={shape} />
      );
      const body = FakeResizeObserver.last!.target!.className;
      playing.unmount();

      const minimums = (classes: string) => classes.split(" ").filter((c) => c.includes("min-h-")).sort();
      expect(minimums(held).length).toBeGreaterThan(0);
      expect(minimums(held)).toEqual(minimums(body));
    }
  });

  it("gives the first question of a page no focus, and every question after an answer the focus", () => {
    let n = 0;
    const record = vi.fn();
    render(<DrillPlayer rounds={rounds({ record })} label="Port numbers, round 1" deal={() => question(++n)} />);
    expect(screen.getByText("Question text 1")).not.toHaveFocus();
    expect(document.body).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Right" }));
    expect(record).toHaveBeenCalledWith("item-1", true);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Question text 2")).toHaveFocus();
  });

  it("gives the first question the focus when the round was started by a press on the page", () => {
    let n = 0;
    render(
      <DrillPlayer rounds={rounds({ startedHere: true })} label="Port numbers, round 2" deal={() => question(++n)} />
    );
    expect(screen.getByText("Question text 1")).toHaveFocus();
  });

  it("says what follows on the round's last question", () => {
    let n = 0;
    const live = rounds({ answered: 19 });
    const view = render(<DrillPlayer rounds={live} label="Port numbers, round 1" deal={() => question(++n)} />);
    fireEvent.click(screen.getByRole("button", { name: "Right" }));
    // The round has now counted its last answer.
    view.rerender(
      <DrillPlayer rounds={{ ...live, answered: 20 } as DrillRounds} label="Port numbers, round 1" deal={() => question(++n)} />
    );
    expect(screen.getByRole("button", { name: "View my result" })).toBeInTheDocument();
  });
});
