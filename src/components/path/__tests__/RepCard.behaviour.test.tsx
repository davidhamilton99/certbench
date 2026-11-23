// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RepCard } from "../RepCard";
import type { ChoiceRep } from "@/core/path/types";

const rep: ChoiceRep = {
  id: "a|1.2|w3",
  type: "choice",
  label: "Recall",
  tier: "quick",
  objective: "1.2",
  prompt: "Which port does SSH use?",
  options: ["22", "23", "25", "443"],
  answer: 0,
  mono: true,
  takeaway: "SSH uses port 22. It replaced Telnet, which uses port 23.",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("RepCard: the card waits for the person", () => {
  it("does not move on by itself after a correct answer", () => {
    vi.useFakeTimers();
    const onNext = vi.fn();
    render(<RepCard rep={rep} onAnswer={() => {}} onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: /22/ }));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText("Correct.")).toBeInTheDocument();
  });

  it("moves on once, when Continue is pressed", () => {
    const onNext = vi.fn();
    render(<RepCard rep={rep} onAnswer={() => {}} onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: /23/ }));
    const next = screen.getByRole("button", { name: /Continue/ });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

describe("RepCard: the number keys act only inside the card", () => {
  it("ignores a key pressed with the focus elsewhere on the page", () => {
    const onAnswer = vi.fn();
    render(
      <>
        <a href="/pricing">Pricing</a>
        <RepCard rep={rep} onAnswer={onAnswer} onNext={() => {}} />
      </>
    );
    const link = screen.getByRole("link", { name: "Pricing" });
    link.focus();
    fireEvent.keyDown(link, { key: "2" });
    fireEvent.keyDown(document.body, { key: "2" });
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("answers when the key is pressed with the focus inside the card", () => {
    const onAnswer = vi.fn();
    render(<RepCard rep={rep} onAnswer={onAnswer} onNext={() => {}} />);
    const option = screen.getByRole("button", { name: /443/ });
    option.focus();
    fireEvent.keyDown(option, { key: "2" });
    expect(onAnswer).toHaveBeenCalledWith({ correct: false, picked: 1 });
  });

  it("does nothing with the keys when they are switched off", () => {
    const onAnswer = vi.fn();
    render(<RepCard rep={rep} onAnswer={onAnswer} onNext={() => {}} keyboard={false} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /443/ }), { key: "1" });
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe("RepCard: what a screen reader is given", () => {
  it("names the group of answers by the question", () => {
    render(<RepCard rep={rep} onAnswer={() => {}} onNext={() => {}} />);
    expect(screen.getByRole("group", { name: "Which port does SSH use?" })).toBeInTheDocument();
    // Plain buttons: choosing is answering, which a radio button does not do.
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("says in words which answer is correct and which was chosen", () => {
    render(<RepCard rep={rep} onAnswer={() => {}} onNext={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /25/ }));
    // The test library closes up the space after the colon; a browser keeps it.
    expect(screen.getByRole("button", { name: /^Correct answer: ?22$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Your answer, which is incorrect: ?25$/ })).toBeDisabled();
  });

  it("reads the verdict with the Continue button, and puts the focus on it", () => {
    render(<RepCard rep={rep} onAnswer={() => {}} onNext={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /25/ }));
    const next = screen.getByRole("button", { name: /Continue/ });
    expect(next).toHaveFocus();
    expect(next).toHaveAccessibleDescription(
      "Incorrect. The correct answer is 22. SSH uses port 22. It replaced Telnet, which uses port 23."
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("takes the focus on arrival only when it is asked to", () => {
    const { unmount } = render(<RepCard rep={rep} onAnswer={() => {}} onNext={() => {}} />);
    expect(document.body).toHaveFocus();
    unmount();
    render(<RepCard rep={rep} onAnswer={() => {}} onNext={() => {}} takeFocus />);
    expect(screen.getByText("Which port does SSH use?")).toHaveFocus();
  });

  it("prints the kind of question only where it changes what to expect", () => {
    const { unmount } = render(<RepCard rep={rep} onAnswer={() => {}} onNext={() => {}} />);
    expect(screen.queryByText("Recall question")).toBeNull();
    expect(screen.queryByText("Recall")).toBeNull();
    unmount();
    render(<RepCard rep={{ ...rep, tier: "exam", label: "Exam style" }} onAnswer={() => {}} onNext={() => {}} />);
    expect(screen.getByText("Exam-style question")).toBeInTheDocument();
  });

  it("prints one small line above a question at most: a preface takes the kind's place", () => {
    render(
      <RepCard
        rep={{ ...rep, tier: "exam", label: "Exam style" }}
        onAnswer={() => {}}
        onNext={() => {}}
        preface="2.6 Threats of AI"
      />
    );
    expect(screen.getByText("2.6 Threats of AI")).toBeInTheDocument();
    expect(screen.queryByText("Exam-style question")).toBeNull();
  });

  it("leaves the kind out where the page says that every question is of one kind", () => {
    render(
      <RepCard
        rep={{ ...rep, tier: "exam", label: "Exam style" }}
        onAnswer={() => {}}
        onNext={() => {}}
        showKind={false}
      />
    );
    expect(screen.queryByText("Exam-style question")).toBeNull();
  });
});
