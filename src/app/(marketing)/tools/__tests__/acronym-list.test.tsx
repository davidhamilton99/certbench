// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

// A server render only: nothing here signs anyone in, counts anything or reaches an API.
vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));

import { acronyms } from "@/data/reference/security-plus-sy0-701/acronyms";
import AcronymsQuizPage, { metadata } from "../security-plus-acronyms-quiz/page";

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const COUNT = acronyms.entries.length;

/**
 * The list carries one meaning for each acronym, where an acronym can have
 * several (the data file's own header names MAC, PAM, RBAC, SAN, STP and RA).
 * So the page never calls it the full list, and says what it holds.
 */
describe("the Security+ acronym list", () => {
  const doc = new DOMParser().parseFromString(renderToString(<AcronymsQuizPage />), "text/html");
  // What a visitor reads: the structured data is left out.
  doc.querySelectorAll("script").forEach((s) => s.remove());
  const body = text(doc.body);

  it("is never called the full list, or all of a list, in the page or its description", () => {
    expect(body).not.toMatch(/\bfull (?:list|Security\+ acronym list)\b|\ball \d+\b|\bcovers the full\b/i);
    expect(String(metadata.description)).not.toMatch(/\bfull\b|\ball \d+\b/i);
  });

  it("says that it gives one meaning for each acronym, and whose choice that meaning is", () => {
    expect(body).toContain(
      "The list gives one meaning for each acronym, and where an acronym has more than one, it gives the one that CertBench judged most useful for the exam."
    );
    expect(String(metadata.description)).toBe(
      `This page lists ${COUNT} Security+ SY0-701 acronyms, with one meaning for each, and a quiz that marks each answer as you give it. The first round is free and needs no account. A free account saves your progress.`
    );
  });

  it("gives the list's own count, and no count of CompTIA's, which the facts file does not hold", () => {
    expect(body).toContain(`The list has ${COUNT} Security+ SY0-701 acronyms`);
    expect(body).not.toMatch(/CompTIA's exam objectives list about/);
  });
});
