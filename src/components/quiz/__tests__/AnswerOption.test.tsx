// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnswerOption } from "../AnswerOption";

/** The key box: the square that prints the answer's letter. */
const keyBox = (name: string | RegExp) => screen.getByRole("button", { name }).querySelector("span[aria-hidden]");

describe("an answer under a Windows contrast theme", () => {
  it("fills the chosen answer's key box with the theme's highlight colour, which the theme keeps", () => {
    render(
      <>
        <AnswerOption marker="A" state="chosen">
          Port 22
        </AnswerOption>
        <AnswerOption marker="B">Port 23</AnswerOption>
      </>
    );
    // The key box is hidden from a screen reader, so the answer is named by its words.
    const chosen = keyBox("Port 22")?.className ?? "";
    expect(chosen).toContain("forced-colors:bg-[Highlight]");
    expect(chosen).toContain("forced-colors:text-[HighlightText]");
    // Without this the theme would replace the fill with its own background.
    expect(chosen).toContain("forced-colors:forced-color-adjust-none");
    // The frame is drawn by the global rule, which finds the chosen answer by this attribute.
    expect(screen.getByRole("button", { name: "Port 22" })).toHaveAttribute("data-state", "chosen");

    const idle = keyBox("Port 23")?.className ?? "";
    expect(idle).not.toContain("forced-colors:");
  });
});

/** The marks drawn in an element, by kind: "check" or "x". */
const marks = (el: Element | null | undefined) =>
  [...(el?.querySelectorAll("svg") ?? [])].map((svg) => (/lucide-check\b/.test(svg.getAttribute("class") ?? "") ? "check" : "x"));

describe("a marked answer whose letter is named in the explanation beside it", () => {
  it("keeps its letter in the key box, in the mark's colours, and draws the check at the end of the answer", () => {
    render(
      <AnswerOption marker="B" state="correct" keepMarker srPrefix="Correct answer: ">
        Port 22
      </AnswerOption>
    );
    const box = keyBox(/^Correct answer: ?Port 22$/);
    expect(box).toHaveTextContent(/^B$/);
    expect(marks(box)).toEqual([]);
    expect(box?.className).toContain("bg-success");
    const answer = screen.getByRole("button", { name: /^Correct answer: ?Port 22$/ });
    // Never colour alone: the check is drawn, last in the row and hidden from a screen reader, which hears the words.
    expect(marks(answer)).toEqual(["check"]);
    expect(answer.lastElementChild?.tagName.toLowerCase()).toBe("svg");
    expect(answer.lastElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the letter of a wrong answer, with the cross at its end", () => {
    render(
      <AnswerOption marker="A" state="incorrect" keepMarker srPrefix="Your answer, which is incorrect: ">
        Port 23
      </AnswerOption>
    );
    const box = keyBox(/^Your answer, which is incorrect: ?Port 23$/);
    expect(box).toHaveTextContent(/^A$/);
    expect(box?.className).toContain("bg-destructive");
    expect(marks(screen.getByRole("button", { name: /^Your answer, which is incorrect: ?Port 23$/ }))).toEqual(["x"]);
  });

  it("draws no mark at the end of an answer that is not correct or chosen wrongly", () => {
    render(
      <>
        <AnswerOption marker="C" state="dimmed" keepMarker>
          Port 25
        </AnswerOption>
        <AnswerOption marker="D" state="chosen" keepMarker>
          Port 53
        </AnswerOption>
      </>
    );
    expect(marks(screen.getByRole("button", { name: "Port 25" }))).toEqual([]);
    expect(keyBox("Port 25")).toHaveTextContent(/^C$/);
    expect(marks(screen.getByRole("button", { name: "Port 53" }))).toEqual([]);
  });

  it("is drawn as before without keepMarker: the check takes the letter's place, and nothing is added at the end", () => {
    render(
      <AnswerOption marker="B" state="correct" srPrefix="Correct answer: ">
        Port 22
      </AnswerOption>
    );
    const box = keyBox(/^Correct answer: ?Port 22$/);
    expect(box).not.toHaveTextContent("B");
    expect(marks(box)).toEqual(["check"]);
    expect(marks(screen.getByRole("button", { name: /^Correct answer: ?Port 22$/ }))).toEqual(["check"]);
  });
});
