// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import { MultipleChoice } from "@/components/quiz/renderers/MultipleChoice";
import { MultipleSelect } from "@/components/quiz/renderers/MultipleSelect";

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
