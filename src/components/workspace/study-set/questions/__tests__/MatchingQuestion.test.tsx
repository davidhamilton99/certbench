// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchingQuestion } from "../MatchingQuestion";

const opts = [
  { left: "TCP", right: "Connection-oriented" },
  { left: "UDP", right: "Connectionless" },
  { left: "ICMP", right: "Network diagnostics" },
];

describe("MatchingQuestion", () => {
  it("renders all left terms and right definitions (scrambled per rightOrder)", () => {
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[2, 0, 1]}
        activeLeft={null}
        pairs={new Map()}
        isRevealed={false}
        onLeftClick={() => {}}
        onRightClick={() => {}}
      />
    );
    expect(screen.getByText("TCP")).toBeInTheDocument();
    expect(screen.getByText("UDP")).toBeInTheDocument();
    expect(screen.getByText("ICMP")).toBeInTheDocument();
    expect(screen.getByText("Network diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Connectionless")).toBeInTheDocument();
  });

  it("fires onLeftClick with the term's original index", async () => {
    const onLeftClick = vi.fn();
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[0, 1, 2]}
        activeLeft={null}
        pairs={new Map()}
        isRevealed={false}
        onLeftClick={onLeftClick}
        onRightClick={() => {}}
      />
    );
    await userEvent.click(screen.getByText("UDP"));
    expect(onLeftClick).toHaveBeenCalledWith(1);
  });

  it("fires onRightClick with the display position (not original index) when a left is active", async () => {
    const onRightClick = vi.fn();
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[2, 0, 1]}
        activeLeft={0}
        pairs={new Map()}
        isRevealed={false}
        onLeftClick={() => {}}
        onRightClick={onRightClick}
      />
    );
    // "Connection-oriented" is at display position 1 (rightOrder[1] === 0)
    await userEvent.click(screen.getByText("Connection-oriented"));
    expect(onRightClick).toHaveBeenCalledWith(1);
  });

  it("disables right buttons and does not fire onRightClick when no left is active", async () => {
    const onRightClick = vi.fn();
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[0, 1, 2]}
        activeLeft={null}
        pairs={new Map()}
        isRevealed={false}
        onLeftClick={() => {}}
        onRightClick={onRightClick}
      />
    );
    const rightBtn = screen.getByText("Connection-oriented").closest("button")!;
    expect(rightBtn).toBeDisabled();
    await userEvent.click(rightBtn);
    expect(onRightClick).not.toHaveBeenCalled();
  });

  it("highlights the active left term with ring styling", () => {
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[0, 1, 2]}
        activeLeft={1}
        pairs={new Map()}
        isRevealed={false}
        onLeftClick={() => {}}
        onRightClick={() => {}}
      />
    );
    const activeBtn = screen.getByText("UDP").closest("button")!;
    expect(activeBtn.className).toContain("ring-primary/30");
  });

  it("shows paired styling on both sides of a match before reveal", () => {
    const pairs = new Map([[0, 0]]); // TCP → Connection-oriented
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[0, 1, 2]}
        activeLeft={null}
        pairs={pairs}
        isRevealed={false}
        onLeftClick={() => {}}
        onRightClick={() => {}}
      />
    );
    const leftBtn = screen.getByText("TCP").closest("button")!;
    const rightBtn = screen.getByText("Connection-oriented").closest("button")!;
    expect(leftBtn.className).toContain("border-primary");
    expect(rightBtn.className).toContain("border-primary");
  });

  it("applies success styling on both sides when a pair is correct on reveal", () => {
    const pairs = new Map([[0, 0]]); // TCP paired with original right index 0 → correct
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[0, 1, 2]}
        activeLeft={null}
        pairs={pairs}
        isRevealed={true}
        onLeftClick={() => {}}
        onRightClick={() => {}}
      />
    );
    const leftBtn = screen.getByText("TCP").closest("button")!;
    const rightBtn = screen.getByText("Connection-oriented").closest("button")!;
    expect(leftBtn.className).toContain("border-success");
    expect(rightBtn.className).toContain("border-success");
  });

  it("applies danger styling on both sides when a pair is wrong on reveal", () => {
    const pairs = new Map([[0, 1]]); // TCP paired with "Connectionless" → wrong
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[0, 1, 2]}
        activeLeft={null}
        pairs={pairs}
        isRevealed={true}
        onLeftClick={() => {}}
        onRightClick={() => {}}
      />
    );
    const leftBtn = screen.getByText("TCP").closest("button")!;
    const rightBtn = screen.getByText("Connectionless").closest("button")!;
    expect(leftBtn.className).toContain("border-danger");
    expect(rightBtn.className).toContain("border-danger");
  });

  it("dims unpaired items on reveal", () => {
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[0, 1, 2]}
        activeLeft={null}
        pairs={new Map()}
        isRevealed={true}
        onLeftClick={() => {}}
        onRightClick={() => {}}
      />
    );
    const leftBtn = screen.getByText("TCP").closest("button")!;
    expect(leftBtn.className).toContain("opacity-50");
  });

  it("shows the canonical correct-matches panel on reveal", () => {
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[0, 1, 2]}
        activeLeft={null}
        pairs={new Map()}
        isRevealed={true}
        onLeftClick={() => {}}
        onRightClick={() => {}}
      />
    );
    expect(screen.getByText(/correct matches:/i)).toBeInTheDocument();
  });

  it("hides the click-hint when revealed", () => {
    render(
      <MatchingQuestion
        options={opts}
        rightOrder={[0, 1, 2]}
        activeLeft={null}
        pairs={new Map()}
        isRevealed={true}
        onLeftClick={() => {}}
        onRightClick={() => {}}
      />
    );
    expect(
      screen.queryByText(/click a term, then click its matching definition/i)
    ).not.toBeInTheDocument();
  });
});
