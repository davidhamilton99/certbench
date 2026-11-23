// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import {
  A_PLUS_CORE1_CERT,
  A_PLUS_CORE2_CERT,
  COMPTIA_URLS,
  EXAM_FACTS_CHECKED,
  NETWORK_PLUS_CERT,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_CERT,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
} from "@/lib/seo/exam-versions";

const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("ExamVersionNote", () => {
  it("names the source of the Security+ dates and the day they were last checked", () => {
    const { container } = render(<ExamVersionNote certSlugs={[SECURITY_PLUS_CERT]} />);
    const note = text(container);
    expect(note).toContain("These questions are written to SY0-701 (Security+ V7).");
    expect(note).toContain("SY0-701 stays open until June 11, 2027 in English.");
    expect(note).toContain(
      `These dates are from CompTIA's Security+ V7 page and Security+ V8 page, and were last checked on ${EXAM_FACTS_CHECKED}.`
    );
    expect(screen.getByRole("link", { name: "Security+ V7 page" })).toHaveAttribute("href", COMPTIA_URLS.securityV7);
    expect(screen.getByRole("link", { name: "Security+ V8 page" })).toHaveAttribute("href", COMPTIA_URLS.securityV8);
  });

  it("leads to the newer version's pages", () => {
    render(<ExamVersionNote certSlugs={[SECURITY_PLUS_CERT]} />);
    expect(screen.getByRole("link", { name: "SY0-801" })).toHaveAttribute("href", SY0_801_PATH);
    expect(screen.getByRole("link", { name: "which version to take" })).toHaveAttribute("href", SECURITY_PLUS_VERSIONS_PATH);
    expect(screen.getByRole("link", { name: "its own study path" })).toHaveAttribute("href", `/path/${SY0_801_CERT}`);
    expect(screen.getByRole("link", { name: "free practice test" })).toHaveAttribute("href", SY0_801_PRACTICE_PATH);
  });

  it("underlines every link in the note, and opens CompTIA's pages in a new tab safely", () => {
    render(<ExamVersionNote certSlugs={[SECURITY_PLUS_CERT]} />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(6);
    for (const link of links) expect(link).toHaveClass("cb-link");
    for (const link of links.filter((a) => a.getAttribute("href")?.startsWith("https://"))) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  });

  it("names both A+ exam pages for a page about both cores, and one for a page about one", () => {
    const { unmount } = render(<ExamVersionNote certSlugs={[A_PLUS_CORE1_CERT, A_PLUS_CORE2_CERT]} />);
    expect(screen.getByRole("link", { name: "Core 1 exam page" })).toHaveAttribute("href", COMPTIA_URLS.aPlusCore1);
    expect(screen.getByRole("link", { name: "Core 2 exam page" })).toHaveAttribute("href", COMPTIA_URLS.aPlusCore2);
    unmount();

    const { container } = render(<ExamVersionNote certSlugs={[A_PLUS_CORE2_CERT]} />);
    expect(text(container)).toContain("These questions are written to 220-1202, the current A+ Core 2 exam.");
    expect(screen.getByRole("link", { name: "CompTIA" })).toHaveAttribute("href", COMPTIA_URLS.aPlusCore2);
  });

  it("says nothing for an exam with nothing to flag", () => {
    const { container } = render(<ExamVersionNote certSlugs={[NETWORK_PLUS_CERT]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is set at the size of a note, in a box no wider than its measure, with a caller's spacing", () => {
    const { container } = render(<ExamVersionNote certSlugs={[SECURITY_PLUS_CERT]} className="mt-8" />);
    const box = container.firstElementChild!;
    expect(box).toHaveClass("cb-measure", "mt-8", "text-left");
    // The rule down the left edge is straight: the corners on that edge are square.
    expect(box).toHaveClass("border-l-2", "rounded-r-lg");
    expect(box.className).not.toMatch(/rounded-(?:lg|xl|2xl)(?:\s|$)/);
    expect(box.querySelector("p")).toHaveClass("text-small");
  });
});
