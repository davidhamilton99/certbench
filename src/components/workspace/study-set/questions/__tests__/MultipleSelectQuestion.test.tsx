// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultipleSelectQuestion } from "../MultipleSelectQuestion";

const opts = [
  { text: "Alpha", is_correct: true },
  { text: "Bravo", is_correct: false },
  { text: "Charlie", is_correct: true },
  { text: "Delta", is_correct: false },
];

describe("MultipleSelectQuestion", () => {
  it("renders all options and the 'select all that apply' hint when not revealed", () => {
    render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        selected={new Set()}
        isRevealed={false}
        onToggle={() => {}}
      />
    );
    expect(screen.getByText(/select all that apply/i)).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Delta")).toBeInTheDocument();
  });

  it("fires onToggle with the original index when an option is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[2, 0, 3, 1]} // scrambled
        selected={new Set()}
        isRevealed={false}
        onToggle={onToggle}
      />
    );
    await userEvent.click(screen.getByText("Charlie"));
    expect(onToggle).toHaveBeenCalledWith(2);
  });

  it("falls back to natural order when displayOrder is empty", () => {
    render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[]}
        selected={new Set()}
        isRevealed={false}
        onToggle={() => {}}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveTextContent("Alpha");
    expect(buttons[3]).toHaveTextContent("Delta");
  });

  it("disables all buttons when revealed", () => {
    render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        selected={new Set([0])}
        isRevealed={true}
        onToggle={() => {}}
      />
    );
    screen.getAllByRole("button").forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("applies correct+selected styling (success + ring) when revealed", () => {
    render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        selected={new Set([0])}
        isRevealed={true}
        onToggle={() => {}}
      />
    );
    const btn = screen.getByText("Alpha").closest("button")!;
    expect(btn.className).toContain("border-success");
    expect(btn.className).toContain("ring-success");
  });

  it("applies correct+missed styling (success outline, no ring) when revealed", () => {
    render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        selected={new Set([0])}
        isRevealed={true}
        onToggle={() => {}}
      />
    );
    const btn = screen.getByText("Charlie").closest("button")!;
    expect(btn.className).toContain("border-success");
    expect(btn.className).not.toContain("ring-success");
  });

  it("applies wrong+selected styling (danger) when revealed", () => {
    render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        selected={new Set([0, 1])}
        isRevealed={true}
        onToggle={() => {}}
      />
    );
    const btn = screen.getByText("Bravo").closest("button")!;
    expect(btn.className).toContain("border-danger");
  });

  it("dims wrong+not-selected options when revealed", () => {
    render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        selected={new Set([0])}
        isRevealed={true}
        onToggle={() => {}}
      />
    );
    const btn = screen.getByText("Delta").closest("button")!;
    expect(btn.className).toContain("opacity-50");
  });

  it("shows check marks on selected options before reveal and on all correct options when revealed", () => {
    const { unmount } = render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        selected={new Set([0])}
        isRevealed={false}
        onToggle={() => {}}
      />
    );
    // Only Alpha should show a check
    expect(screen.getAllByText("\u2713")).toHaveLength(1);
    unmount();

    render(
      <MultipleSelectQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        selected={new Set([0])}
        isRevealed={true}
        onToggle={() => {}}
      />
    );
    // Alpha (correct+selected) and Charlie (missed correct) should both show checks
    expect(screen.getAllByText("\u2713")).toHaveLength(2);
  });
});
