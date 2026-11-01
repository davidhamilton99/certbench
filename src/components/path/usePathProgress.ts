"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { api } from "@/lib/api-client";
import { identifyUser, track } from "@/lib/analytics";
import { getPathProgress, savePathProgress } from "@/contracts/path";
import { readLocalPath, writeLocalPath, type LocalPath as LocalState } from "./local-path";
import {
  finishStop,
  hasStarted,
  mergePathProgress,
  recordRep,
  retireReps,
  sanitizePathProgress,
} from "@/core/path/progress";
import {
  EMPTY_PATH_PROGRESS,
  type CheckpointResult,
  type PathCert,
  type PathGoal,
  type PathProgress,
} from "@/core/path/types";

export type PathAccess = "anonymous" | "free" | "pro";
export type LinkMethod = "email_signup" | "email_login";

interface View {
  ready: boolean;
  userId: string | null;
  email: string | null;
  owner: string | null;
  progress: PathProgress;
  access: PathAccess;
  /** Pro subscriber who hasn't added this exam yet. */
  proPlan: boolean;
  /** The exam's certification id, once the account has been asked. */
  certId: string | null;
  /** false when the account can't store progress yet; null when unknown. */
  stored: boolean | null;
}

const INITIAL: View = {
  ready: false,
  userId: null,
  email: null,
  owner: null,
  progress: EMPTY_PATH_PROGRESS,
  access: "anonymous",
  proPlan: false,
  certId: null,
  stored: null,
};

/** Save to the account after this many unsaved answers (and at every stop end). */
const SAVE_EVERY = 5;

/**
 * One exam's path progress: kept on this device for everyone, and merged into
 * and saved to the account once signed in (other devices' work included). The
 * same ref-backed pattern as the drills, so a record-then-advance in one click
 * always sees the latest state.
 */
export function usePathProgress(cert: PathCert) {
  const [view, setView] = useState<View>(INITIAL);
  const cur = useRef<View>(INITIAL);
  const unsaved = useRef(0);

  const commit = useCallback(
    (next: View) => {
      cur.current = next;
      setView(next);
      writeLocalPath(cert, { v: 1, owner: next.owner, progress: next.progress });
    },
    [cert]
  );

  const saveToAccount = useCallback(
    async (p: PathProgress) => {
      unsaved.current = 0;
      try {
        const { stored } = await api(savePathProgress, { cert, progress: p });
        if (cur.current.stored !== stored) {
          cur.current = { ...cur.current, stored };
          setView(cur.current);
        }
      } catch {
        /* offline or signed out — it's on the device and goes up next time */
      }
    },
    [cert]
  );

  /** Pull the account's saved path and merge this device's into it. */
  const adopt = useCallback(
    async (uid: string, local: LocalState | null) => {
      let server = EMPTY_PATH_PROGRESS;
      let access: PathAccess = "free";
      let proPlan = false;
      let certId: string | null = null;
      let stored: boolean | null = null;
      try {
        const res = await api(getPathProgress, { cert });
        server = sanitizePathProgress(res.progress);
        access = res.access;
        proPlan = res.proPlan;
        certId = res.certId;
        stored = res.stored;
      } catch {
        /* account unreachable — carry on with this device's progress */
      }
      // Only fold in progress that's anonymous or already this account's —
      // never another account's from a shared device.
      const mine = local && (local.owner === null || local.owner === uid) ? local : null;
      const merged = mergePathProgress(server, mine?.progress ?? EMPTY_PATH_PROGRESS);
      const carried = mine?.owner === null && hasStarted(mine.progress);
      const unsynced = !!mine && hasStarted(mine.progress);
      return { merged, carried, unsynced, access, proPlan, certId, stored };
    },
    [cert]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocalPath(cert);
      let uid: string | null = null;
      let email: string | null = null;
      try {
        const { data } = await createClient().auth.getSession();
        uid = data.session?.user.id ?? null;
        email = data.session?.user.email ?? null;
      } catch {
        /* auth unreachable — treat as anonymous */
      }

      if (!uid) {
        if (cancelled) return;
        commit({
          ...INITIAL,
          ready: true,
          // Keep the stored owner: a signed-out account's progress stays theirs.
          owner: local?.owner ?? null,
          progress: local?.owner ? EMPTY_PATH_PROGRESS : (local?.progress ?? EMPTY_PATH_PROGRESS),
        });
        return;
      }

      const res = await adopt(uid, local);
      if (cancelled) return;
      commit({
        ready: true,
        userId: uid,
        email,
        owner: uid,
        progress: res.merged,
        access: res.access,
        proPlan: res.proPlan,
        certId: res.certId,
        stored: res.stored,
      });
      // Back from Google with an anonymous stop to keep: it's theirs now.
      if (res.carried) track("path_account_linked", { cert, method: "redirect" });
      if (res.unsynced) void saveToAccount(res.merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [cert, adopt, commit, saveToAccount]);

  // Flush unsaved answers when the tab is hidden or closed.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState !== "hidden") return;
      const { userId, progress } = cur.current;
      if (userId && unsaved.current > 0) void saveToAccount(progress);
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [saveToAccount]);

  const record = useCallback(
    (repId: string, correct: boolean) => {
      const c = cur.current;
      commit({ ...c, progress: recordRep(c.progress, repId, correct, Date.now()) });
      if (c.userId && ++unsaved.current >= SAVE_EVERY) void saveToAccount(cur.current.progress);
    },
    [commit, saveToAccount]
  );

  const finish = useCallback(
    (stopId: string, correct: number, total: number, checkpoint?: CheckpointResult) => {
      const c = cur.current;
      let p = finishStop(c.progress, stopId, correct, total, Date.now());
      if (checkpoint) p = { ...p, checkpoint };
      commit({ ...c, progress: p });
      if (c.userId) void saveToAccount(p);
    },
    [commit, saveToAccount]
  );

  /** Clear misses the server can no longer bring back (their content was withdrawn). */
  const retire = useCallback(
    (repIds: readonly string[]) => {
      const c = cur.current;
      const p = retireReps(c.progress, repIds, Date.now());
      if (p === c.progress) return;
      commit({ ...c, progress: p });
      if (c.userId) void saveToAccount(p);
    },
    [commit, saveToAccount]
  );

  const setGoal = useCallback(
    (goal: Omit<PathGoal, "at">) => {
      const c = cur.current;
      const p = { ...c.progress, goal: { ...goal, at: Date.now() } };
      commit({ ...c, progress: p });
      if (c.userId) void saveToAccount(p);
    },
    [commit, saveToAccount]
  );

  /**
   * They just signed up or logged in on this page: carry the device's path
   * into the account and save it.
   */
  const linkAccount = useCallback(
    async (uid: string, email: string | undefined, method: LinkMethod) => {
      identifyUser(uid, { email });
      track("path_account_linked", { cert, method });
      const c = cur.current;
      const res = await adopt(uid, { v: 1, owner: c.owner, progress: c.progress });
      commit({
        ready: true,
        userId: uid,
        email: email ?? null,
        owner: uid,
        progress: res.merged,
        access: res.access,
        proPlan: res.proPlan,
        certId: res.certId,
        stored: res.stored,
      });
      await saveToAccount(res.merged);
    },
    [cert, adopt, commit, saveToAccount]
  );

  /** Re-ask the account what it can open (after a purchase elsewhere, say). */
  const refreshAccess = useCallback(async () => {
    const c = cur.current;
    if (!c.userId) return;
    const res = await adopt(c.userId, { v: 1, owner: c.owner, progress: c.progress });
    commit({ ...cur.current, progress: res.merged, access: res.access, proPlan: res.proPlan, certId: res.certId });
  }, [adopt, commit]);

  return {
    ...view,
    signedIn: view.userId !== null,
    record,
    finish,
    retire,
    setGoal,
    linkAccount,
    refreshAccess,
  };
}

export type PathProgressState = ReturnType<typeof usePathProgress>;
