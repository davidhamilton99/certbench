// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderingQuestion } from "../OrderingQuestion";

const opts = [
  { text: "First", correct_position: 0 },
  { text: "Second", correct_position: 1 },
  { text: "Third", correct_position: 2 },
  { text: "Fourth", correct_position: 3 },
];

describe("OrderingQuestion", () => {
  it("renders all options with en-dash placeholders when sequence is empty", () => {
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[2, 0, 3, 1]}
        sequence={[]}
        isRevealed={false}
        onToggleItem={() => {}}
      />
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getAllByText("\u2013")).toHaveLength(4);
  });

  it("shows the click-to-order hint when not revealed", () => {
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        sequence={[]}
        isRevealed={false}
        onToggleItem={() => {}}
      />
    );
    expect(screen.getByText(/click items in the correct order/i)).toBeInTheDocument();
  });

  it("hides the hint when revealed and shows the correct-order panel", () => {
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        sequence={[]}
        isRevealed={true}
        onToggleItem={() => {}}
      />
    );
    expect(screen.queryByText(/click items in the correct order/i)).not.toBeInTheDocument();
    expect(screen.getByText(/correct order:/i)).toBeInTheDocument();
  });

  it("renders sequence numbers 1..N on placed items in click order", () => {
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        sequence={[2, 0]} // user placed Third first, First second
        isRevealed={false}
        onToggleItem={() => {}}
      />
    );
    const third = screen.getByText("Third").closest("button")!;
    const first = screen.getByText("First").closest("button")!;
    expect(third.textContent).toContain("1");
    expect(first.textContent).toContain("2");
  });

  it("fires onToggleItem with the original index when clicked (not revealed)", async () => {
    const onToggle = vi.fn();
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        sequence={[]}
        isRevealed={false}
        onToggleItem={onToggle}
      />
    );
    await userEvent.click(screen.getByText("Second"));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it("disables all buttons and does not call onToggleItem when revealed", async () => {
    const onToggle = vi.fn();
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        sequence={[0, 1]}
        isRevealed={true}
        onToggleItem={onToggle}
      />
    );
    screen.getAllByRole("button").forEach((btn) => {
      expect(btn).toBeDisabled();
    });
    await userEvent.click(screen.getByText("Third"));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("applies success styling to items placed in their correct position on reveal", () => {
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        sequence={[0, 1, 2, 3]} // all correct
        isRevealed={true}
        onToggleItem={() => {}}
      />
    );
    const btn = screen.getByText("First").closest("button")!;
    expect(btn.className).toContain("border-success");
  });

  it("applies danger styling to items placed in the wrong position on reveal", () => {
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        sequence={[1, 0, 2, 3]} // Second is at posInSeq 0 but correct_position 1 → wrong
        isRevealed={true}
        onToggleItem={() => {}}
      />
    );
    const btn = screen.getByText("Second").closest("button")!;
    expect(btn.className).toContain("border-danger");
  });

  it("dims items not placed at all on reveal", () => {
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[0, 1, 2, 3]}
        sequence={[0, 1]} // only first two placed
        isRevealed={true}
        onToggleItem={() => {}}
      />
    );
    const btn = screen.getByText("Third").closest("button")!;
    expect(btn.className).toContain("opacity-50");
  });

  it("falls back to natural order when displayOrder is empty", () => {
    render(
      <OrderingQuestion
        options={opts}
        displayOrder={[]}
        sequence={[]}
        isRevealed={false}
        onToggleItem={() => {}}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveTextContent("First");
  });
});
