// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultipleChoiceQuestion } from "../MultipleChoiceQuestion";

const opts = [
  { text: "Alpha", is_correct: false },
  { text: "Bravo", is_correct: true },
  { text: "Charlie", is_correct: false },
  { text: "Delta", is_correct: false },
];

describe("MultipleChoiceQuestion", () => {
  it("renders each option with a lettered circle A–D", () => {
    render(
      <MultipleChoiceQuestion
        shuffledOptions={opts}
        selectedOption={null}
        shuffledCorrectIndex={1}
        isRevealed={false}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("fires onSelect with the button index when a button is clicked and not revealed", async () => {
    const onSelect = vi.fn();
    render(
      <MultipleChoiceQuestion
        shuffledOptions={opts}
        selectedOption={null}
        shuffledCorrectIndex={1}
        isRevealed={false}
        onSelect={onSelect}
      />
    );
    await userEvent.click(screen.getByText("Charlie"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("disables all buttons when revealed", () => {
    render(
      <MultipleChoiceQuestion
        shuffledOptions={opts}
        selectedOption={0}
        shuffledCorrectIndex={1}
        isRevealed={true}
        onSelect={() => {}}
      />
    );
    screen.getAllByRole("button").forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("does not call onSelect when a revealed button is clicked", async () => {
    const onSelect = vi.fn();
    render(
      <MultipleChoiceQuestion
        shuffledOptions={opts}
        selectedOption={0}
        shuffledCorrectIndex={1}
        isRevealed={true}
        onSelect={onSelect}
      />
    );
    await userEvent.click(screen.getByText("Alpha"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("applies success styling to the correct option when revealed", () => {
    render(
      <MultipleChoiceQuestion
        shuffledOptions={opts}
        selectedOption={0}
        shuffledCorrectIndex={1}
        isRevealed={true}
        onSelect={() => {}}
      />
    );
    const correctBtn = screen.getByText("Bravo").closest("button")!;
    expect(correctBtn.className).toContain("border-success");
    expect(correctBtn.className).toContain("bg-success-bg");
  });

  it("applies danger styling to a wrong selection when revealed", () => {
    render(
      <MultipleChoiceQuestion
        shuffledOptions={opts}
        selectedOption={0}
        shuffledCorrectIndex={1}
        isRevealed={true}
        onSelect={() => {}}
      />
    );
    const wrongBtn = screen.getByText("Alpha").closest("button")!;
    expect(wrongBtn.className).toContain("border-danger");
    expect(wrongBtn.className).toContain("bg-danger-bg");
  });

  it("dims non-selected non-correct options when revealed", () => {
    render(
      <MultipleChoiceQuestion
        shuffledOptions={opts}
        selectedOption={0}
        shuffledCorrectIndex={1}
        isRevealed={true}
        onSelect={() => {}}
      />
    );
    const dimBtn = screen.getByText("Charlie").closest("button")!;
    expect(dimBtn.className).toContain("opacity-50");
  });

  it("highlights the selected option with primary styling before reveal", () => {
    render(
      <MultipleChoiceQuestion
        shuffledOptions={opts}
        selectedOption={2}
        shuffledCorrectIndex={1}
        isRevealed={false}
        onSelect={() => {}}
      />
    );
    const selBtn = screen.getByText("Charlie").closest("button")!;
    expect(selBtn.className).toContain("border-primary");
    expect(selBtn.className).toContain("bg-info-bg");
  });
});
