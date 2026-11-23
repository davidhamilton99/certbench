// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { finishStop, recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "@/core/path/types";
import {
  claimLocalPath,
  clearGuestPath,
  mayTakeExam,
  readExamMark,
  readGuestClaim,
  readGuestPath,
  readLocalPath,
  readVisitorPath,
  updateLocalPath,
  writeExamMark,
  writeGuestPath,
  writeLocalPath,
} from "../local-path";
import { pathGuestClaimKey, pathGuestKey, pathStorageKey } from "../storage-key";

const CERT = "security-plus-sy0-701";
const KEY = pathStorageKey(CERT);
const GUEST = pathGuestKey(CERT);

// Node's own experimental `localStorage` global shadows jsdom's.
const store = new Map<string, string>();
/** When true, the browser refuses every write, as it does with site data blocked. */
let refuses = false;
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (refuses) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      store.set(k, String(v));
    },
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

const answered = (...ids: string[]): PathProgress =>
  ids.reduce((p, id, n) => recordRep(p, id, true, n + 1), EMPTY_PATH_PROGRESS);

/** What another tab, or an earlier visit, left on the device. */
const seed = (owner: string | null, progress: PathProgress) =>
  store.set(KEY, JSON.stringify({ v: 1, owner, progress }));

const items = (p: PathProgress | null | undefined) => Object.keys(p?.items ?? {}).sort();

beforeEach(() => {
  store.clear();
  refuses = false;
});

describe("a change made on a public page", () => {
  const add = (id: string) => (p: PathProgress) => recordRep(p, id, true, 10);

  it("goes into the device's copy when nobody owns it", () => {
    expect(updateLocalPath(CERT, add("a|1.1|x"))).toBe(true);
    expect(readLocalPath(CERT)).toMatchObject({ owner: null });
    expect(items(readLocalPath(CERT)?.progress)).toEqual(["a|1.1|x"]);
    expect(store.has(GUEST)).toBe(false);
  });

  it("goes into an account's copy when that account is the one signed in", () => {
    seed("user-1", answered("a|2.1|z"));
    updateLocalPath(CERT, add("a|1.1|x"), "user-1");
    expect(readLocalPath(CERT)?.owner).toBe("user-1");
    expect(items(readLocalPath(CERT)?.progress)).toEqual(["a|1.1|x", "a|2.1|z"]);
    expect(store.has(GUEST)).toBe(false);
  });

  it("is kept beside another account's copy, which stays as it was, when nobody is signed in", () => {
    seed("user-1", answered("a|2.1|z"));
    const before = store.get(KEY);
    updateLocalPath(CERT, add("a|1.1|x"));
    updateLocalPath(CERT, (p) => finishStop(p, "1.1", 1, 1, 11));
    expect(store.get(KEY)).toBe(before);
    expect(items(readGuestPath(CERT))).toEqual(["a|1.1|x"]);
    expect(readGuestPath(CERT)?.stops["1.1"]).toMatchObject({ n: 1, c: 1, t: 1 });
  });

  it("is kept beside another account's copy when a different account is signed in", () => {
    seed("user-1", answered("a|2.1|z"));
    const before = store.get(KEY);
    updateLocalPath(CERT, add("a|1.1|x"), "user-2");
    expect(store.get(KEY)).toBe(before);
    expect(items(readGuestPath(CERT))).toEqual(["a|1.1|x"]);
    // The work is marked as the signed-in account's, so that the study path
    // does not count that account as newly linked when it takes the work.
    expect(readGuestClaim(CERT)).toBe("user-2");
  });

  it("marks no account for guest work that nobody signed in played", () => {
    seed("user-1", answered("a|2.1|z"));
    updateLocalPath(CERT, add("a|1.1|x"));
    expect(readGuestClaim(CERT)).toBeNull();
  });

  it("says when the browser refused to keep it", () => {
    refuses = true;
    expect(updateLocalPath(CERT, add("a|1.1|x"))).toBe(false);
    expect(readLocalPath(CERT)).toBeNull();
  });
});

describe("handing the device's work to an account made on a public page", () => {
  it("gives an anonymous copy to the account", () => {
    seed(null, answered("a|1.1|x"));
    claimLocalPath(CERT, "new-user");
    expect(readLocalPath(CERT)?.owner).toBe("new-user");
    expect(store.has(pathGuestClaimKey(CERT))).toBe(false);
  });

  it("never takes another account's copy: the guest work beside it is marked as the new account's", () => {
    seed("user-1", answered("a|2.1|z"));
    updateLocalPath(CERT, (p) => recordRep(p, "a|1.1|x", true, 10));
    claimLocalPath(CERT, "new-user");
    expect(readLocalPath(CERT)?.owner).toBe("user-1");
    expect(items(readLocalPath(CERT)?.progress)).toEqual(["a|2.1|z"]);
    expect(readGuestClaim(CERT)).toBe("new-user");
    // Once the study path has taken the guest work, the mark goes with it.
    clearGuestPath(CERT);
    expect(readGuestPath(CERT)).toBeNull();
    expect(readGuestClaim(CERT)).toBeNull();
  });

  it("marks nothing when there is no guest work to hand over", () => {
    seed("user-1", answered("a|2.1|z"));
    claimLocalPath(CERT, "new-user");
    expect(readGuestClaim(CERT)).toBeNull();
  });
});

describe("the visitor's own work on the device", () => {
  it("is the anonymous copy together with any guest work", () => {
    seed(null, answered("a|1.1|x"));
    writeGuestPath(CERT, answered("a|1.2|y"));
    expect(items(readVisitorPath(CERT))).toEqual(["a|1.1|x", "a|1.2|y"]);
  });

  it("is the account's copy for that account, and never for anyone else", () => {
    seed("user-1", answered("a|2.1|z"));
    writeGuestPath(CERT, answered("a|1.1|x"));
    expect(items(readVisitorPath(CERT, "user-1"))).toEqual(["a|1.1|x", "a|2.1|z"]);
    expect(items(readVisitorPath(CERT, "user-2"))).toEqual(["a|1.1|x"]);
    expect(items(readVisitorPath(CERT))).toEqual(["a|1.1|x"]);
  });

  it("is nothing on a device that holds only another account's copy", () => {
    seed("user-1", answered("a|2.1|z"));
    expect(readVisitorPath(CERT)).toBeNull();
    expect(readVisitorPath(CERT, "user-2")).toBeNull();
  });
});

describe("two tabs writing the same copy", () => {
  it("merges what another tab stored since this tab last wrote, when the owner is the same", () => {
    writeLocalPath(CERT, { v: 1, owner: null, progress: answered("a|1.1|x") });
    // Another tab answers a question and stores its whole copy.
    seed(null, answered("a|1.1|x", "a|1.2|other-tab"));
    expect(writeLocalPath(CERT, { v: 1, owner: null, progress: answered("a|1.1|x", "a|1.3|mine") })).toBe(true);
    expect(items(readLocalPath(CERT)?.progress)).toEqual(["a|1.1|x", "a|1.2|other-tab", "a|1.3|mine"]);
  });

  it("merges a copy that was on the device before this tab wrote anything", () => {
    seed(null, answered("a|1.2|earlier"));
    writeLocalPath(CERT, { v: 1, owner: null, progress: answered("a|1.3|mine") });
    expect(items(readLocalPath(CERT)?.progress)).toEqual(["a|1.2|earlier", "a|1.3|mine"]);
  });

  it("does not merge a copy that belongs to someone else", () => {
    seed("user-1", answered("a|2.1|z"));
    writeLocalPath(CERT, { v: 1, owner: "user-2", progress: answered("a|1.3|mine") });
    expect(readLocalPath(CERT)?.owner).toBe("user-2");
    expect(items(readLocalPath(CERT)?.progress)).toEqual(["a|1.3|mine"]);
  });

  it("merges guest work kept by another tab", () => {
    writeGuestPath(CERT, answered("a|1.1|x"));
    store.set(GUEST, JSON.stringify(answered("a|1.1|x", "a|1.2|other-tab")));
    writeGuestPath(CERT, answered("a|1.1|x", "a|1.3|mine"));
    expect(items(readGuestPath(CERT))).toEqual(["a|1.1|x", "a|1.2|other-tab", "a|1.3|mine"]);
  });

  it("says when the browser refused to keep the copy", () => {
    refuses = true;
    expect(writeLocalPath(CERT, { v: 1, owner: null, progress: answered("a|1.1|x") })).toBe(false);
    expect(writeGuestPath(CERT, answered("a|1.1|x"))).toBe(false);
  });
});

describe("whose a practice exam from a public page is", () => {
  const exam = (claimedBy: string | null = null) => ({ at: 500, claimedBy });
  const device = (foreign = false, mark: { at: number; by: string | null } | null = null) => ({ foreign, mark });

  it("goes to the account that claimed it, and to no other", () => {
    expect(mayTakeExam("user-1", exam("user-1"), device())).toBe(true);
    expect(mayTakeExam("user-2", exam("user-1"), device())).toBe(false);
    // Even on a device that held another account's study path.
    expect(mayTakeExam("user-1", exam("user-1"), device(true))).toBe(true);
  });

  it("goes to an account when nobody claimed it and the device held no other account's study path", () => {
    expect(mayTakeExam("user-1", exam(), device(false))).toBe(true);
  });

  it("is set aside when nobody claimed it and the device held another account's study path", () => {
    expect(mayTakeExam("user-2", exam(), device(true))).toBe(false);
  });

  it("stays where the device put it: with the account that took it, or set aside", () => {
    expect(mayTakeExam("user-1", exam(), device(false, { at: 500, by: "user-1" }))).toBe(true);
    expect(mayTakeExam("user-2", exam(), device(false, { at: 500, by: "user-1" }))).toBe(false);
    expect(mayTakeExam("user-1", exam(), device(false, { at: 500, by: null }))).toBe(false);
    // A mark for an earlier exam says nothing about this one.
    expect(mayTakeExam("user-2", exam(), device(false, { at: 100, by: "user-1" }))).toBe(true);
  });

  it("remembers what became of the exam", () => {
    expect(readExamMark(CERT)).toBeNull();
    writeExamMark(CERT, { at: 500, by: "user-1" });
    expect(readExamMark(CERT)).toEqual({ at: 500, by: "user-1" });
    writeExamMark(CERT, { at: 600, by: null });
    expect(readExamMark(CERT)).toEqual({ at: 600, by: null });
  });
});
