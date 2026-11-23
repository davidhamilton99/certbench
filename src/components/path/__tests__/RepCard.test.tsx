// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RepCard } from "../RepCard";
import type { ChoiceRep, TypedRep } from "@/core/path/types";

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

  // A disabled field is drawn at half strength: the learner's own answer would
  // fade just as they compare it with the correct one.
  it("keeps the marked answer in full ink: read only, and not disabled", () => {
    answerWith("192.168.16.4");
    const field = screen.getByLabelText("Your answer");
    expect(field).toHaveAttribute("readonly");
    expect(field).toBeEnabled();
    expect(field).toHaveValue("192.168.16.4");
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

// A recall fact printed as a bare term carries its question in a line under
// it. Read by a screen reader as part of the answers' name, the direction of
// the question (port to protocol, or protocol to port) is not lost to someone
// who moves straight to the answers.
describe("RepCard — a recall fact asked as a bare term", () => {
  const termRep: ChoiceRep = {
    id: "r|1.5|sec-ports|1a2b3c4d",
    type: "choice",
    label: "Recall",
    tier: "recall",
    objective: "1.5",
    prompt: "SMTP",
    cue: "Which port?",
    options: ["25", "110", "143", "636"],
    answer: 0,
    takeaway: "SMTP uses port 25.",
  };

  it("names its answers by the term and the question together, and reads the question with the term", () => {
    render(<RepCard rep={termRep} onAnswer={() => {}} onNext={() => {}} />);
    expect(screen.getByRole("group", { name: "SMTP Which port?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SMTP" })).toHaveAccessibleDescription("Which port?");
  });

  it("names its answers by the question alone where the question is a sentence", () => {
    render(<RepCard rep={{ ...termRep, prompt: "Which port does SMTP use?", cue: undefined }} onAnswer={() => {}} onNext={() => {}} />);
    expect(screen.getByRole("group", { name: "Which port does SMTP use?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Which port does SMTP use?" })).not.toHaveAttribute("aria-describedby");
  });
});
