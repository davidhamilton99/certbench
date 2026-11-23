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

// A bank question whose explanation names its answers by their letters keeps
// its stored order (bankToRep). Once it is marked, the check or the cross used
// to take the place of the letter in the key box, so the learner could not
// tell which answer was B while the explanation spoke of B.
describe("RepCard — a question whose explanation names its answers by letter", () => {
  const letteredRep: ChoiceRep = {
    id: "q|2.4|00000000-0000-4000-8000-000000000001",
    type: "choice",
    label: "Exam style",
    tier: "exam",
    objective: "2.4",
    prompt: "Which attack sends a flood of SYN packets?",
    options: ["Smurf attack", "SYN flood", "Teardrop attack", "Ping of death"],
    answer: 1,
    takeaway: "A SYN flood leaves half-open connections.",
    explanation: "Option A describes an ICMP amplification attack.",
    lettered: true,
    keepsLetters: true,
    order: [0, 1, 2, 3],
  };
  /** The key box: the square that prints the answer's letter, which a screen reader does not read. */
  const keyBox = (name: RegExp) => screen.getByRole("button", { name }).querySelector("span[aria-hidden]")!;
  /** The marks drawn in an answer, by kind ("check" or "x"). */
  const marks = (el: Element) =>
    [...el.querySelectorAll("svg")].map((svg) => /lucide-check\b/.test(svg.getAttribute("class") ?? "") ? "check" : "x");

  it("keeps B in its key box once marked, and still draws the check, at the end of the answer", () => {
    render(<RepCard rep={letteredRep} onAnswer={() => {}} onNext={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /SYN flood/ }));
    const right = screen.getByRole("button", { name: /^Your answer, which is correct: ?B\. ?SYN flood$/ });
    const box = keyBox(/SYN flood/);
    expect(box).toHaveTextContent(/^B$/);
    expect(box.querySelector("svg")).toBeNull();
    // Still in the mark's colours: the letter does not replace the colour, it joins it.
    expect(box.className).toContain("bg-success");
    // The mark is never colour alone: the check is drawn at the end of the answer.
    expect(marks(right)).toEqual(["check"]);
    expect(right.lastElementChild?.tagName.toLowerCase()).toBe("svg");
    // The other answers keep their letters too.
    expect(keyBox(/Smurf attack/)).toHaveTextContent(/^A$/);
    expect(marks(screen.getByRole("button", { name: /Smurf attack/ }))).toEqual([]);
  });

  it("keeps the letter of a wrong answer, with the cross at its end, beside the correct one's check", () => {
    render(<RepCard rep={letteredRep} onAnswer={() => {}} onNext={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Smurf attack/ }));
    const wrong = screen.getByRole("button", { name: /^Your answer, which is incorrect: ?A\. ?Smurf attack$/ });
    expect(keyBox(/Smurf attack/)).toHaveTextContent(/^A$/);
    expect(marks(wrong)).toEqual(["x"]);
    expect(keyBox(/SYN flood/)).toHaveTextContent(/^B$/);
    expect(marks(screen.getByRole("button", { name: /^Correct answer: ?B\. ?SYN flood$/ }))).toEqual(["check"]);
  });

  // The explanation names the answers by letter, and the key box that prints
  // each letter is hidden from a screen reader: the letter is said in each
  // answer's name, before and after marking, as MultipleChoice says it.
  // (The test's DOM library drops the space at the edge of an inline span; a browser keeps it.)
  it("says each answer's letter to a screen reader, before marking and with the mark after it", () => {
    render(<RepCard rep={letteredRep} onAnswer={() => {}} onNext={() => {}} />);
    expect(screen.getByRole("button", { name: /^A\. ?Smurf attack$/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^B\. ?SYN flood$/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^C\. ?Teardrop attack$/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^D\. ?Ping of death$/ })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /^C\. ?Teardrop attack$/ }));
    expect(screen.getByRole("button", { name: /^A\. ?Smurf attack$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Correct answer: ?B\. ?SYN flood$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Your answer, which is incorrect: ?C\. ?Teardrop attack$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^D\. ?Ping of death$/ })).toBeDisabled();
  });

  // A shuffled question's letter is only its place for this learner, which the
  // order the answers are read in already gives: as in MultipleChoice, it is not said.
  it("says no letter for a lettered question whose explanation names none, before or after marking", () => {
    render(<RepCard rep={{ ...letteredRep, keepsLetters: undefined }} onAnswer={() => {}} onNext={() => {}} />);
    expect(screen.getByRole("button", { name: "Smurf attack" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "SYN flood" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Smurf attack" }));
    expect(screen.getByRole("button", { name: /^Your answer, which is incorrect: ?Smurf attack$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Correct answer: ?SYN flood$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Teardrop attack" })).toBeDisabled();
  });

  it("is unchanged for a question whose explanation names no letter: the check takes the letter's place", () => {
    render(<RepCard rep={{ ...letteredRep, keepsLetters: undefined }} onAnswer={() => {}} onNext={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /SYN flood/ }));
    const box = keyBox(/SYN flood/);
    expect(box).not.toHaveTextContent("B");
    expect(marks(box)).toEqual(["check"]);
    // One mark only, in the key box.
    expect(marks(screen.getByRole("button", { name: /^Your answer, which is correct: ?SYN flood$/ }))).toEqual(["check"]);
  });
});
