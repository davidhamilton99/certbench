// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReviewedAnswers } from "@/components/quiz/ReviewedAnswers";

const OPTIONS = ["Wireshark", "Nmap", "Nessus", "Netcat"];

const rows = (container: HTMLElement) => [...container.querySelectorAll("p")].map((p) => p.textContent);

describe("ReviewedAnswers", () => {
  // The list of missed questions (/review) prints a question's answers in their
  // stored order with its whole explanation under them.
  it("letters the answers in their stored order, so that 'option C' in an explanation names the answer lettered C", () => {
    const { container } = render(<ReviewedAnswers options={OPTIONS} correctIndex={2} />);
    expect(rows(container)).toEqual(["A. Wireshark", "B. Nmap", "C. Correct answer: Nessus", "D. Netcat"]);
  });

  it("marks the answer that was given, in words, where it was incorrect", () => {
    const { container } = render(<ReviewedAnswers options={OPTIONS} correctIndex={2} selectedIndex={0} />);
    expect(rows(container)).toEqual(["A. Your answer: Wireshark", "B. Nmap", "C. Correct answer: Nessus", "D. Netcat"]);
  });

  it("marks a correct answer once, as the correct answer", () => {
    const { container } = render(<ReviewedAnswers options={OPTIONS} correctIndex={2} selectedIndex={2} />);
    expect(rows(container)[2]).toBe("C. Correct answer: Nessus");
    expect(container).not.toHaveTextContent("Your answer");
  });

  it("letters the answers by the place they were shown in, when an order is given", () => {
    const { container } = render(<ReviewedAnswers options={OPTIONS} correctIndex={2} selectedIndex={3} order={[3, 2, 0, 1]} />);
    expect(rows(container)).toEqual(["A. Your answer: Netcat", "B. Correct answer: Nessus", "C. Wireshark", "D. Nmap"]);
  });

  it("prints its letters as text that a screen reader reads, and can be printed by a server page", () => {
    const html = renderToStaticMarkup(<ReviewedAnswers options={OPTIONS} correctIndex={0} />);
    expect(html).toContain("Correct answer: ");
    expect(html).not.toContain("aria-hidden");
    expect((html.match(/<p /g) ?? []).length).toBe(4);
  });
});
