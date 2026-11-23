// @vitest-environment jsdom
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

/**
 * Who the request is from, and what their account holds, as the page where an
 * exam is chosen reads them on the server.
 */
const account = vi.hoisted(() => ({
  user: null as null | { id: string },
  /** The exams the account is enrolled in, oldest first; an Error when they cannot be read. */
  enrollments: [] as { certificationId: string }[] | Error,
  certifications: [
    { id: "cert-sec", slug: "security-plus-sy0-701" },
    { id: "cert-net", slug: "network-plus-n10-009" },
    // An exam that the database lists and that has no study path.
    { id: "cert-other", slug: "cysa-plus-cs0-003" },
  ],
  /** How many times the page asked who is signed in. */
  asked: 0,
}));
vi.mock("@/server/auth", () => ({
  getOptionalUser: async () => {
    account.asked++;
    return { db: {}, user: account.user };
  },
}));
vi.mock("@/server/data/enrollments", () => ({
  listEnrollments: async () => {
    if (account.enrollments instanceof Error) throw account.enrollments;
    return account.enrollments;
  },
}));
vi.mock("@/server/data/certifications", () => ({
  listActiveCertifications: async () => account.certifications,
}));

/** What `redirect()` throws here, as the framework's own does, with where it leads. */
class Redirected extends Error {
  constructor(readonly to: string) {
    super(`redirect to ${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirected(to);
  },
  notFound: () => {
    throw new Error("not found");
  },
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

// The study path's page: its questions come from the database and its app has
// tests of its own, so here the page is given a bank and a first step, and what
// it hands to the app is recorded.
const path = vi.hoisted(() => ({
  bank: null as null | { structure: unknown; questions: unknown[] },
  warmup: null as null | { stop: unknown; reps: unknown[] },
  /** What the page asked the first step to be built from. */
  built: [] as Record<string, unknown>[],
  /** What the page handed to the app. */
  app: [] as Record<string, unknown>[],
}));
vi.mock("@/server/path/bank", () => ({ loadPathBank: vi.fn(async () => path.bank) }));
vi.mock("@/server/path/build-stop", () => ({
  buildStop: vi.fn((input: Record<string, unknown>) => {
    path.built.push(input);
    return path.warmup;
  }),
}));
vi.mock("@/components/path/PathApp", () => ({
  PathApp: (props: Record<string, unknown>) => {
    path.app.push(props);
    return null;
  },
}));

import { FREE_LAB_COUNT, freeLabs } from "@/core/path/free-labs";
import { PATH_CERTS } from "@/core/path/types";
import { pbqRegistry } from "@/data/pbq";
import { freeOnPublicPages } from "../path/[cert]/free-parts";
import * as pathPage from "../path/[cert]/page";
import StartPage from "../start/page";

const APP = join(process.cwd(), "src", "app");
const PUBLIC = join(APP, "(marketing)");
/** Whether a public page exists at an address such as "/security-plus-practice-test". */
const pageExists = (href: string) => existsSync(join(PUBLIC, href.replace(/^\//, ""), "page.tsx"));

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** The page where an exam is chosen, as the server's HTML for a request with these parameters. */
async function startPage(searchParams: { pick?: string; upgraded?: string } = {}): Promise<HTMLElement> {
  const root = document.createElement("div");
  root.innerHTML = renderToString(await StartPage({ searchParams: Promise.resolve(searchParams) }));
  return root;
}

/** Where the page sends the request on to, or null when it answers with the list. */
async function sentTo(searchParams: { pick?: string; upgraded?: string } = {}): Promise<string | null> {
  try {
    await StartPage({ searchParams: Promise.resolve(searchParams) });
    return null;
  } catch (err) {
    if (err instanceof Redirected) return err.to;
    throw err;
  }
}

/** The study paths that the list's rows lead to, in the order of the rows. */
const rowLinks = (root: HTMLElement) =>
  [...root.querySelectorAll("ul a")].map((link) => link.getAttribute("href"));

beforeEach(() => {
  account.user = null;
  account.enrollments = [];
  account.asked = 0;
  path.bank = null;
  path.warmup = null;
  path.built = [];
  path.app = [];
});

describe("what each exam gives away on its public pages", () => {
  it("names a public practice exam page of its own for every exam that has a study path", () => {
    const pages = PATH_CERTS.map((cert) => freeOnPublicPages(cert).examHref);
    expect(pages).toEqual([
      "/security-plus-practice-test",
      "/security-plus-sy0-801-practice-test",
      "/network-plus-practice-test",
      "/a-plus-core-1-practice-test",
      "/a-plus-core-2-practice-test",
    ]);
    for (const href of pages) expect(pageExists(href), href).toBe(true);
  });

  it("names the labs that the exam's public page of labs itself offers free", () => {
    const withLabs = PATH_CERTS.filter((cert) => freeOnPublicPages(cert).labsHref !== null);
    expect(withLabs).toEqual([
      "security-plus-sy0-701",
      "network-plus-n10-009",
      "a-plus-core1-220-1201",
      "a-plus-core2-220-1202",
    ]);
    for (const cert of withLabs) {
      const free = freeOnPublicPages(cert);
      expect(pageExists(free.labsHref!), free.labsHref!).toBe(true);
      // The same labs, from the same call, as the public page lists.
      expect(free.labIds).toEqual(freeLabs(pbqRegistry[cert]).map((lab) => lab.id));
      expect(free.labIds).toHaveLength(FREE_LAB_COUNT);
    }
  });

  it("claims no free labs for an exam that has no public page of labs", () => {
    expect(freeOnPublicPages("security-plus-sy0-801")).toEqual({
      examHref: "/security-plus-sy0-801-practice-test",
      labsHref: null,
      labIds: [],
    });
  });
});

describe("the study path's page", () => {
  it("answers any other address under /path/ as not found, without running the page for it", () => {
    expect(pathPage.dynamicParams).toBe(false);
    expect(pathPage.generateStaticParams()).toEqual(PATH_CERTS.map((cert) => ({ cert })));
  });

  it("puts the exam's code in the title where an exam has two versions, so that the two can be told apart", async () => {
    const title = async (cert: string) =>
      (await pathPage.generateMetadata({ params: Promise.resolve({ cert }) })).title;
    expect(await title("security-plus-sy0-701")).toBe("Security+ SY0-701 study path");
    expect(await title("security-plus-sy0-801")).toBe("Security+ SY0-801 study path");
    expect(await title("network-plus-n10-009")).toBe("Network+ study path");
    expect(await title("a-plus-core1-220-1201")).not.toMatch(/220-1201/);
    // Every study path has a title of its own.
    const titles = await Promise.all(PATH_CERTS.map(title));
    expect(new Set(titles).size).toBe(PATH_CERTS.length);
  });

  it("stays out of search: the practice exam and objective pages are the ones that should be found", async () => {
    for (const cert of PATH_CERTS) {
      const metadata = await pathPage.generateMetadata({ params: Promise.resolve({ cert }) });
      expect(metadata.robots, cert).toMatchObject({ index: false });
      expect(metadata.alternates?.canonical, cert).toBe(`/path/${cert}`);
    }
  });

  describe("as the server draws it", () => {
    const structure = {
      certSlug: "network-plus-n10-009",
      examName: "Network+",
      examCode: "N10-009",
      domains: [
        { number: "1.0", title: "Networking Concepts", weight: 100, objectives: [{ code: "1.1", title: "The OSI model" }] },
      ],
    };
    const page = (cert: string) => pathPage.default({ params: Promise.resolve({ cert }) });

    it("checks before first paint whether this learner's own screen is on its way, and then draws the app", async () => {
      path.bank = { structure, questions: [{}, {}, {}] };
      path.warmup = { stop: { id: "warmup", index: 0, kind: "warmup" }, reps: [{ id: "a|1.1|w1" }] };
      const html = renderToString(await page("network-plus-n10-009"));

      // The inline script comes with the page's HTML and names this exam's copy on the device.
      expect(html).toMatch(/^<script>try\{/);
      expect(html).toContain("cb_path_network-plus-n10-009");
      expect(html).toContain("data-path-returning");

      // The first step is the one every first-time visitor is given: nothing seen and nothing missed.
      expect(path.built).toHaveLength(1);
      expect(path.built[0]).toMatchObject({ index: 0, seen: [], missed: [] });

      // The app is handed the exam, its first step, and what the exam gives away on its public pages.
      expect(path.app).toHaveLength(1);
      expect(path.app[0]).toMatchObject({
        cert: "network-plus-n10-009",
        structure,
        warmup: path.warmup,
        questionCount: 3,
        free: freeOnPublicPages("network-plus-n10-009"),
      });
      expect((path.app[0].plan as { stops: { kind: string }[] }).stops[0].kind).toBe("warmup");
    });

    it("answers not found for an exam whose questions cannot be loaded, and for one with no first step", async () => {
      await expect(page("network-plus-n10-009")).rejects.toThrow("not found");
      path.bank = { structure, questions: [] };
      await expect(page("network-plus-n10-009")).rejects.toThrow("not found");
      // An address that is not an exam's is refused before anything is loaded.
      await expect(page("not-an-exam")).rejects.toThrow("not found");
      expect(path.app).toEqual([]);
    });
  });
});

describe("the page where an exam is chosen", () => {
  // It is every member's home, and it answers a member with a redirect. With a
  // loading file beside it the server would send its first bytes, with status
  // 200, before the page had decided: on a full page load the member would be
  // sent a page that says it is loading and then be moved on by a script,
  // instead of being answered with the redirect itself. (Decided on November
  // 22, 2026: the file that had been added was taken out again.)
  it("has no loading file beside it, so that a member's redirect is the server's own answer", () => {
    expect(existsSync(join(APP, "(path)", "start", "page.tsx"))).toBe(true);
    expect(existsSync(join(APP, "(path)", "start", "loading.tsx"))).toBe(false);
    // Nor one above it that would stand in for it in the same way.
    expect(existsSync(join(APP, "(path)", "loading.tsx"))).toBe(false);
    expect(existsSync(join(APP, "loading.tsx"))).toBe(false);
  });

  it("answers a visitor who is not signed in with the list of exams, in the page's own HTML", async () => {
    const root = await startPage();
    // One title, and the first sentence under it.
    expect([...root.querySelectorAll("h1")].map(text)).toEqual(["Which exam are you preparing for?"]);
    expect(text(root)).toContain(
      "This is the only choice that you need to make. After this, each step is set out for you in order."
    );
    // The page's frame: its bar and its main region, which the skip link leads to.
    expect(root.querySelector("header")).not.toBeNull();
    const main = root.querySelector("main");
    expect(main?.id).toBe("main-content");
    expect(main?.getAttribute("tabindex")).toBe("-1");
    // The list itself is in the answer: an exam taught in one version is a link
    // to its study path, and Security+, which is taught in two, asks which.
    expect(rowLinks(root)).toEqual([
      "/path/network-plus-n10-009",
      "/path/a-plus-core1-220-1201",
      "/path/a-plus-core2-220-1202",
    ]);
    expect(text(root.querySelector('button[aria-controls^="exam-versions-"]'))).toContain("Security+");
    // Nothing on it says that anything is loading.
    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(text(root)).not.toMatch(/loading/i);
  });

  it("sends a member who is enrolled in an exam straight to that exam's study path", async () => {
    account.user = { id: "u1" };
    account.enrollments = [{ certificationId: "cert-net" }, { certificationId: "cert-sec" }];
    // The exam they enrolled in first.
    expect(await sentTo()).toBe("/path/network-plus-n10-009");
  });

  it("keeps the mark of a return from paying on the way to the study path, which opens with what Pro opened", async () => {
    account.user = { id: "u1" };
    account.enrollments = [{ certificationId: "cert-sec" }];
    expect(await sentTo({ upgraded: "1" })).toBe("/path/security-plus-sy0-701?upgraded=1");
    // Any other value of the parameter is not that mark.
    expect(await sentTo({ upgraded: "yes" })).toBe("/path/security-plus-sy0-701");
  });

  it("shows the list to a member who came to change exam, without asking who they are", async () => {
    account.user = { id: "u1" };
    account.enrollments = [{ certificationId: "cert-sec" }];
    expect(await sentTo({ pick: "1" })).toBeNull();
    expect(account.asked).toBe(0);
    const root = await startPage({ pick: "1" });
    expect(text(root.querySelector("h1"))).toBe("Which exam are you preparing for?");
    expect(rowLinks(root)).toHaveLength(3);
  });

  it("shows the list to a member who has no exam yet, or whose exam has no study path", async () => {
    account.user = { id: "u1" };
    expect(await sentTo()).toBeNull();
    account.enrollments = [{ certificationId: "cert-other" }];
    expect(await sentTo()).toBeNull();
    account.enrollments = [{ certificationId: "an-exam-that-is-no-longer-listed" }];
    expect(await sentTo()).toBeNull();
    expect(account.asked).toBe(3);
  });

  it("shows the list when the account's exams cannot be read, and does not fail", async () => {
    account.user = { id: "u1" };
    account.enrollments = new Error("The database did not answer.");
    expect(await sentTo()).toBeNull();
    expect(text((await startPage()).querySelector("h1"))).toBe("Which exam are you preparing for?");
  });

  it("asks a buyer who is back from paying, and has no exam yet, which exam the plan is for", async () => {
    account.user = { id: "u1" };
    const root = await startPage({ upgraded: "1" });
    expect([...root.querySelectorAll("h1")].map(text)).toEqual(["Which exam is your Pro plan for?"]);
    expect(text(root)).toContain("Your payment has been received.");
    expect(text(root)).toContain(
      "Choose the exam, and its whole study path will open. This includes every step, every hands-on lab and the timed practice exams."
    );
    // Each row carries the mark on to the study path it opens.
    expect(rowLinks(root)).toEqual([
      "/path/network-plus-n10-009?upgraded=1",
      "/path/a-plus-core1-220-1201?upgraded=1",
      "/path/a-plus-core2-220-1202?upgraded=1",
    ]);
  });
});
