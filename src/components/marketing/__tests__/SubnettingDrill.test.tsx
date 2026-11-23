// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { DrillMode, DrillQuestion } from "@/lib/tools/subnetting";

// Fixed questions in place of random ones: a typed question for every mode but
// "Same subnet?", which is answered yes or no.
const dealt = vi.hoisted(() => ({ count: 0 }));
vi.mock("@/lib/tools/subnetting", async (original) => {
  const real = await original<typeof import("@/lib/tools/subnetting")>();
  return {
    ...real,
    generateQuestion: (mode: DrillMode): DrillQuestion => {
      dealt.count += 1;
      if (mode === "same-subnet") {
        return {
          mode,
          prompt: "Are these two addresses on the same subnet?",
          promptValue: `10.0.0.${dealt.count} and 10.0.0.200 /25`,
          sentence: `Are 10.0.0.${dealt.count} and 10.0.0.200 on the same /25 subnet?`,
          answerKind: "yes-no",
          answer: "no",
          placeholder: "",
          solution: ["The two addresses are in different networks."],
        };
      }
      return {
        mode,
        prompt: "What is the network address of this host?",
        promptValue: `192.168.1.${dealt.count} /24`,
        sentence: `What is the network address of 192.168.1.${dealt.count} /24?`,
        answerKind: "dotted",
        answer: "192.168.1.0",
        placeholder: "192.168.1.128",
        solution: ["A /24 keeps the first three octets."],
      };
    },
  };
});

import { SubnettingDrill } from "../SubnettingDrill";

const modes = () => within(screen.getByRole("group", { name: "Drill mode" }));
const field = () => screen.getByLabelText("Your answer");

function answer(text: string) {
  fireEvent.change(field(), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
}

beforeEach(() => {
  dealt.count = 0;
});

describe("SubnettingDrill", () => {
  it("keeps a plain count of correct answers, with no flame and no streak", () => {
    const { container } = render(<SubnettingDrill />);
    expect(screen.getByText("0 of 0 correct.")).toBeInTheDocument();
    expect(screen.queryByText(/streak/i)).toBeNull();
    // The flame was the drill's only icon.
    expect(container.querySelector("svg")).toBeNull();

    answer("192.168.1.0");
    expect(screen.getByText("1 of 1 correct.")).toBeInTheDocument();
    expect(screen.queryByText(/streak|best/i)).toBeNull();
  });

  it("shows the form of the answer as a sentence under the label, tied to the field", () => {
    render(<SubnettingDrill />);
    const hint = screen.getByText(/^For example,/);
    expect(hint).toHaveTextContent("For example, 192.168.1.128.");
    expect(field()).not.toHaveAttribute("placeholder");
    expect(field()).toHaveAttribute("aria-describedby", hint.id);
  });

  it("does not take the focus as the page loads", () => {
    render(<SubnettingDrill />);
    expect(field()).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it("offers the modes as pressed buttons in a named group, not as tabs", () => {
    render(<SubnettingDrill />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(modes().getByRole("button", { name: "Network ID" })).toHaveAttribute("aria-pressed", "true");
    expect(modes().getByRole("button", { name: "Mixed" })).toHaveAttribute("aria-pressed", "false");
    // The names are words: "and" is written out, and nothing is joined by an arrow.
    expect(modes().getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Binary",
      "CIDR and mask",
      "Network ID",
      "Broadcast and range",
      "Host math",
      "Same subnet?",
      "Mixed",
    ]);
    // The prefix range is named, and says which one is in use.
    const prefixes = within(screen.getByRole("group", { name: "Prefixes" }));
    expect(prefixes.getByRole("button", { name: "/24–/30" })).toHaveAttribute("aria-pressed", "true");
  });

  it("moves straight on after a correct answer, and says so to a screen reader", () => {
    render(<SubnettingDrill />);
    expect(screen.getByText("192.168.1.1 /24")).toBeInTheDocument();
    answer("192.168.1.0");
    // The next question, with the focus in its field.
    expect(screen.getByText("192.168.1.2 /24")).toBeInTheDocument();
    expect(field()).toHaveValue("");
    expect(field()).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Correct. 1 of 1 correct.");
    answer("192.168.1.0");
    // The words change with each correct answer, so each one is announced.
    expect(screen.getByRole("status")).toHaveTextContent("Correct. 2 of 2 correct.");
  });

  it("after an incorrect answer shows the answer in a sentence and waits for Continue", () => {
    render(<SubnettingDrill />);
    answer("10.0.0.0");
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toHaveFocus();
    expect(next).toHaveAccessibleDescription("Incorrect. The correct answer is 192.168.1.0.");
    expect(screen.getByText("A /24 keeps the first three octets.")).toBeInTheDocument();
    expect(screen.getByText("0 of 1 correct.")).toBeInTheDocument();
    expect(field()).toBeDisabled();
    // The question does not change until the person asks for the next one.
    expect(screen.getByText("192.168.1.1 /24")).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByText("192.168.1.2 /24")).toBeInTheDocument();
    expect(field()).toBeEnabled();
    expect(field()).toHaveFocus();
  });

  it("answers a yes or no question with Y and N only while the focus is inside the drill", () => {
    render(<SubnettingDrill />);
    fireEvent.click(modes().getByRole("button", { name: "Same subnet?" }));
    const question = screen.getByText("Are these two addresses on the same subnet?").closest("p")!;
    // A question that follows a press on this page takes the focus, so it is read.
    expect(question).toHaveFocus();

    // A key pressed elsewhere on the page does nothing.
    fireEvent.keyDown(document.body, { key: "n" });
    expect(screen.getByText("0 of 0 correct.")).toBeInTheDocument();

    // Inside the drill, N answers "No", which is correct here.
    fireEvent.keyDown(question, { key: "n" });
    expect(screen.getByText("1 of 1 correct.")).toBeInTheDocument();

    // Y is incorrect: both answers are closed, and Continue takes the focus.
    fireEvent.keyDown(screen.getByText("Are these two addresses on the same subnet?").closest("p")!, { key: "y" });
    expect(screen.getByRole("button", { name: "Yes" })).toBeDisabled();
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toHaveFocus();
    expect(next).toHaveAccessibleDescription("Incorrect. The correct answer is no.");
  });

  it("starts the count again when the mode changes", () => {
    render(<SubnettingDrill />);
    answer("192.168.1.0");
    expect(screen.getByText("1 of 1 correct.")).toBeInTheDocument();
    fireEvent.click(modes().getByRole("button", { name: "Binary" }));
    expect(screen.getByText("0 of 0 correct.")).toBeInTheDocument();
    expect(modes().getByRole("button", { name: "Binary" })).toHaveAttribute("aria-pressed", "true");
  });
});
