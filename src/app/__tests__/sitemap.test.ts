import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/seo/objective-data", () => ({
  listObjectivePages: async () => [{ cert: "security-plus-sy0-701", code: "1-2" }],
}));
vi.mock("@/server/seo/readiness-check-data", () => ({
  listReadinessCheckCerts: async () => [{ cert: "security-plus-sy0-701" }],
}));

import sitemap from "../sitemap";

const paths = (urls: { url: string }[]) => urls.map((u) => u.url.replace("https://certbench.dev", ""));

describe("sitemap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists the pages worth finding in search", async () => {
    const urls = paths(await sitemap());
    expect(urls).toEqual(
      expect.arrayContaining([
        "",
        "/security-plus-practice-test",
        "/a-plus-core-1-pbq-examples",
        "/a-plus-core-2-pbq-examples",
        "/security-plus-sy0-801-vs-sy0-701",
        "/security-plus-sy0-801",
        "/security-plus-sy0-801-ai-practice-questions",
        "/objectives/security-plus-sy0-701",
        "/objectives/security-plus-sy0-701/1-2",
        "/tools/subnet-calculator",
        "/readiness-check/security-plus-sy0-701",
      ])
    );
  });

  it("leaves out the app screens, which are noindex", async () => {
    const urls = paths(await sitemap());
    expect(urls.filter((u) => /^\/(path|login|register|start)(\/|$)/.test(u))).toEqual([]);
  });

  it("has no duplicate URLs", async () => {
    const urls = paths(await sitemap());
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("never claims a page changed just because the sitemap was requested", async () => {
    for (const { url, lastModified } of await sitemap()) {
      expect(new Date(lastModified!).getFullYear(), url).toBeLessThan(2030);
    }
  });
});
