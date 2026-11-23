// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

/** What `notFound()` throws, so a test can tell that the page asked for the 404 page. */
const NOT_FOUND = "NEXT_NOT_FOUND";
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error(NOT_FOUND);
  },
}));
vi.mock("@/server/supabase/server", () => ({ createClient: async () => ({}) }));

interface SetRow {
  id: string;
  title: string;
  isPublic: boolean;
  questionCount: number;
}
const sets = vi.hoisted(() => ({
  row: null as SetRow | null,
  reads: 0,
}));
vi.mock("@/server/data/study-sets", () => ({
  getStudySet: async () => {
    sets.reads++;
    return sets.row;
  },
  listSetQuestions: async () => [],
}));

/** The player and the toast container have tests of their own. Here they are stand-ins. */
vi.mock("@/components/quiz/StudySetPlayer", () => ({
  StudySetPlayer: (props: { backHref?: string; backLabel?: string }) => (
    <a data-player href={props.backHref}>
      {props.backLabel}
    </a>
  ),
}));
vi.mock("@/components/workspace/CommunitySetActions", () => ({ AttemptPing: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => <div data-toaster /> }));

import Page, { metadata } from "../page";

const ID = "3f2b8c1e-7a4d-4e9b-9c55-0d1e2f3a4b5c";

async function served(setId: string): Promise<Document> {
  const html = renderToString(await Page({ params: Promise.resolve({ setId }) }));
  return new DOMParser().parseFromString(html, "text/html");
}

beforeEach(() => {
  sets.reads = 0;
  sets.row = { id: ID, title: "Ports and protocols", isPublic: true, questionCount: 12 };
});

describe("a shared study set's address", () => {
  it.each(["not-a-uuid", "3f2b8c1e-7a4d-4e9b-9c55", `${ID}0`, `${ID}'--`, "undefined"])(
    "answers %s with the not-found page, without asking the database",
    async (setId) => {
      await expect(served(setId)).rejects.toThrow(NOT_FOUND);
      expect(sets.reads).toBe(0);
    }
  );

  it("answers a well-formed id that holds no set, or a private one, with the not-found page", async () => {
    sets.row = null;
    await expect(served(ID)).rejects.toThrow(NOT_FOUND);
    sets.row = { id: ID, title: "Private notes", isPublic: false, questionCount: 3 };
    await expect(served(ID)).rejects.toThrow(NOT_FOUND);
    expect(sets.reads).toBe(2);
  });

  it("accepts an id in capitals, as the database does", async () => {
    expect((await served(ID.toUpperCase())).querySelector("h1")?.textContent).toBe("Ports and protocols");
  });
});

describe("the shared study set page", () => {
  it("has the wordmark in a header and one main region that the skip link can move to", async () => {
    const doc = await served(ID);
    expect(doc.querySelector("header a")?.getAttribute("aria-label")).toBe("CertBench home");
    const mains = doc.querySelectorAll("main");
    expect(mains).toHaveLength(1);
    expect(mains[0].id).toBe("main-content");
    expect(mains[0].getAttribute("tabindex")).toBe("-1");
  });

  it("titles the page with the set's name and says whose work it is", async () => {
    const doc = await served(ID);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("h1")?.textContent).toBe("Ports and protocols");
    expect(doc.querySelector("main p")?.textContent).toBe(
      "This study set has 12 questions. It was made and shared by a CertBench member."
    );
    sets.row = { ...sets.row!, questionCount: 1 };
    expect((await served(ID)).querySelector("main p")?.textContent).toContain("This study set has 1 question.");
  });

  it("invites a visitor to what exists: the study path, not the retired set maker", async () => {
    const doc = await served(ID);
    const start = doc.querySelector("header a[href='/start']");
    expect(start?.textContent).toBe("Start for free");
    const player = doc.querySelector("[data-player]");
    expect(player?.getAttribute("href")).toBe("/start");
    expect(player?.textContent).toBe("Start the study path for your exam");
    expect(doc.body.textContent).not.toMatch(/create your own sets|study smarter/i);
    expect(doc.querySelector("a[href='/register']")).toBeNull();
  });

  it("draws the toast container itself, because the player reports failures in a toast", async () => {
    expect((await served(ID)).querySelector("[data-toaster]")).not.toBeNull();
  });

  it("is kept out of search", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
