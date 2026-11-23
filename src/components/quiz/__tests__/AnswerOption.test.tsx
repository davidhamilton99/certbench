// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnswerOption } from "../AnswerOption";

/** The key box: the square that prints the answer's letter. */
const keyBox = (name: string) => screen.getByRole("button", { name }).querySelector("span[aria-hidden]");

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
