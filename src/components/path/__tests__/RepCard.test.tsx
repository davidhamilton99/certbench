// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RepCard } from "../RepCard";
import type { TypedRep } from "@/core/path/types";

const subnetRep: TypedRep = {
  id: "r|1.4|subnet|network-id",
  type: "typed",
  label: "Hands-on",
  tier: "quick",
  objective: "1.4",
  prompt: "What is the network address of 192.168.1.77 /26?",
  cue: "Your answer",
  accept: ["192.168.1.64"],
  answerText: "192.168.1.64",
  answerKind: "dotted",
  placeholder: "192.168.1.128",
  takeaway: "Block size 64: networks start at .0, .64, .128, .192.",
  explanation: "77 falls in the .64 block.",
};

function answerWith(text: string) {
  const onAnswer = vi.fn();
  render(<RepCard rep={subnetRep} onAnswer={onAnswer} onNext={() => {}} />);
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
  return onAnswer;
}

describe("RepCard — subnetting answers", () => {
  it("accepts the right dotted address", () => {
    expect(answerWith("192.168.1.64")).toHaveBeenCalledWith({ correct: true, picked: -1 });
    expect(screen.getByText(/Block size 64/)).toBeInTheDocument();
  });

  it("rejects an address that only matches once the dots are dropped", () => {
    // Plain text matching drops the dots, so both would read "192168164".
    expect(answerWith("192.168.16.4")).toHaveBeenCalledWith({ correct: false, picked: -1 });
    expect(screen.getByText(/The correct answer is 192\.168\.1\.64\./)).toBeInTheDocument();
  });

  it("folds the worked steps behind 'Read the full explanation'", () => {
    answerWith("10.0.0.1");
    expect(screen.getByText("Read the full explanation")).toBeInTheDocument();
  });

  // Grey text inside a field vanishes at the first key and is cut off beside
  // the button on a phone, so the form of the answer is a sentence in view.
  it("shows the form of the answer as a hint under the label, tied to the field", () => {
    render(<RepCard rep={subnetRep} onAnswer={() => {}} onNext={() => {}} />);
    const field = screen.getByLabelText("Your answer");
    const hint = screen.getByText(/^For example,/);
    expect(hint).toHaveTextContent("For example, 192.168.1.128.");
    expect(field).not.toHaveAttribute("placeholder");
    expect(field.getAttribute("aria-describedby")?.split(" ")).toContain(hint.id);
  });

  it("prints no hint for a typed question that has no example", () => {
    render(<RepCard rep={{ ...subnetRep, placeholder: undefined }} onAnswer={() => {}} onNext={() => {}} />);
    expect(screen.queryByText(/^For example,/)).toBeNull();
  });
});
