// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import { answerOrder } from "@/components/quiz/answer-order";
import { MultipleChoice } from "@/components/quiz/renderers/MultipleChoice";
import { MultipleSelect } from "@/components/quiz/renderers/MultipleSelect";
import { Ordering } from "@/components/quiz/renderers/Ordering";

const OPTIONS = ["Symmetric", "Asymmetric", "Hashing", "Steganography"];
const SEED = "seed";
const ORDER = seededPermutation(SEED, "q1", OPTIONS.length);

describe("MultipleChoice", () => {
  it("is a radio group while the choice can still be changed, and reports the stored index", () => {
    const onChange = vi.fn();
    render(<MultipleChoice questionId="q1" options={OPTIONS} seed={SEED} value={undefined} onChange={onChange} />);
    expect(screen.getByRole("radiogroup", { name: "Answers" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    // The answers are lettered in the order shown; the letter is not part of the name.
    expect(radios[0]).toHaveAccessibleName(OPTIONS[ORDER[0]]);

    fireEvent.click(radios[2]);
    expect(onChange).toHaveBeenCalledWith({ kind: "single", selectedIndex: ORDER[2] });
  });

  it("draws plain buttons, not radio buttons, where choosing an answer submits it", () => {
    const onChange = vi.fn();
    render(<MultipleChoice commit questionId="q1" options={OPTIONS} seed={SEED} value={undefined} onChange={onChange} />);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByRole("group", { name: "Answers" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: OPTIONS[1] }));
    expect(onChange).toHaveBeenCalledWith({ kind: "single", selectedIndex: 1 });
  });

  it("says each mark in words once the answers are revealed, and locks them", () => {
    render(
      <MultipleChoice
        commit
        questionId="q1"
        options={OPTIONS}
        seed={SEED}
        value={{ kind: "single", selectedIndex: 2 }}
        onChange={() => {}}
        revealed
        correctIndex={0}
      />
    );
    // (The test's DOM library drops the space at the edge of an inline span; a browser keeps it.)
    expect(screen.getByRole("button", { name: /^Correct answer: ?Symmetric$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Your answer, which is incorrect: ?Hashing$/ })).toBeDisabled();
    // Every answer is the shared control: one radius, one edge, no "transition-all".
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("rounded-md");
      expect(button.className).not.toContain("transition-all");
    }
  });
});

/** The letter printed in an answer's key box. */
const keyBox = (answer: HTMLElement) => answer.querySelector("[aria-hidden]")?.textContent;
/** The marks drawn in an element, by kind: "check" or "x". */
const marks = (el: Element | null) =>
  [...(el?.querySelectorAll("svg") ?? [])].map((svg) => (/lucide-check\b/.test(svg.getAttribute("class") ?? "") ? "check" : "x"));

describe("MultipleChoice, a question whose explanation names an answer by its letter", () => {
  // With this seed the shuffle moves every answer, so stored order here is not chance.
  it("is not in its stored order when it is shuffled", () => {
    expect(ORDER).not.toEqual([0, 1, 2, 3]);
    expect(answerOrder(SEED, "q1", OPTIONS.length)).toEqual(ORDER);
    expect(answerOrder(SEED, "q1", OPTIONS.length, true)).toEqual([0, 1, 2, 3]);
  });

  it("shows its answers in their stored order, each under the letter the explanation uses", () => {
    const onChange = vi.fn();
    render(
      <MultipleChoice commit keepOrder questionId="q1" options={OPTIONS} seed={SEED} value={undefined} onChange={onChange} />
    );
    const answers = screen.getAllByRole("button");
    expect(answers.map(keyBox)).toEqual(["A", "B", "C", "D"]);
    // The letter is part of each answer's name: the explanation refers to it, and the key box is hidden from a screen reader.
    // (The test's DOM library drops the space at the edge of an inline span; a browser keeps it.)
    OPTIONS.forEach((option, i) => {
      expect(answers[i]).toHaveAccessibleName(new RegExp(`^${"ABCD"[i]}\\. ?${option}$`));
    });

    // "Option C" is the third stored answer, and choosing it reports that answer.
    fireEvent.click(answers[2]);
    expect(onChange).toHaveBeenCalledWith({ kind: "single", selectedIndex: 2 });
  });

  it("keeps the order and the letters once the answers are marked", () => {
    render(
      <MultipleChoice
        commit
        keepOrder
        questionId="q1"
        options={OPTIONS}
        seed={SEED}
        value={{ kind: "single", selectedIndex: 3 }}
        onChange={() => {}}
        revealed
        correctIndex={2}
      />
    );
    const answers = screen.getAllByRole("button");
    expect(answers[0]).toHaveAccessibleName(/^A\. ?Symmetric$/);
    expect(answers[1]).toHaveAccessibleName(/^B\. ?Asymmetric$/);
    expect(answers[2]).toHaveAccessibleName(/^Correct answer: ?C\. ?Hashing$/);
    expect(answers[3]).toHaveAccessibleName(/^Your answer, which is incorrect: ?D\. ?Steganography$/);
    // The explanation printed under the answers speaks of C and D: each still shows its letter,
    // and the check and the cross are drawn at the end of the answer instead.
    expect(answers.map(keyBox)).toEqual(["A", "B", "C", "D"]);
    expect(answers.map(marks)).toEqual([[], [], ["check"], ["x"]]);
    expect(answers[2].lastElementChild?.tagName.toLowerCase()).toBe("svg");
  });

  it("draws the check in place of the letter for a question that is shuffled, as before", () => {
    render(
      <MultipleChoice
        commit
        questionId="q1"
        options={OPTIONS}
        seed={SEED}
        value={{ kind: "single", selectedIndex: 3 }}
        onChange={() => {}}
        revealed
        correctIndex={2}
      />
    );
    const correct = screen.getByRole("button", { name: /^Correct answer: ?Hashing$/ });
    expect(keyBox(correct)).toBe("");
    expect(marks(correct.querySelector("span[aria-hidden]"))).toEqual(["check"]);
    expect(marks(correct)).toEqual(["check"]);
  });

  it("does the same in a radio group, where the choice can still be changed", () => {
    const onChange = vi.fn();
    render(<MultipleChoice keepOrder questionId="q1" options={OPTIONS} seed={SEED} value={undefined} onChange={onChange} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.map(keyBox)).toEqual(["A", "B", "C", "D"]);
    expect(radios[1]).toHaveAccessibleName(/^B\. ?Asymmetric$/);
    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith({ kind: "single", selectedIndex: 1 });
  });

  it("leaves a shuffled question's names without letters", () => {
    render(<MultipleChoice commit questionId="q1" options={OPTIONS} seed={SEED} value={undefined} onChange={() => {}} />);
    const answers = screen.getAllByRole("button");
    expect(answers.map((a) => a.textContent?.slice(1))).toEqual(ORDER.map((i) => OPTIONS[i]));
    expect(answers[0]).toHaveAccessibleName(OPTIONS[ORDER[0]]);
  });
});

describe("Ordering", () => {
  it("says in a sentence, for a screen reader, whether each item is in its position once the order is marked", () => {
    const ITEMS = ["Preparation", "Detection", "Containment"];
    render(
      <Ordering
        questionId="q1"
        items={ITEMS}
        correctPositions={[0, 1, 2]}
        seed={SEED}
        value={{ kind: "ordering", order: [0, 2, 1] }}
        onChange={() => {}}
        revealed
      />
    );
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByText("This item is in the correct position.")).toHaveClass("sr-only");
    expect(within(second).getByText("This item is not in the correct position.")).toHaveClass("sr-only");
  });
});

describe("MultipleSelect", () => {
  it("is a group of buttons that are pressed or not, with what to do said in words", () => {
    const onChange = vi.fn();
    render(
      <MultipleSelect
        questionId="q1"
        options={OPTIONS}
        correctIndexes={[0, 2]}
        seed={SEED}
        value={{ kind: "multi", selectedIndexes: [0] }}
        onChange={onChange}
      />
    );
    const group = screen.getByRole("group", { name: "Answers" });
    expect(group).toHaveAccessibleDescription("Choose every answer that applies.");
    expect(screen.getByRole("button", { name: OPTIONS[0] })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: OPTIONS[2] }));
    expect(onChange).toHaveBeenCalledWith({ kind: "multi", selectedIndexes: [0, 2] });
  });

  it("marks a correct answer that was not chosen, in words", () => {
    render(
      <MultipleSelect
        questionId="q1"
        options={OPTIONS}
        correctIndexes={[0, 2]}
        seed={SEED}
        value={{ kind: "multi", selectedIndexes: [0, 1] }}
        onChange={() => {}}
        revealed
      />
    );
    expect(screen.getByRole("button", { name: /^Your answer, which is correct: ?Symmetric$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Your answer, which is incorrect: ?Asymmetric$/ })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /^Correct answer, which you did not choose: ?Hashing$/ })
    ).toBeDisabled();
  });
});
