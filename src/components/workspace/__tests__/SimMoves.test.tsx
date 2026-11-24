// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MatchMove } from "../SimMoves";

// jsdom has no scrolling: the method is put in place, and each test watches it.
const proto = Element.prototype as unknown as { scrollIntoView?: () => void };
const hadScroll = "scrollIntoView" in proto;
if (!hadScroll) proto.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const move = (
  <MatchMove
    prompt="Match each port to its protocol."
    left={["22", "53", "443"]}
    right={["SSH", "DNS", "HTTPS"]}
    correctMap={[0, 1, 2]}
    seed="ports"
    takeFocus={false}
    onAnswer={() => {}}
    onNext={() => {}}
  />
);

/** Answer the item in hand with its first choice still open, then press Continue. */
function answerAndContinue() {
  const choices = screen.getAllByRole("button").filter((b) => !(b as HTMLButtonElement).disabled && b.textContent !== "Continue");
  fireEvent.click(choices[0]);
  fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
}

// On a phone the verdict under the answers is scrolled into view, which can
// carry the item above the top of the screen. Every item of a matching lab
// then began with a scroll back up.
describe("a run of items on a small screen", () => {
  it("brings the next item's move back into view when its item is out of sight", () => {
    const scrolled: Element[] = [];
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(function (this: Element) {
      scrolled.push(this);
    });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: -50, bottom: 46 } as DOMRect);
    render(move);
    answerAndContinue();
    // The move's frame, from its top: the count and the question stand above the item.
    const frame = scrolled.find((el) => el.textContent?.includes("Item 2 of 3"));
    expect(frame).toBeDefined();
    expect(frame!.textContent).toContain("Match each port to its protocol.");
  });

  it("leaves the page where it is when the next item is in sight", () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 200, bottom: 300 } as DOMRect);
    render(move);
    answerAndContinue();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
