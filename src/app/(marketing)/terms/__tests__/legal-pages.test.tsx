// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { PASS_GUARANTEE_HREF } from "@/lib/pricing/guarantee";
import PrivacyPage from "../../privacy/page";
import TermsPage from "../page";

/** A page as the server sends it. */
function served(Page: () => React.ReactElement): Document {
  return new DOMParser().parseFromString(renderToString(<Page />), "text/html");
}

const text = (node: ParentNode) => (node.textContent ?? "").replace(/\s+/g, " ").trim();

/** The numbered clause whose heading begins with `start`: its heading and everything under it. */
function clause(doc: Document, start: string): string {
  const heading = [...doc.querySelectorAll("h2")].find((h) => (h.textContent ?? "").startsWith(start));
  if (!heading) throw new Error(`no clause begins with "${start}"`);
  return text(heading.closest("section")!);
}

const PAGES = [
  { name: "the Terms of Service", doc: served(TermsPage), title: "Terms of Service", clauses: 19 },
  { name: "the Privacy Policy", doc: served(PrivacyPage), title: "Privacy Policy", clauses: 16 },
];

describe.each(PAGES)("$name", ({ doc, title, clauses }) => {
  it("has one title, and its numbered clauses as headings under it", () => {
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("h1")?.textContent).toBe(title);
    const headings = [...doc.querySelectorAll("h2")].map((h) => h.textContent ?? "");
    expect(headings).toHaveLength(clauses);
    headings.forEach((heading, i) => expect(heading.startsWith(`${i + 1}. `), heading).toBe(true));
  });

  it("states its two dates as sentences, with nothing joined by a dot", () => {
    expect(text(doc.body)).toContain("Effective date: March 14, 2026. Last updated: November 22, 2026.");
    expect(doc.body.textContent).not.toContain(String.fromCharCode(0xb7));
  });

  it("underlines every link, because each one stands inside a sentence", () => {
    const links = [...doc.querySelectorAll("a")];
    expect(links.length).toBeGreaterThan(5);
    expect(links.filter((a) => !a.classList.contains("cb-link")).map((a) => a.textContent)).toEqual([]);
  });

  it("draws its content only: the public frame supplies the header, the main region and the footer", () => {
    expect(doc.querySelector("main")).toBeNull();
    expect(doc.querySelector("footer")).toBeNull();
    expect(doc.querySelector("nav")).toBeNull();
    // The link that went back a page did nothing when the page was opened in a new tab.
    expect(doc.querySelector("button")).toBeNull();
  });

  it("describes nothing that CertBench no longer offers as a present feature", () => {
    const body = text(doc.body);
    expect(body).not.toMatch(/AI-powered question generation/i);
    expect(body).not.toMatch(/AI (?:question |quiz )?generation/i);
    expect(body).not.toMatch(/adaptive/i);
    expect(body).not.toMatch(/uses artificial intelligence/i);
    expect(body).not.toMatch(/are sent to our AI provider/i);
  });
});

describe("the Terms of Service", () => {
  const doc = PAGES[0].doc;

  it("describes the Service as what exists today", () => {
    expect(clause(doc, "3. ")).toContain(
      "CertBench is a certification study platform that provides a study path for each exam, practice questions, hands-on labs, timed practice exams, spaced review, and community study sets for IT certification preparation."
    );
  });

  it("speaks of the retired question tool in the past tense, and keeps the cautions for the study sets made with it", () => {
    const section = clause(doc, "6. ");
    expect(section).toContain("Until November 2026, CertBench offered a tool");
    expect(section).toContain("That tool has been retired, and CertBench no longer generates questions from uploaded materials.");
    expect(section).toContain("Study sets that were made with the tool are kept in the accounts of the members who made them.");
    expect(section).toContain("AI-generated content may contain inaccuracies, errors, or outdated information");
    expect(text(doc.body)).not.toContain("Anthropic");
  });

  it("keeps the anchor that every statement of the pass guarantee links to", () => {
    const id = PASS_GUARANTEE_HREF.split("#")[1];
    expect(text(doc.getElementById(id)!)).toMatch(/^Pass guarantee\./);
  });
});

describe("the Privacy Policy", () => {
  const doc = PAGES[1].doc;

  it("says that uploaded study materials are no longer sent to an AI provider", () => {
    const section = clause(doc, "4. ");
    expect(section).toContain(
      "When a member used that tool, the uploaded study materials were sent to our AI provider at the time, Anthropic, for processing."
    );
    expect(section).toContain("The tool has been retired, and uploaded study materials are no longer sent to an AI provider.");
    expect(section).toContain("Study sets that were made with the tool remain stored with the accounts of the members who made them.");
  });

  it("lists only the service providers that receive data today", () => {
    const section = [...doc.querySelectorAll("h2")].find((h) => (h.textContent ?? "").startsWith("6. "))!.closest("section")!;
    const providers = [...section.querySelectorAll("li strong")].map((s) => s.textContent);
    expect(providers).toEqual(["Supabase", "Vercel", "Stripe", "PostHog", "Resend", "Google"]);
  });

  it("names the purposes that exist today, and no longer sending materials for AI processing", () => {
    const section = clause(doc, "2. ");
    expect(section).toContain(
      "authenticate your account, deliver study content, calculate readiness scores, record your progress on your study path, and schedule your spaced review"
    );
    expect(section).not.toMatch(/AI/);
  });

  it("names the old AI provider only in the clause about the retired tool", () => {
    const outside = [...doc.querySelectorAll("section")]
      .filter((s) => !(s.querySelector("h2")?.textContent ?? "").startsWith("4. "))
      .map(text)
      .filter((t) => t.includes("Anthropic"));
    expect(outside).toEqual([]);
  });
});
