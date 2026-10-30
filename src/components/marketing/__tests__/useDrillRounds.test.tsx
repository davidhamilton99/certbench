// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string } } }));
const server = vi.hoisted(() => ({
  progress: { items: {}, rounds: 0 } as { items: Record<string, unknown>; rounds: number },
  saves: [] as unknown[],
  failSaves: false,
}));

vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: session.current } }) },
  }),
}));

vi.mock("@/lib/api-client", () => ({
  api: async (contract: { method: string }, input: { progress?: unknown }) => {
    if (contract.method === "GET") return { progress: server.progress };
    if (server.failSaves) throw new Error("offline");
    server.saves.push(input.progress);
    return { ok: true };
  },
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));

import { useDrillRounds } from "@/components/marketing/useDrillRounds";

const IDS = Array.from({ length: 35 }, (_, i) => `p${i}`);
const SIZE = 4;

function setup() {
  return renderHook(() => useDrillRounds({ tool: "ports", ids: IDS, size: SIZE }));
}

/** Answer the whole round (alternating right/wrong), then move past the last. */
async function playRound(result: { current: ReturnType<typeof useDrillRounds> }) {
  for (let i = 0; i < SIZE; i++) {
    const id = result.current.nextItem()!;
    act(() => result.current.record(id, i % 2 === 0));
  }
  let ended = false;
  act(() => {
    ended = result.current.advance();
  });
  return ended;
}

// Node's own experimental `localStorage` global shadows jsdom's — use a plain
// in-memory Storage so the hook's persistence is exercised for real.
const store = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

beforeEach(() => {
  localStorage.clear();
  session.current = null;
  server.progress = { items: {}, rounds: 0 };
  server.saves = [];
  server.failSaves = false;
});

describe("useDrillRounds — anonymous", () => {
  it("plays one free round, then gates", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.gated).toBe(false);
    expect(result.current.roundNumber).toBe(1);

    const asked = new Set<string>();
    for (let i = 0; i < SIZE; i++) {
      const id = result.current.nextItem()!;
      asked.add(id);
      act(() => result.current.record(id, true));
      if (i < SIZE - 1) expect(result.current.advance()).toBe(false);
    }
    expect(asked.size).toBe(SIZE);

    let ended = false;
    act(() => {
      ended = result.current.advance();
    });
    expect(ended).toBe(true);
    expect(result.current.gated).toBe(true);
    expect(result.current.complete).toBe(true);
    expect(result.current.roundNumber).toBe(1);
    expect(server.saves).toHaveLength(0);
  });

  it("ends the round when the last answer and the advance land in one tick", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    for (let i = 0; i < SIZE - 1; i++) {
      act(() => result.current.record(result.current.nextItem()!, true));
    }
    // Record + advance in the same handler, as the subnetting drill does on a
    // correct answer: the advance must see the just-recorded answer.
    let ended = false;
    act(() => {
      result.current.record(result.current.nextItem()!, true);
      ended = result.current.advance();
    });
    expect(ended).toBe(true);
    expect(result.current.gated).toBe(true);
    // A late advance (e.g. a stale auto-advance timer) doesn't count a round twice.
    act(() => {
      result.current.advance();
    });
    expect(result.current.progress.rounds).toBe(1);
  });

  it("keeps the gate across a reload", async () => {
    const first = setup();
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    await playRound(first.result);
    first.unmount();

    const again = setup();
    await waitFor(() => expect(again.result.current.ready).toBe(true));
    expect(again.result.current.gated).toBe(true);
    expect(again.result.current.progress.rounds).toBe(1);
  });

  it("can't start another round without an account", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    await playRound(result);
    act(() => result.current.startNextRound());
    expect(result.current.gated).toBe(true);
  });
});

describe("useDrillRounds — signing up from the gate", () => {
  it("merges the round into the account, saves it, and starts round 2", async () => {
    server.progress = { items: { p34: { a: 3, c: 3, s: 3, t: 1 } }, rounds: 0 };
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    await playRound(result);
    const missedInRound1 = Object.entries(result.current.progress.items)
      .filter(([, r]) => r.s === 0)
      .map(([id]) => id);

    await act(() => result.current.linkAccount("user-1", "a@b.co", "email_signup"));

    expect(result.current.signedIn).toBe(true);
    expect(result.current.gated).toBe(false);
    expect(result.current.complete).toBe(false);
    expect(result.current.roundNumber).toBe(2);
    expect(result.current.linked).toBe(true);
    expect(result.current.account).toBe("saved");
    // Saved = this device's round + what the account already had.
    const saved = server.saves.at(-1) as { items: Record<string, unknown>; rounds: number };
    expect(Object.keys(saved.items)).toHaveLength(SIZE + 1);
    expect(saved.rounds).toBe(1);
    // Round 2 opens with one of round 1's misses.
    expect(missedInRound1).toContain(result.current.nextItem());
    const stored = JSON.parse(localStorage.getItem("cb_drill_ports")!);
    expect(stored.owner).toBe("user-1");
  });

  it("only claims a save that actually happened", async () => {
    server.failSaves = true;
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    await playRound(result);
    await act(() => result.current.linkAccount("user-1", undefined, "email_login"));
    expect(result.current.signedIn).toBe(true);
    expect(result.current.account).toBe("error");
  });
});

describe("useDrillRounds — signed in", () => {
  it("returning from Google with an anonymous round carries it into the account", async () => {
    const anon = setup();
    await waitFor(() => expect(anon.result.current.ready).toBe(true));
    await playRound(anon.result);
    anon.unmount();

    session.current = { user: { id: "user-1" } };
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.signedIn).toBe(true);
    expect(result.current.gated).toBe(false);
    // The finished round shows its reveal, now with a "saved" confirmation.
    expect(result.current.complete).toBe(true);
    expect(result.current.linked).toBe(true);
    await waitFor(() => expect(result.current.account).toBe("saved"));
    act(() => result.current.startNextRound());
    expect(result.current.complete).toBe(false);
    expect(result.current.roundNumber).toBe(2);
  });

  it("never folds another account's progress from a shared device into this one", async () => {
    localStorage.setItem(
      "cb_drill_ports",
      JSON.stringify({
        v: 1,
        owner: "someone-else",
        progress: { items: { p1: { a: 9, c: 9, s: 9, t: 1 } }, rounds: 5 },
        round: null,
      })
    );
    session.current = { user: { id: "user-1" } };
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.progress).toEqual({ items: {}, rounds: 0 });
    expect(server.saves).toHaveLength(0);
  });

  it("plays unlimited rounds and saves each one", async () => {
    session.current = { user: { id: "user-1" } };
    const { result } = setup();
    await waitFor(() => expect(result.current.ready).toBe(true));
    for (let n = 1; n <= 3; n++) {
      expect(result.current.roundNumber).toBe(n);
      expect(await playRound(result)).toBe(true);
      expect(result.current.gated).toBe(false);
      act(() => result.current.startNextRound());
    }
    await waitFor(() =>
      expect((server.saves.at(-1) as { rounds: number }).rounds).toBe(3)
    );
  });
});

describe("useDrillRounds — disabled (workspace)", () => {
  it("is inert: no rounds, no gate, no planned items", async () => {
    const { result } = renderHook(() =>
      useDrillRounds({ tool: "ports", ids: IDS, enabled: false })
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.nextItem()).toBeNull();
    expect(result.current.advance()).toBe(false);
    expect(result.current.gated).toBe(false);
    expect(result.current.complete).toBe(false);
  });
});
