// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

import { SampleQuestion } from "../SampleQuestion";

const question = {
  questionText: "Which part of the CIA triad does a DDoS attack hit?",
  options: ["Confidentiality", "Availability", "Integrity"],
  correctIndex: 1,
  explanation: "A DDoS attack takes a service offline, so it hits availability.",
};

beforeEach(() => track.mockClear());

describe("SampleQuestion", () => {
  it("has the answer and explanation in the server-rendered page", () => {
    const html = renderToStaticMarkup(<SampleQuestion number={1} question={question} />);
    expect(html).toContain("Answer: B");
    expect(html).toContain("A DDoS attack takes a service offline");
    // Behind a disclosure, not open: a visitor can still try the question first.
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
  });

  it("grades a pick, replaces the disclosure with the result, and records the answer", () => {
    render(<SampleQuestion number={1} question={question} />);
    expect(screen.getByText("Show the answer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Availability/ }));

    expect(screen.getByText(/^Correct\./)).toBeInTheDocument();
    expect(screen.queryByText("Show the answer")).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("sample_question_answered", { correct: true });
  });

  it("tells a wrong pick it's wrong", () => {
    render(<SampleQuestion number={1} question={question} />);
    fireEvent.click(screen.getByRole("radio", { name: /Integrity/ }));
    expect(screen.getByText(/^Not quite\./)).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("sample_question_answered", { correct: false });
  });
});
