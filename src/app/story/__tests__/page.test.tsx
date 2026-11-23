// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

const claim = vi.hoisted(() => ({ value: null as null | { userId: string; certId: string; expiresAt: number } }));
vi.mock("@/server/story/story-token", () => ({ verifyStoryToken: () => claim.value }));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const cert = vi.hoisted(() => ({ value: null as null | { name: string; slug: string } }));
vi.mock("@/server/data/certifications", () => ({ getCertification: async () => cert.value }));
vi.mock("@/server/data/profiles", () => ({ getProfile: async () => ({ displayName: "Sam Rivera" }) }));
vi.mock("@/server/share/readiness-token", () => ({ shareName: (name: string) => `${name.split(" ")[0]} R.` }));

/** The form has a test of its own. Here it prints what the page hands it. */
vi.mock("@/components/story/StoryForm", () => ({
  StoryForm: (props: Record<string, unknown>) => <pre data-form>{JSON.stringify(props)}</pre>,
}));

import * as route from "../page";

type Query = { t?: string; r?: string };

async function served(query: Query): Promise<Document> {
  const html = renderToString(await route.default({ searchParams: Promise.resolve(query) }));
  return new DOMParser().parseFromString(html, "text/html");
}

const formProps = (doc: Document) => JSON.parse(doc.querySelector("[data-form]")!.textContent!);

beforeEach(() => {
  claim.value = { userId: "u1", certId: "c1", expiresAt: Date.now() + 1000 };
  cert.value = { name: "CompTIA Security+", slug: "security-plus-sy0-701" };
});

describe("the page the post-exam email leads to", () => {
  it("has the wordmark in a header and one main region that the skip link can move to", async () => {
    const doc = await served({ t: "token" });
    expect(doc.querySelector("header a")?.getAttribute("aria-label")).toBe("CertBench home");
    const mains = doc.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    expect(mains[0].id).toBe("main-content");
    expect(mains[0].getAttribute("tabindex")).toBe("-1");
    // The wordmark is outside the main region, so the skip link passes it.
    expect(mains[0].querySelector('a[aria-label="CertBench home"]')).toBeNull();
  });

  it("hands the form the exam, the way back to its study path, the name and the answer pressed in the email", async () => {
    expect(formProps(await served({ t: "token", r: "pass" }))).toEqual({
      token: "token",
      certName: "CompTIA Security+",
      pathHref: "/path/security-plus-sy0-701",
      defaultName: "Sam R.",
      preset: true,
    });
    expect(formProps(await served({ t: "token", r: "fail" })).preset).toBe(false);
    expect(formProps(await served({ t: "token" })).preset).toBeNull();
  });

  it("leads to the exam list when the exam has no study path, or could not be read", async () => {
    cert.value = { name: "An older exam", slug: "not-a-study-path" };
    expect(formProps(await served({ t: "token" })).pathHref).toBe("/start");
    cert.value = null;
    expect(formProps(await served({ t: "token" }))).toMatchObject({ certName: "Your exam", pathHref: "/start" });
  });

  it("says that the link has expired, as the page's title, and leads to the study path", async () => {
    claim.value = null;
    const doc = await served({ t: "stale" });
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("h1")?.textContent).toBe("This link has expired.");
    expect(doc.querySelector("main")?.textContent).toContain("Please sign in. Your study path is where you left it.");
    expect(doc.querySelector('main a[href="/start"]')?.textContent).toBe("Go to the study path");
    expect(doc.querySelector("[data-form]")).toBeNull();
  });

  it("is kept out of search, because its address carries a personal token", () => {
    expect(route.metadata.robots).toEqual({ index: false, follow: false });
  });

  it("does not force what reading the address already does", () => {
    // The page reads `searchParams`, so it is drawn for each request without being told to.
    expect("dynamic" in route).toBe(false);
  });
});
