// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { finishStop, recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "@/core/path/types";
import { ApiError } from "@/contracts/errors";

/** The sign-in service: whether the browser holds a session cookie, who it says is here, and whether it answers. */
const auth = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
  hangs: false,
  loads: 0,
  /**
   * What the sign-in service answers when the browser's client asks it who is
   * signed in: the user of the session ("good"), that the session no longer
   * exists ("ended", after which the client drops its cookie, as the real one
   * does), or nothing, because it cannot be reached ("unreachable").
   */
  service: "good" as "good" | "ended" | "unreachable",
  /** How many times the client asked the sign-in service. */
  asked: 0,
}));
vi.mock("@/lib/supabase-lazy", () => ({
  hasSessionCookie: () => auth.session !== null || auth.hangs,
  loadBrowserClient: async () => {
    auth.loads++;
    return {
      auth: {
        getSession: () =>
          auth.hangs ? new Promise(() => {}) : Promise.resolve({ data: { session: auth.session } }),
        getUser: async () => {
          auth.asked++;
          if (auth.service === "unreachable") {
            return { data: { user: null }, error: { name: "AuthRetryableFetchError", status: 0 } };
          }
          if (auth.service === "ended" || !auth.session) {
            auth.session = null;
            return { data: { user: null }, error: { name: "AuthSessionMissingError", status: 400 } };
          }
          return { data: { user: auth.session.user }, error: null };
        },
      },
    };
  },
  onBrowserClientLoaded: () => () => {},
}));

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser: vi.fn() }));

/** The account, as the API answers for it. */
const server = vi.hoisted(() => ({
  progress: null as null | object,
  access: "free" as "free" | "pro",
  proPlan: false,
  /** The account's last payment did not go through. The server says so only when it is true. */
  pastDue: false,
  /** Reading the account: it answers, it fails with this error, or it never answers. */
  read: "ok" as "ok" | "hang" | Error,
  /** Saving to the account: it works, or it fails with this error. */
  save: "ok" as "ok" | Error,
  /** False where the database has no table for saved progress: saving is not available there. */
  stored: true,
  /** Something that happens in the browser just as the account is asked. */
  whenRead: null as null | (() => void),
  calls: [] as { method: string; path: string; input: unknown; options: { timeoutMs?: number; keepalive?: boolean } }[],
}));
vi.mock("@/lib/api-client", () => ({
  api: async (
    contract: { path: string; method: string },
    input: unknown,
    options: { timeoutMs?: number; keepalive?: boolean } = {}
  ) => {
    server.calls.push({ method: contract.method, path: contract.path, input, options });
    if (contract.method === "GET") {
      server.whenRead?.();
      if (server.read === "hang") return new Promise(() => {});
      if (server.read instanceof Error) throw server.read;
      return {
        progress: server.progress ?? { items: {}, stops: {}, checkpoint: null, goal: null },
        stored: server.stored,
        access: server.access,
        proPlan: server.proPlan,
        certId: "11111111-1111-4111-8111-111111111111",
        ...(server.pastDue ? { paymentPastDue: true } : {}),
      };
    }
    if (server.save instanceof Error) throw server.save;
    return { ok: true, stored: server.stored };
  },
}));

import { ACCOUNT_LIMIT_MS, usePathProgress } from "../usePathProgress";

const CERT = "security-plus-sy0-701";
const KEY = `cb_path_${CERT}`;
const GUEST = `cb_path_guest_${CERT}`;

// Node's own experimental `localStorage` global shadows jsdom's.
const store = new Map<string, string>();
const storage = { refuses: false };
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (storage.refuses) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      store.set(k, String(v));
    },
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

const answered = (...ids: string[]): PathProgress =>
  ids.reduce((p, id, n) => recordRep(p, id, true, n + 1), EMPTY_PATH_PROGRESS);
const items = (p: PathProgress | undefined | null) => Object.keys(p?.items ?? {}).sort();
const seed = (owner: string | null, progress: PathProgress) =>
  store.set(KEY, JSON.stringify({ v: 1, owner, progress }));
const stored = () => JSON.parse(store.get(KEY)!) as { owner: string | null; progress: PathProgress };

/** Every save sent to the account, oldest first. */
const saves = () =>
  server.calls.filter((c) => c.method === "POST").map((c) => ({ ...c, progress: (c.input as { progress: PathProgress }).progress }));
const reads = () => server.calls.filter((c) => c.method === "GET");

/** Let what is waiting on a promise run, and move the clock on. */
const pass = (ms = 0) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const open = () => renderHook(() => usePathProgress(CERT));

const signIn = (id = "u1") => {
  auth.session = { user: { id, email: `${id}@example.com` } };
};

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  store.clear();
  storage.refuses = false;
  auth.session = null;
  auth.hangs = false;
  auth.loads = 0;
  auth.service = "good";
  auth.asked = 0;
  server.whenRead = null;
  server.progress = null;
  server.access = "free";
  server.proPlan = false;
  server.pastDue = false;
  server.read = "ok";
  server.save = "ok";
  server.stored = true;
  server.calls = [];
  track.mockClear();
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("opening the study path", () => {
  it("is a visitor's at once when the browser holds no session cookie, without loading the sign-in client", async () => {
    const { result } = open();
    expect(result.current.ready).toBe(false);
    await pass();
    expect(result.current).toMatchObject({ ready: true, signedIn: false, access: "anonymous", unreached: false, arrival: 1 });
    expect(auth.loads).toBe(0);
    expect(server.calls).toHaveLength(0);
  });

  it("merges the account's copy with the device's and saves what the account lacked", async () => {
    signIn();
    seed("u1", answered("a|1.1|device"));
    server.progress = answered("a|1.2|account");
    server.access = "pro";
    const { result } = open();
    await pass();
    expect(result.current).toMatchObject({ ready: true, signedIn: true, access: "pro", unreached: false, foreign: false });
    expect(items(result.current.progress)).toEqual(["a|1.1|device", "a|1.2|account"]);
    expect(items(saves().at(-1)?.progress)).toEqual(["a|1.1|device", "a|1.2|account"]);
  });

  it("keeps an answer that was given before the page knew who was there", async () => {
    // A visitor: the first question is on screen before the device has been read.
    seed(null, answered("a|1.2|earlier"));
    const visitor = open();
    act(() => visitor.result.current.record("a|1.1|w1", true));
    await pass();
    expect(items(visitor.result.current.progress)).toEqual(["a|1.1|w1", "a|1.2|earlier"]);
    expect(items(stored().progress)).toEqual(["a|1.1|w1", "a|1.2|earlier"]);
    visitor.unmount();

    // A learner on a new device: the account's copy arrives after the answer.
    store.clear();
    signIn();
    server.progress = answered("a|1.2|account");
    const learner = open();
    act(() => learner.result.current.record("a|1.1|w1", false));
    await pass();
    expect(items(learner.result.current.progress)).toEqual(["a|1.1|w1", "a|1.2|account"]);
    // The answer is not in the account yet, so it is sent.
    expect(items(saves().at(-1)?.progress)).toEqual(["a|1.1|w1", "a|1.2|account"]);
  });

  it("hands the page functions that are never made again, and the state as it is at that moment", async () => {
    signIn();
    const { result, rerender } = open();
    await pass();
    const first = result.current;
    // Read inside one handler, before the page has rendered again: the answer just recorded is there.
    let seen: string[] = [];
    act(() => {
      first.record("a|1.1|w1", true);
      seen = items(first.peek().progress);
    });
    expect(seen).toEqual(["a|1.1|w1"]);
    expect(first.peek().userId).toBe("u1");

    rerender();
    await pass();
    // The page's own handlers depend on these, so a question is not handed new functions on every render.
    for (const name of ["peek", "record", "finish", "finishLab", "retire", "setGoal", "refreshAccess"] as const) {
      expect(result.current[name], name).toBe(first[name]);
    }
  });
});

describe("an account that cannot be reached", () => {
  beforeEach(() => {
    signIn();
    seed("u1", finishStop(answered("a|1.1|device"), "warmup", 1, 1, 5));
    server.read = new ApiError("internal", "The connection was lost. Please check your connection and try again.");
  });

  it("is unknown, never free: the page shows what the device holds and says that the account was not reached", async () => {
    const { result } = open();
    await pass();
    expect(result.current).toMatchObject({ ready: true, signedIn: true, access: "unknown", unreached: true, certId: null });
    expect(items(result.current.progress)).toEqual(["a|1.1|device"]);
    // Nothing is sent to an account that has not answered.
    expect(saves()).toHaveLength(0);
  });

  it("is asked again after 1, 3 and 8 seconds, and its answer is taken with what the device kept", async () => {
    const { result } = open();
    await pass();
    expect(reads()).toHaveLength(1);
    await pass(1000);
    expect(reads()).toHaveLength(2);
    await pass(2000);
    expect(reads()).toHaveLength(3);
    expect(result.current.unreached).toBe(true);

    // The connection returns before the third attempt.
    server.read = "ok";
    server.access = "pro";
    server.progress = answered("a|1.2|account");
    const arrival = result.current.arrival;
    await pass(5000);
    expect(result.current).toMatchObject({ access: "pro", unreached: false, arrival: arrival + 1 });
    expect(items(result.current.progress)).toEqual(["a|1.1|device", "a|1.2|account"]);
    // What the device held while the account was out of reach is saved to it.
    expect(items(saves().at(-1)?.progress)).toEqual(["a|1.1|device", "a|1.2|account"]);
    expect(saves().at(-1)?.progress.stops).toHaveProperty("warmup");
  });

  it("is asked again when the browser says that the connection is back", async () => {
    const { result } = open();
    await pass();
    server.read = "ok";
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toMatchObject({ access: "free", unreached: false });
  });

  it("keeps what it last knew when a later request fails: a member is not turned into a free account", async () => {
    server.read = "ok";
    server.access = "pro";
    server.proPlan = true;
    const { result } = open();
    await pass();
    expect(result.current.access).toBe("pro");

    server.read = new ApiError("internal");
    await act(async () => {
      await result.current.refreshAccess();
    });
    expect(result.current).toMatchObject({ access: "pro", proPlan: true, unreached: true });
    expect(result.current.certId).toBe("11111111-1111-4111-8111-111111111111");
  });

  // The server's own answer when the database did not give it the saved
  // progress (src/app/api/path/progress/route.ts). It used to answer with
  // status 200 and an empty study path, which the page then showed to a member
  // in place of their own, with no notice and nothing asked again.
  it("takes a read that the server could not make for 'not reached': the device's copy stays, and the account is asked again", async () => {
    server.read = new ApiError("internal", "Your study path could not be read. Please try again.");
    const { result } = open();
    await pass();
    expect(result.current).toMatchObject({ ready: true, signedIn: true, access: "unknown", unreached: true, stored: null });
    expect(items(result.current.progress)).toEqual(["a|1.1|device"]);
    expect(saves()).toHaveLength(0);

    // It is asked again by itself, and its answer is merged with what the device kept.
    server.read = "ok";
    server.progress = answered("a|1.2|account");
    await pass(1000);
    expect(result.current).toMatchObject({ unreached: false, stored: true });
    expect(items(result.current.progress)).toEqual(["a|1.1|device", "a|1.2|account"]);
  });

});

// The server answers "signed out" (401) to a page that holds a session. It is
// believed only when the browser's own sign-in client says the same. A wrong
// "signed out" shows a member the visitor's screen, with their progress put
// away and nothing asked again.
describe("an account that answers 'signed out'", () => {
  beforeEach(() => {
    signIn();
    seed("u1", finishStop(answered("a|1.1|device"), "warmup", 1, 1, 5));
    server.read = new ApiError("unauthorized");
  });

  it("is not believed while the browser holds a good session: the account is 'not reached', and it is asked again", async () => {
    const { result } = open();
    await pass();
    // Not the visitor's screen: the learner is still signed in, with their own progress in front of them.
    expect(result.current).toMatchObject({ ready: true, signedIn: true, userId: "u1", access: "unknown", unreached: true });
    expect(result.current.held).toBeNull();
    expect(items(result.current.progress)).toEqual(["a|1.1|device"]);
    // The sign-in client was asked, and it named the user.
    expect(auth.asked).toBe(1);
    // Nothing is sent to an account that has not answered.
    expect(saves()).toHaveLength(0);

    // It is asked again by itself. The server answers properly this time: a member.
    server.read = "ok";
    server.access = "pro";
    await pass(1000);
    expect(reads()).toHaveLength(2);
    expect(result.current).toMatchObject({ signedIn: true, access: "pro", unreached: false });
  });

  it("is a signed-out visit when the sign-in service says that the session has ended", async () => {
    // Signed out on another device, say: the cookie is still here, and the session behind it is gone.
    auth.service = "ended";
    const { result } = open();
    await pass();
    expect(auth.asked).toBe(1);
    expect(result.current).toMatchObject({ ready: true, signedIn: false, access: "anonymous", unreached: false });
    // The account's copy on the device is offered back, not shown.
    expect(items(result.current.held)).toEqual(["a|1.1|device"]);
    // A visitor's page does not ask an account again.
    await pass(8000);
    expect(reads()).toHaveLength(1);
  });

  it("is a signed-out visit, with nobody asked, when the browser no longer holds a session cookie", async () => {
    // The session ends in another tab while this page is asking the account.
    server.whenRead = () => {
      auth.session = null;
    };
    const { result } = open();
    await pass();
    expect(auth.asked).toBe(0);
    expect(result.current).toMatchObject({ ready: true, signedIn: false, access: "anonymous" });
    expect(items(result.current.held)).toEqual(["a|1.1|device"]);
  });

  it("is not believed when the sign-in service cannot be asked: nothing is known, so the learner stays signed in", async () => {
    auth.service = "unreachable";
    const { result } = open();
    await pass();
    expect(result.current).toMatchObject({ ready: true, signedIn: true, access: "unknown", unreached: true });
    expect(items(result.current.progress)).toEqual(["a|1.1|device"]);
  });

  it("keeps a member's access when a later request is answered 'signed out' and the session is good", async () => {
    server.read = "ok";
    server.access = "pro";
    const { result } = open();
    await pass();
    expect(result.current.access).toBe("pro");

    server.read = new ApiError("unauthorized");
    await act(async () => {
      await result.current.refreshAccess();
    });
    expect(result.current).toMatchObject({ signedIn: true, access: "pro", unreached: true });
  });
});

describe("an account whose last payment did not go through", () => {
  beforeEach(() => signIn());

  it("is known as such once the account has said so, and never before", async () => {
    server.pastDue = true;
    const { result } = open();
    // Nothing is known yet: nobody is told that a payment is owed.
    expect(result.current.paymentPastDue).toBe(false);
    await pass();
    expect(result.current).toMatchObject({ access: "free", proPlan: false, paymentPastDue: true });
  });

  it("is not assumed of an account that says nothing about a payment", async () => {
    const { result } = open();
    await pass();
    expect(result.current.paymentPastDue).toBe(false);
  });

  it("stays known while the account cannot be reached, and ends when the account says that nothing is owed", async () => {
    server.pastDue = true;
    const { result } = open();
    await pass();

    server.read = new ApiError("internal");
    await act(async () => {
      await result.current.refreshAccess();
    });
    // What the account last said still stands: the offer does not come back because a request failed.
    expect(result.current).toMatchObject({ unreached: true, paymentPastDue: true });

    // The payment is made, and the plan is back.
    server.read = "ok";
    server.pastDue = false;
    server.access = "pro";
    await act(async () => {
      await result.current.refreshAccess();
    });
    expect(result.current).toMatchObject({ unreached: false, access: "pro", paymentPastDue: false });
  });

  it("is never said of a visitor", async () => {
    auth.session = null;
    const { result } = open();
    await pass();
    expect(result.current).toMatchObject({ signedIn: false, paymentPastDue: false });
  });
});

describe("the time limit on a held stage", () => {
  it("gives the account request less than the limit, so the page opens once", async () => {
    signIn();
    open();
    await pass();
    const limit = reads()[0].options.timeoutMs;
    expect(limit).toBeGreaterThanOrEqual(2000);
    expect(limit).toBeLessThan(ACCOUNT_LIMIT_MS);
  });

  it("opens on the device's copy when the account has not answered in time", async () => {
    signIn();
    seed("u1", answered("a|1.1|device"));
    server.read = "hang";
    const { result } = open();
    await pass(ACCOUNT_LIMIT_MS - 100);
    expect(result.current.ready).toBe(false);
    await pass(100);
    expect(result.current).toMatchObject({ ready: true, signedIn: true, access: "unknown", unreached: true, arrival: 1 });
    expect(items(result.current.progress)).toEqual(["a|1.1|device"]);
  });

  it("opens as a visitor when the sign-in service has not answered in time", async () => {
    auth.hangs = true;
    seed(null, answered("a|1.1|device"));
    const { result } = open();
    await pass(ACCOUNT_LIMIT_MS);
    expect(result.current).toMatchObject({ ready: true, signedIn: false, access: "anonymous" });
    expect(items(result.current.progress)).toEqual(["a|1.1|device"]);
  });
});

describe("a shared computer", () => {
  it("never folds another account's device copy into the account that signs in, and gives it the guest work", async () => {
    seed("u1", answered("a|2.1|theirs"));
    store.set(GUEST, JSON.stringify(answered("a|1.1|guest")));
    signIn("u2");
    const { result } = open();
    await pass();
    expect(result.current).toMatchObject({ ready: true, userId: "u2", foreign: true });
    expect(items(result.current.progress)).toEqual(["a|1.1|guest"]);
    expect(items(saves().at(-1)?.progress)).toEqual(["a|1.1|guest"]);
    for (const save of saves()) expect(items(save.progress)).not.toContain("a|2.1|theirs");
    // The guest work is the account's now.
    expect(store.has(GUEST)).toBe(false);
    expect(track).toHaveBeenCalledWith("path_account_linked", { cert: CERT, method: "redirect" });
  });

  it("does not count the account a second time when a public page handed it the guest work", async () => {
    seed("u1", answered("a|2.1|theirs"));
    store.set(GUEST, JSON.stringify(answered("a|1.1|guest")));
    store.set(`cb_path_guest_claim_${CERT}`, "u2");
    signIn("u2");
    open();
    await pass();
    expect(items(saves().at(-1)?.progress)).toEqual(["a|1.1|guest"]);
    expect(track).not.toHaveBeenCalledWith("path_account_linked", expect.anything());
    expect(store.has(`cb_path_guest_claim_${CERT}`)).toBe(false);
  });

  it("takes guest work beside the account's own copy when its owner signs back in, and counts the sign-in as before", async () => {
    // Played signed out on the member's own device, then signed back in.
    seed("u1", answered("a|2.1|mine"));
    store.set(GUEST, JSON.stringify(answered("a|1.1|guest")));
    signIn("u1");
    const { result } = open();
    await pass();
    expect(result.current.foreign).toBe(false);
    expect(items(result.current.progress)).toEqual(["a|1.1|guest", "a|2.1|mine"]);
    expect(items(saves().at(-1)?.progress)).toEqual(["a|1.1|guest", "a|2.1|mine"]);
    expect(store.has(GUEST)).toBe(false);
    expect(track).toHaveBeenCalledWith("path_account_linked", { cert: CERT, method: "redirect" });
  });

  it("keeps a signed-out visitor's answers beside an account's copy, which stays as it was", async () => {
    seed("u1", answered("a|2.1|theirs"));
    const before = store.get(KEY);
    const { result } = open();
    await pass();
    expect(result.current).toMatchObject({ signedIn: false, owner: "u1" });
    expect(items(result.current.held)).toEqual(["a|2.1|theirs"]);
    expect(items(result.current.progress)).toEqual([]);

    act(() => result.current.record("a|1.1|w1", true));
    expect(store.get(KEY)).toBe(before);
    expect(Object.keys(JSON.parse(store.get(GUEST)!).items)).toEqual(["a|1.1|w1"]);
  });
});

describe("saving to the account", () => {
  beforeEach(() => signIn());

  it("says when a save failed, sends it again when the connection returns, and says nothing once it is saved", async () => {
    const { result } = open();
    await pass();
    server.save = new ApiError("internal");
    await act(async () => {
      result.current.finish("warmup", 3, 3);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.saveFailed).toBe("internal");
    expect(track).toHaveBeenCalledWith("path_save_failed", { cert: CERT, code: "internal" });

    server.save = "ok";
    const sent = saves().length;
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saves().length).toBe(sent + 1);
    expect(result.current.saveFailed).toBeNull();
  });

  it("sends a failed save again after a short wait without waiting for the next answer", async () => {
    const { result } = open();
    await pass();
    server.save = new ApiError("internal");
    await act(async () => {
      result.current.finish("warmup", 3, 3);
      await vi.advanceTimersByTimeAsync(0);
    });
    server.save = "ok";
    await pass(8000);
    expect(result.current.saveFailed).toBeNull();
  });

  // The server's own answer when the database refused the write or did not
  // answer (src/app/api/path/progress/route.ts). It used to answer with status
  // 200 and `stored: false`, and the page counted the save as saved.
  it("counts a save that the server could not store as not saved, and sends it again as the tab is hidden", async () => {
    const { result } = open();
    await pass();
    server.save = new ApiError("internal", "Your study path could not be saved. Please try again.");
    await act(async () => {
      result.current.finish("warmup", 3, 3);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.saveFailed).toBe("internal");
    expect(track).toHaveBeenCalledWith("path_save_failed", { cert: CERT, code: "internal" });

    // Nothing has been answered since, and the save is still owed: leaving the page sends it again.
    server.save = "ok";
    const sent = saves().length;
    await act(async () => {
      setVisibility("hidden");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saves().length).toBe(sent + 1);
    expect(saves().at(-1)?.progress.stops).toHaveProperty("warmup");
    expect(result.current.saveFailed).toBeNull();
  });

  it("does not take 'saving is not available here' for a failure: nothing is said, and nothing is sent again", async () => {
    // The one meaning that `stored: false` keeps: this database has no table for saved progress.
    server.stored = false;
    const { result } = open();
    await pass();
    await act(async () => {
      result.current.finish("warmup", 3, 3);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toMatchObject({ saveFailed: null, stored: false });
    const sent = saves().length;
    await pass(8000);
    expect(saves().length).toBe(sent);
    expect(track).not.toHaveBeenCalledWith("path_save_failed", expect.anything());
  });

  it("lets the last save outlive the tab when it is small enough", async () => {
    const { result } = open();
    await pass();
    act(() => result.current.record("a|1.1|w1", true));
    // One answer is not enough for an ordinary save.
    expect(saves()).toHaveLength(0);
    await act(async () => {
      setVisibility("hidden");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saves()).toHaveLength(1);
    expect(saves()[0].options.keepalive).toBe(true);
  });

  it("sends a save that is too large for that the ordinary way", async () => {
    // About 120 KB of answers: over the 64 KB a browser allows a request that outlives its page.
    const large = Array.from({ length: 1800 }, (_, n) => `a|1.1|${String(n).padStart(56, "x")}`);
    server.progress = answered(...large);
    const { result } = open();
    await pass();
    act(() => result.current.record("a|1.1|w1", true));
    await act(async () => {
      setVisibility("hidden");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saves()).toHaveLength(1);
    expect(saves()[0].options.keepalive).toBeUndefined();
  });
});

// A new version of the site was published while the page was open. The server
// carries each request out, and the file that reads its answers is gone: `api()`
// then says that the page is out of date. Asking again cannot help.
describe("a page that is out of date", () => {
  const OUT_OF_DATE = new ApiError("internal", "This page is out of date. Please reload the page.");

  beforeEach(() => signIn());

  it("does not count a save that was carried out as a failed save, says that the page is out of date, and sends nothing again", async () => {
    const { result } = open();
    await pass();
    expect(result.current.outOfDate).toBe(false);

    server.save = OUT_OF_DATE;
    await act(async () => {
      result.current.finish("warmup", 3, 3);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current).toMatchObject({ outOfDate: true, saveFailed: null });
    // The server stored it: it is not counted with the saves that failed.
    expect(track).not.toHaveBeenCalledWith("path_save_failed", expect.anything());

    // Nothing is sent again: not after the wait, not when the connection is said to be back, not when the tab is looked at again.
    const sent = saves().length;
    await pass(8000);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      setVisibility("visible");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saves().length).toBe(sent);

    // The learner goes on: their next answers are still sent, and the page stays out of date until it is loaded again.
    server.save = "ok";
    await act(async () => {
      result.current.finish("1.1", 3, 3);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saves().length).toBe(sent + 1);
    expect(result.current).toMatchObject({ outOfDate: true, saveFailed: null });
  });

  it("stops sending a save that had failed once the page learns that it is out of date", async () => {
    const { result } = open();
    await pass();
    server.save = new ApiError("internal", "The connection was lost. Please check your connection and try again.");
    await act(async () => {
      result.current.finish("warmup", 3, 3);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.saveFailed).toBe("internal");

    // The save is sent again after its wait. This time the server stores it, and the page cannot read the answer.
    server.save = OUT_OF_DATE;
    await pass(8000);
    expect(result.current).toMatchObject({ outOfDate: true, saveFailed: null });
    const sent = saves().length;
    await pass(30_000);
    expect(saves().length).toBe(sent);
  });

  it("does not go on asking an account whose answer it cannot read", async () => {
    seed("u1", answered("a|1.1|device"));
    server.read = OUT_OF_DATE;
    const { result } = open();
    await pass();
    // What the account holds stays unknown, and the device's copy is shown.
    expect(result.current).toMatchObject({ ready: true, signedIn: true, access: "unknown", unreached: true, outOfDate: true });
    expect(items(result.current.progress)).toEqual(["a|1.1|device"]);
    expect(reads()).toHaveLength(1);

    // An account that is only out of reach is asked again after 1, 3 and 8 seconds. This one is not.
    await pass(8000);
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(reads()).toHaveLength(1);
  });
});

describe("the copy on the device", () => {
  it("says when the browser refuses to keep it", async () => {
    storage.refuses = true;
    const { result } = open();
    await pass();
    expect(result.current.ready).toBe(true);
    expect(result.current.deviceSaves).toBe(false);
    // The answers still count for as long as the tab is open.
    act(() => result.current.record("a|1.1|w1", true));
    expect(items(result.current.progress)).toEqual(["a|1.1|w1"]);

    // Once the browser keeps it again, the page stops saying so.
    storage.refuses = false;
    act(() => result.current.record("a|1.2|w2", true));
    expect(result.current.deviceSaves).toBe(true);
  });

  it("brings another tab's work into this tab, and never overwrites it", async () => {
    const { result } = open();
    await pass();
    act(() => result.current.record("a|1.1|mine", true));

    // Another tab (or a public page open in one) answers a question and stores its whole copy.
    seed(null, answered("a|1.2|other-tab"));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(items(result.current.progress)).toEqual(["a|1.1|mine", "a|1.2|other-tab"]);

    act(() => result.current.record("a|1.3|mine-too", true));
    expect(items(stored().progress)).toEqual(["a|1.1|mine", "a|1.2|other-tab", "a|1.3|mine-too"]);
  });

  it("keeps the other tab's work even when this tab did not hear about it", async () => {
    const { result } = open();
    await pass();
    seed(null, answered("a|1.2|other-tab"));
    act(() => result.current.record("a|1.1|mine", true));
    expect(items(stored().progress)).toEqual(["a|1.1|mine", "a|1.2|other-tab"]);
  });

  it("does not take a copy that another account wrote in the other tab", async () => {
    signIn();
    const { result } = open();
    await pass();
    seed("u2", answered("a|2.1|theirs"));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(items(result.current.progress)).toEqual([]);
  });
});
