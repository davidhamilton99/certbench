// @vitest-environment jsdom
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

/** The names of the cookies that the request carries. */
const request = vi.hoisted(() => ({ cookies: [] as string[] }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => request.cookies.map((name) => ({ name, value: "x" })) }),
}));

// The study path's page is only read here for what it exports: its questions
// and the app it draws are not under test.
vi.mock("@/server/path/bank", () => ({ loadPathBank: vi.fn(async () => null) }));
vi.mock("@/server/path/build-stop", () => ({ buildStop: vi.fn(() => null) }));
vi.mock("@/components/path/PathApp", () => ({ PathApp: () => null }));

import { FREE_LAB_COUNT, freeLabs } from "@/core/path/free-labs";
import { PATH_CERTS } from "@/core/path/types";
import { pbqRegistry } from "@/data/pbq";
import { freeOnPublicPages } from "../path/[cert]/free-parts";
import * as pathPage from "../path/[cert]/page";
import StartLoading from "../start/loading";
import { StartLead } from "../start/lead";

const PUBLIC = join(process.cwd(), "src", "app", "(marketing)");
/** Whether a public page exists at an address such as "/security-plus-practice-test". */
const pageExists = (href: string) => existsSync(join(PUBLIC, href.replace(/^\//, ""), "page.tsx"));

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

async function loading(): Promise<HTMLElement> {
  const root = document.createElement("div");
  root.innerHTML = renderToString(await StartLoading());
  return root;
}

beforeEach(() => {
  request.cookies = [];
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
});

describe("what stands in for the list of exams while it loads", () => {
  it("shows a visitor who is not signed in the page's own title and first sentence, as real words", async () => {
    const root = await loading();
    const lead = document.createElement("div");
    lead.innerHTML = renderToString(<StartLead paid={false} />);
    // The same title and sentence as the page itself draws, from the same place.
    expect(text(root.querySelector("h1"))).toBe("Which exam are you preparing for?");
    expect(text(root)).toContain(text(lead));
    expect(text(root)).toContain(
      "This is the only choice that you need to make. After this, each step is set out for you in order."
    );
    const status = root.querySelector('[role="status"]');
    expect(text(status)).toBe("The list of exams is loading.");
    // The page's frame: its bar and its main region, which the skip link leads to.
    expect(root.querySelector("header")).not.toBeNull();
    expect(root.querySelector("main")?.id).toBe("main-content");
    // Still: nothing here moves, spins or starts invisible.
    expect(root.innerHTML).not.toMatch(/animate-|opacity-0|path-rise/);
  });

  it("tells someone who is signed in only that the page is loading: they are usually sent on to their own study path", async () => {
    request.cookies = ["sb-abcdefgh-auth-token"];
    let root = await loading();
    expect(root.querySelector("h1")).toBeNull();
    expect(text(root.querySelector('[role="status"]'))).toBe("The page is loading.");
    expect(text(root)).not.toContain("Which exam");

    // A long session is kept in numbered parts.
    request.cookies = ["sb-abcdefgh-auth-token.0", "sb-abcdefgh-auth-token.1"];
    root = await loading();
    expect(text(root.querySelector('[role="status"]'))).toBe("The page is loading.");

    // Any other cookie says nothing about a session.
    request.cookies = ["theme", "sb-abcdefgh-auth-token-code-verifier"];
    root = await loading();
    expect(text(root.querySelector("h1"))).toBe("Which exam are you preparing for?");
  });
});
