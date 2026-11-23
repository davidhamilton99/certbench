// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

// Server render only: nothing here signs anyone in, reads the database or reaches an API.
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const HUBS = vi.hoisted(() => {
  const domain = (number: string, title: string, weight: number, objectives: { code: string; title: string; topic: string }[]) => ({
    number,
    title,
    weight,
    objectives: objectives.map((o) => ({ ...o, slug: o.code.replace(".", "-") })),
  });
  return {
    "a-plus-core1-220-1201": {
      certSlug: "a-plus-core1-220-1201",
      certName: "CompTIA A+ Core 1",
      shortCertName: "A+ Core 1",
      examCode: "220-1201",
      objectiveCount: 27,
      domains: [domain("2.0", "Networking", 23, [{ code: "2.1", title: "TCP and UDP ports, protocols and their purposes", topic: "Ports and protocols" }])],
    },
    "security-plus-sy0-701": {
      certSlug: "security-plus-sy0-701",
      certName: "CompTIA Security+",
      shortCertName: "Security+",
      examCode: "SY0-701",
      objectiveCount: 1,
      domains: [domain("1.0", "General Security Concepts", 12, [{ code: "1.1", title: "Compare and contrast various types of security controls", topic: "Security controls" }])],
    },
  } as Record<string, unknown>;
});
vi.mock("@/server/seo/objective-data", () => ({
  loadObjectiveHub: async (cert: string) => HUBS[cert] ?? null,
  loadObjectivePage: async () => null,
  listObjectivePages: async () => [],
}));

import ObjectiveHubPage, { generateMetadata } from "../[cert]/page";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
const OWN_WORDING =
  "The objective names and descriptions on this page are CertBench's own wording, and CompTIA's objectives document has the official wording.";

async function served(cert: string): Promise<Document> {
  return new DOMParser().parseFromString(renderToString(await ObjectiveHubPage({ params: Promise.resolve({ cert }) })), "text/html");
}

describe("an exam's objectives page", () => {
  // The A+ objectives were written for the site in CertBench's own words, so the page says whose wording they are.
  it("says on the A+ pages that the objective names are CertBench's own wording, and not on Security+", async () => {
    expect(text((await served("a-plus-core1-220-1201")).body)).toContain(OWN_WORDING);
    expect(text((await served("security-plus-sy0-701")).body)).not.toContain(OWN_WORDING);
  });

  it("describes itself in a sentence, and does not call the objectives it lists all of the exam's", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ cert: "a-plus-core1-220-1201" }) });
    expect(meta.description).toBe(
      "This page lists 27 CompTIA A+ Core 1 220-1201 exam objectives by domain and exam weight, each with original practice questions and full explanations. The pages are free, and no account is needed."
    );
  });

  it("names the free labs by the house word, with the count from the product's constant", async () => {
    const doc = await served("security-plus-sy0-701");
    expect(text(doc.body)).toContain(`${FREE_LAB_COUNT} free hands-on labs, three of them with no account`);
    expect(text(doc.body)).not.toMatch(/interactive PBQs/);
  });
});
