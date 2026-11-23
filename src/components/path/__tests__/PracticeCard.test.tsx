// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FlaskConical, RotateCcw, Timer } from "lucide-react";
import { PRACTICE_SIZE } from "@/core/path/plan";
import { PracticeCard, ReviewMissesCard, type PracticeRow } from "../PracticeCard";

/**
 * The colour rule: one colour means "press this", and it is drawn only on what
 * can be pressed. These cards had an icon in a tile tinted with that colour
 * beside a button, which made the tile look like a second thing to press.
 */

/** A class that draws text, a fill, an edge or an icon in the pressable colour, with or without a variant or a tint. */
const PRESSABLE = /(?:^|[\s:])(?:text|bg|border|fill|stroke|ring|outline|decoration)-primary(?:\/[\w.[\]%-]+)?(?=\s|$)/;
const classOf = (element: Element) => element.getAttribute("class") ?? "";
/** Everything in a card that is not a control or part of one, with the card itself. */
const notPressed = (card: Element) => [card, ...card.querySelectorAll("*")].filter((el) => !el.closest("button, a"));

afterEach(cleanup);

describe("the rule's own test", () => {
  it("knows a class of the pressable colour, with a tint or a variant, and no other", () => {
    for (const drawn of ["text-primary", "flex bg-primary/10 text-primary", "border-primary p-5", "hover:border-primary", "sm:bg-primary/[0.08]"]) {
      expect(PRESSABLE.test(drawn), drawn).toBe(true);
    }
    for (const quiet of ["text-primary-foreground", "text-muted-foreground", "border-border", "bg-card"]) {
      expect(PRESSABLE.test(quiet), quiet).toBe(false);
    }
  });
});

describe("PracticeCard", () => {
  const rows = (onAction = vi.fn()): PracticeRow[] => [
    { key: "rehearsal", Icon: Timer, title: "Practice exam", detail: "It has 90 questions and a limit of 90 minutes.", action: "Start", onAction },
    { key: "labs", Icon: FlaskConical, title: "Hands-on labs", detail: "There are 31 labs.", action: "Open", onAction },
    { key: "review", Icon: RotateCcw, title: "Questions to review", detail: "You have 4 questions to review, 4 at a time.", action: "Review", onAction },
  ];

  it("draws each row's icon in ink beside its words, with no tinted tile, and keeps the pressable colour for the button", () => {
    render(<PracticeCard rows={rows()} />);
    const card = screen.getByRole("region", { name: "Practice at any time" });
    const items = [...card.querySelectorAll("li")];
    expect(items).toHaveLength(3);
    for (const item of items) {
      const icon = item.querySelector("svg")!;
      // The icon stands in the row itself: no tile is drawn around it.
      expect(icon.parentElement).toBe(item);
      expect(icon).toHaveAttribute("aria-hidden", "true");
      // The ink of the line beside it.
      expect(classOf(icon)).toContain("text-muted-foreground");
      expect(item.querySelectorAll("svg")).toHaveLength(1);
    }
    // Nothing that cannot be pressed is drawn in the pressable colour, as a tint or at full strength.
    expect(notPressed(card).filter((el) => PRESSABLE.test(classOf(el))).map(classOf)).toEqual([]);
    // No tile of any colour: a mark's green, amber or red would not belong here either.
    expect(notPressed(card).filter((el) => /bg-(?:success|warning|destructive)/.test(classOf(el)))).toEqual([]);
  });

  it("names each button by its own word and its row, and presses through to the row's action", () => {
    const onAction = vi.fn();
    render(<PracticeCard rows={rows(onAction)} />);
    expect(screen.getByRole("heading", { level: 2, name: "Practice at any time" })).toBeInTheDocument();
    for (const name of ["Start: Practice exam", "Open: Hands-on labs", "Review: Questions to review"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    expect(onAction).toHaveBeenCalledTimes(3);
    // The button shows its own word; the row's title beside it completes the name.
    expect(screen.getByRole("button", { name: "Start: Practice exam" })).toHaveTextContent(/^Start$/);
  });

  it("draws nothing when there is nothing to practice", () => {
    const { container } = render(<PracticeCard rows={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ReviewMissesCard", () => {
  it("is words and one button, with no icon and nothing but the button in the pressable colour", () => {
    const onReview = vi.fn();
    const { container } = render(<ReviewMissesCard count={14} onReview={onReview} />);
    const card = container.firstElementChild!;
    expect(screen.getByText("You answered 14 questions incorrectly.")).toBeInTheDocument();
    expect(screen.getByText("Review the questions that you missed")).toBeInTheDocument();
    // The icon it had only decorated the card: it is gone, and its tinted tile with it.
    expect(card.querySelector("svg")).toBeNull();
    expect(notPressed(card).filter((el) => PRESSABLE.test(classOf(el))).map(classOf)).toEqual([]);

    // A round at a time, and fourteen is more than one round.
    expect(PRACTICE_SIZE).toBeLessThan(14);
    fireEvent.click(screen.getByRole("button", { name: `Review ${PRACTICE_SIZE} questions` }));
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("says one question in the singular", () => {
    render(<ReviewMissesCard count={1} onReview={() => {}} />);
    expect(screen.getByText("You answered 1 question incorrectly.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review 1 question" })).toBeInTheDocument();
  });
});
