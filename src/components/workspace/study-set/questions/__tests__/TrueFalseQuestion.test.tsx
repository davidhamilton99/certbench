// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrueFalseQuestion } from "../TrueFalseQuestion";

const opts = [
  { text: "True", is_correct: true },
  { text: "False", is_correct: false },
];

describe("TrueFalseQuestion", () => {
  it("renders T and F circle letters from the first character of each option", () => {
    render(
      <TrueFalseQuestion
        options={opts}
        selectedOption={null}
        correctIndex={0}
        isRevealed={false}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText("True")).toBeInTheDocument();
    expect(screen.getByText("False")).toBeInTheDocument();
    // Two circles showing "T" and "F"
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByText("F")).toBeInTheDocument();
  });

  it("fires onSelect with the clicked option index when not revealed", async () => {
    const onSelect = vi.fn();
    render(
      <TrueFalseQuestion
        options={opts}
        selectedOption={null}
        correctIndex={0}
        isRevealed={false}
        onSelect={onSelect}
      />
    );
    await userEvent.click(screen.getByText("False"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("disables both buttons when revealed", () => {
    render(
      <TrueFalseQuestion
        options={opts}
        selectedOption={1}
        correctIndex={0}
        isRevealed={true}
        onSelect={() => {}}
      />
    );
    screen.getAllByRole("button").forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("applies success styling to the correct option when revealed", () => {
    render(
      <TrueFalseQuestion
        options={opts}
        selectedOption={1}
        correctIndex={0}
        isRevealed={true}
        onSelect={() => {}}
      />
    );
    const correctBtn = screen.getByText("True").closest("button")!;
    expect(correctBtn.className).toContain("border-success");
  });

  it("applies danger styling to a wrong selection when revealed", () => {
    render(
      <TrueFalseQuestion
        options={opts}
        selectedOption={1}
        correctIndex={0}
        isRevealed={true}
        onSelect={() => {}}
      />
    );
    const wrongBtn = screen.getByText("False").closest("button")!;
    expect(wrongBtn.className).toContain("border-danger");
  });

  it("highlights the selected option with primary styling before reveal", () => {
    render(
      <TrueFalseQuestion
        options={opts}
        selectedOption={1}
        correctIndex={0}
        isRevealed={false}
        onSelect={() => {}}
      />
    );
    const selBtn = screen.getByText("False").closest("button")!;
    expect(selBtn.className).toContain("border-primary");
  });
});
