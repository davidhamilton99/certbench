"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase-browser";
import { api } from "@/lib/api-client";
import { identifyUser, track } from "@/lib/analytics";
import { getDrillProgress, saveDrillProgress } from "@/contracts/tools";
import {
  EMPTY_PROGRESS,
  mergeProgress,
  planRound,
  recordAnswer,
  ROUND_SIZE,
  sanitizeProgress,
  type DrillProgress,
  type DrillTool,
} from "@/core/drill-rounds/drill-rounds";

interface RoundState {
  /** Item ids in the order this round asks them (empty for skill drills). */
  queue: string[];
  answered: number;
  correct: number;
  /** The visitor moved past the last question — the round reveal is showing. */
  done: boolean;
}

/** What this device remembers, so a reload never resets a round or the gate. */
interface LocalState {
  v: 1;
  /** Account the progress belongs to; null = anonymous visitor. */
  owner: string | null;
  progress: DrillProgress;
  round: RoundState | null;
}

/** What the hook renders from: who's here, whose progress it is, and the round. */
interface View {
  userId: string | null;
  owner: string | null;
  progress: DrillProgress;
  round: RoundState | null;
}

const EMPTY_VIEW: View = { userId: null, owner: null, progress: EMPTY_PROGRESS, round: null };

export type AccountSave = "none" | "saving" | "saved" | "error";
export type LinkMethod = "email_signup" | "email_login";

/** Save to the account after this many unsaved answers (plus at round end). */
const SAVE_EVERY = 5;

const storageKey = (tool: DrillTool) => `cb_drill_${tool}`;

const emptySubscribe = () => () => {};

/** True after hydration — drills create random questions only once mounted. */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function readLocal(tool: DrillTool): LocalState | null {
  try {
    const raw = window.localStorage.getItem(storageKey(tool));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalState>;
    const r = parsed.round;
    const round =
      r && Array.isArray(r.queue) && Number.isSafeInteger(r.answered) && Number.isSafeInteger(r.correct)
        ? {
            queue: r.queue.filter((id): id is string => typeof id === "string"),
            answered: r.answered,
            correct: r.correct,
            done: r.done === true,
          }
        : null;
    return {
      v: 1,
      owner: typeof parsed.owner === "string" ? parsed.owner : null,
      progress: sanitizeProgress(parsed.progress),
      round,
    };
  } catch {
    return null;
  }
}

function writeLocal(tool: DrillTool, state: LocalState): void {
  try {
    window.localStorage.setItem(storageKey(tool), JSON.stringify(state));
  } catch {
    /* storage blocked — the round still works for this tab */
  }
}

function freshRound(ids: readonly string[], progress: DrillProgress, size: number): RoundState {
  return { queue: planRound(ids, progress.items, size), answered: 0, correct: 0, done: false };
}

/**
 * Drives a free drill in rounds. Anonymous visitors get one round; after it,
 * `gated` is true and the drill shows the round reveal with an inline signup.
 * Signed-in visitors get unlimited rounds, each planned from their misses, with
 * progress merged into and saved to their account.
 *
 * `enabled: false` (the Pro workspace) makes the hook inert: no rounds, no gate.
 */
export function useDrillRounds({
  tool,
  ids,
  enabled = true,
  size = ROUND_SIZE,
}: {
  tool: DrillTool;
  /** Every item the drill can ask (ports, acronyms) or skill it tracks. */
  ids: readonly string[];
  enabled?: boolean;
  size?: number;
}) {
  const mounted = useMounted();
  const [resolved, setResolved] = useState(false);
  // Disabled (workspace): no rounds to resolve, only hydration to wait for.
  const ready = mounted && (!enabled || resolved);
  const [view, setView] = useState<View>(EMPTY_VIEW);
  const [account, setAccount] = useState<AccountSave>("none");
  /** Progress was just carried into the account (shown once as a confirmation). */
  const [linked, setLinked] = useState(false);

  // The source of truth for every handler, updated synchronously: a drill can
  // record then advance in one click, or advance from a timer set before the
  // last render — both must see the round as it is now, not as last rendered.
  const cur = useRef<View>(EMPTY_VIEW);
  const unsaved = useRef(0);

  const commit = useCallback(
    (next: View) => {
      cur.current = next;
      setView(next);
      writeLocal(tool, { v: 1, owner: next.owner, progress: next.progress, round: next.round });
    },
    [tool]
  );

  const saveToAccount = useCallback(
    async (p: DrillProgress) => {
      unsaved.current = 0;
      setAccount("saving");
      try {
        await api(saveDrillProgress, { tool, progress: p });
        setAccount("saved");
      } catch {
        setAccount("error");
      }
    },
    [tool]
  );

  /** Pull the account's saved progress and merge this device's into it. */
  const adopt = useCallback(
    async (uid: string, local: LocalState | null) => {
      let server = EMPTY_PROGRESS;
      try {
        ({ progress: server } = await api(getDrillProgress, { tool }));
      } catch {
        /* account unreachable — carry on with this device's progress */
      }
      // Only fold in progress that's anonymous or already this account's —
      // never another account's from a shared device.
      const mine = local && (local.owner === null || local.owner === uid) ? local : null;
      const merged = mergeProgress(server, mine?.progress ?? EMPTY_PROGRESS);
      const carried = mine?.owner === null && mine.progress.rounds > 0;
      // Anything answered on this device may not have reached the account
      // (a failed or cut-off save) — push the merge back up.
      const unsynced = Object.keys(mine?.progress.items ?? {}).length > 0;
      return { merged, carried, unsynced, round: mine?.round ?? null };
    },
    [tool]
  );

  // Resolve who's here and what they've done, once.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const local = readLocal(tool);
      let uid: string | null = null;
      try {
        const { data } = await createClient().auth.getSession();
        uid = data.session?.user.id ?? null;
      } catch {
        /* auth unreachable — treat as anonymous */
      }

      if (!uid) {
        if (cancelled) return;
        const p = local?.progress ?? EMPTY_PROGRESS;
        // Keep the stored owner: a signed-out account's progress stays theirs.
        commit({
          userId: null,
          owner: local?.owner ?? null,
          progress: p,
          round: local?.round ?? freshRound(ids, p, size),
        });
        setResolved(true);
        return;
      }

      const { merged, carried, unsynced, round: localRound } = await adopt(uid, local);
      if (cancelled) return;
      commit({
        userId: uid,
        owner: uid,
        progress: merged,
        round: localRound ?? freshRound(ids, merged, size),
      });
      setResolved(true);
      // Arrived back signed in (e.g. from Google) with an anonymous round to
      // keep: save it to the account now, and say so on the reveal.
      if (carried) {
        setLinked(true);
        track("drill_account_linked", { tool, method: "redirect" });
      }
      if (carried || unsynced) void saveToAccount(merged);
    })();
    return () => {
      cancelled = true;
    };
    // ids/size are fixed for a drill's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tool]);

  // Flush unsaved answers when the tab is hidden or closed.
  useEffect(() => {
    if (!enabled) return;
    function onHide() {
      if (document.visibilityState !== "hidden") return;
      const { userId, progress } = cur.current;
      if (userId && unsaved.current > 0) void saveToAccount(progress);
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [enabled, saveToAccount]);

  const { userId, progress, round } = view;
  const gated = enabled && ready && userId === null && progress.rounds >= 1;
  const complete = enabled && ready && (gated || round?.done === true);

  /** The item the next question should ask about (null for skill drills, or when disabled). */
  const nextItem = useCallback((): string | null => {
    const r = cur.current.round;
    return enabled && r && r.answered < r.queue.length ? r.queue[r.answered] : null;
  }, [enabled]);

  /** Call once per graded answer. */
  const record = useCallback(
    (id: string, correct: boolean) => {
      const { progress: p0, round: r0, userId: uid } = cur.current;
      if (!enabled || !r0 || r0.done || r0.answered >= size) return;
      const p = { ...p0, items: recordAnswer(p0.items, id, correct, Date.now()) };
      const r = { ...r0, answered: r0.answered + 1, correct: r0.correct + (correct ? 1 : 0) };
      commit({ ...cur.current, progress: p, round: r });
      if (uid && ++unsaved.current >= SAVE_EVERY) void saveToAccount(p);
    },
    [enabled, size, commit, saveToAccount]
  );

  /**
   * Call when the visitor moves on from an answered question. Returns true when
   * the round is over — hold the drill; the round reveal takes over.
   */
  const advance = useCallback((): boolean => {
    const { progress: p0, round: r0, userId: uid } = cur.current;
    if (!enabled || !r0) return false;
    if (r0.done) return true;
    if (r0.answered < size) return false;
    const p = { ...p0, rounds: p0.rounds + 1 };
    commit({ ...cur.current, progress: p, round: { ...r0, done: true } });
    setLinked(false);
    track("drill_round_completed", {
      tool,
      round: p.rounds,
      correct: r0.correct,
      size,
      signed_in: uid !== null,
    });
    if (uid) void saveToAccount(p);
    return true;
  }, [enabled, size, commit, tool, saveToAccount]);

  /** Signed-in only: start the next round, planned from what they've missed. */
  const startNextRound = useCallback(() => {
    const { userId: uid, progress: p } = cur.current;
    if (!enabled || !uid) return;
    commit({ ...cur.current, round: freshRound(ids, p, size) });
    setLinked(false);
  }, [enabled, ids, size, commit]);

  /**
   * The visitor just signed up or logged in on this page: carry their round
   * into the account, save it, and go straight into the next round.
   */
  const linkAccount = useCallback(
    async (uid: string, email: string | undefined, method: LinkMethod) => {
      identifyUser(uid, { email });
      track("drill_account_linked", { tool, method });
      const { owner, progress: p, round: r } = cur.current;
      const { merged } = await adopt(uid, { v: 1, owner, progress: p, round: r });
      commit({ userId: uid, owner: uid, progress: merged, round: freshRound(ids, merged, size) });
      setLinked(true);
      await saveToAccount(merged);
    },
    [tool, adopt, commit, ids, size, saveToAccount]
  );

  return {
    tool,
    enabled,
    ready,
    signedIn: userId !== null,
    gated,
    complete,
    /** Round number in play (or just finished, while the reveal shows). */
    roundNumber: complete ? progress.rounds : progress.rounds + 1,
    answered: round?.answered ?? 0,
    roundCorrect: round?.correct ?? 0,
    size,
    progress,
    account,
    linked,
    nextItem,
    record,
    advance,
    startNextRound,
    linkAccount,
  };
}

export type DrillRounds = ReturnType<typeof useDrillRounds>;
