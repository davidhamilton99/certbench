"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasSessionCookie, loadBrowserClient } from "@/lib/supabase-lazy";
import { api } from "@/lib/api-client";
import { identifyUser, track } from "@/lib/analytics";
// Named without their schemas, so the schema library and the sign-in client
// are not part of the page's first load: each arrives with its first use.
import { getPathProgress, savePathProgress } from "@/contracts/client";
import { ApiError, type ApiErrorCode } from "@/contracts/errors";
import { PAGE_OUT_OF_DATE } from "@/lib/errors/user-message";
import type { RegionPricing } from "@/lib/pricing/ppp";
import {
  clearGuestPath,
  readGuestClaim,
  readGuestPath,
  readLocalPath,
  writeGuestPath,
  writeLocalPath,
  type LocalPath as LocalState,
} from "./local-path";
import { carryOverPreV15Path } from "./carry-over";
import { begunOnPublicPage, clearBegunOnPublicPage, oweStartEvent, startEventOwed } from "./path-start";
import { carryFromEarlierVersion, type VersionCarry } from "./version-carry";
import { pathGuestKey, pathStorageKey } from "./storage-key";
import {
  addsTo,
  finishLab as finishLabRun,
  finishStop,
  hasStarted,
  mergePathProgress,
  recordRep,
  retireReps,
  sanitizePathProgress,
} from "@/core/path/progress";
import { addRehearsal } from "@/core/path/rehearsal";
import { importExam as bringExam, type ExamAnswer } from "@/core/path/exam-import";
import {
  EMPTY_PATH_PROGRESS,
  type CheckpointResult,
  type PathCert,
  type PathGoal,
  type PathProgress,
  type RehearsalResult,
} from "@/core/path/types";

/** Report a carry from an earlier exam version (Security+ SY0-701 → SY0-801). */
const trackCarry = (cert: PathCert, carry: VersionCarry) =>
  track("path_version_carried", {
    from: carry.from,
    to: cert,
    answers: carry.answers,
    labs: carry.labs,
    source: carry.source,
  });

/**
 * A first visit to a newer exam version carries this device's answers on the
 * earlier one. When a public page began that earlier copy (the home page's
 * sample questions are SY0-701's), its page still owes `path_started`
 * (path-start.ts), and the carried copy here has started already: this page
 * then owes it too, for the visitor's first answer here. The earlier version
 * keeps its own mark, as it keeps its own copy. Nothing is passed on when the
 * answers came from an account, whose study path began elsewhere, or when an
 * answer given on this page has already recorded the event.
 */
function passOnOwedStart(cert: PathCert, carry: VersionCarry, answeredHere: boolean) {
  if (carry.source === "device" && !answeredHere && startEventOwed(carry.from)) oweStartEvent(cert);
}

/**
 * How much of the path the person may open. "unknown" is a signed-in learner
 * whose account has not been reached yet: nothing is locked and nothing is
 * offered until the account has answered, and the server decides each request.
 */
export type PathAccess = "anonymous" | "free" | "pro" | "unknown";
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
  /**
   * The account's last payment did not go through. It has no Pro while the
   * payment is owed, and the checkout would refuse it a second plan: where the
   * page would make the offer, it shows the way to the billing page instead.
   * False until the account has said so.
   */
  paymentPastDue: boolean;
  /** The exam's certification id, once the account has been asked. */
  certId: string | null;
  /**
   * The offer's prices for this learner's region, as the account's answer
   * gives them, so that the offer shows its prices at once. Null until the
   * account has answered with them: the offer then asks for them itself.
   */
  pricing: RegionPricing | null;
  /** false when the account can't store progress yet; null when unknown. */
  stored: boolean | null;
  /**
   * Signed out on a device that holds an account's path: that account's copy,
   * so the page can offer to sign back in to it. Null otherwise.
   */
  held: PathProgress | null;
  /**
   * Signed in, and the last attempt to read the account failed. The page shows
   * what this device holds, keeps what it last knew about the account, says
   * so, and asks again by itself.
   */
  unreached: boolean;
  /**
   * The latest save to the account failed, with the API's error code
   * ("internal" includes a lost connection). Null once a save has succeeded.
   */
  saveFailed: ApiErrorCode | null;
  /** False while the browser refuses to keep the progress on the device. */
  deviceSaves: boolean;
  /**
   * A new version of the site was published while this page was open, and the
   * part of the page that reads the account's answers can no longer be
   * fetched (PAGE_OUT_OF_DATE). The server carries each request out, and the
   * page cannot read what it answers. Asking again cannot help, so the page
   * stops asking by itself and says to load the page again. It stays true
   * until the page is loaded again.
   */
  outOfDate: boolean;
  /**
   * This account arrived on a device whose copy of the path belonged to
   * another account. Work that the device keeps without a name on it (a
   * practice exam from a public page) is then not this account's to take.
   */
  foreign: boolean;
  /**
   * The account's own copy of this path had been started before this device's
   * work was added to it, as the account answered when it was first reached on
   * this visit. False for a visitor, and until the account has answered. A
   * start that a public page left owed (path-start.ts) is then not this
   * learner's first: their study path began long before.
   */
  accountStarted: boolean;
  /**
   * Counts each time the page learns who is here or what their account holds:
   * when it opens, when a slow sign-in service answers at last, and when an
   * account that could not be reached is reached. The page decides where the
   * learner belongs once for each.
   */
  arrival: number;
}

const INITIAL: View = {
  ready: false,
  userId: null,
  email: null,
  owner: null,
  progress: EMPTY_PATH_PROGRESS,
  access: "anonymous",
  proPlan: false,
  paymentPastDue: false,
  certId: null,
  pricing: null,
  stored: null,
  held: null,
  unreached: false,
  saveFailed: null,
  deviceSaves: true,
  outOfDate: false,
  foreign: false,
  accountStarted: false,
  arrival: 0,
};

/** Save to the account after this many unsaved answers (and at every stop end). */
const SAVE_EVERY = 5;

/**
 * How long the page waits to learn who is here and what their account holds
 * before it shows what this device holds. A returning learner's stage is held
 * for this long at most (see path-hold.ts).
 */
export const ACCOUNT_LIMIT_MS = 6000;

/** The shortest time an account request is given, however late it starts. */
const ACCOUNT_MIN_MS = 2000;

/** After the account could not be reached: when it is asked again, counted from the failure. */
const RETRY_AT_MS = [1000, 3000, 8000];

/** After a save failed: when it is sent again without waiting for the next answer. */
const SAVE_AGAIN_MS = 8000;

/**
 * The largest save that may be sent as the tab is hidden or closed and still
 * be allowed to outlive it. Browsers allow 64 KB for such requests in total;
 * a larger save is sent the ordinary way, as before.
 */
const KEEPALIVE_MAX_BYTES = 60_000;

/**
 * Whether a request failed because this page is out of date: the server
 * answered, and the file that reads its answer is no longer there to fetch
 * (see `api()` in src/lib/api-client.ts).
 */
const isOutOfDate = (err: unknown) => err instanceof ApiError && err.message === PAGE_OUT_OF_DATE;

/**
 * The offer's prices for the learner's region, from the account's answer
 * (GET /api/path/progress sends them beside the progress). The answer is read
 * through its contract, which lists `pricing` once src/contracts/path.ts does;
 * until then the field is left out of what is read, and the offer asks for its
 * prices itself, as it always has.
 */
function pricingOf(answer: object): RegionPricing | null {
  const pricing = (answer as { pricing?: unknown }).pricing;
  return pricing && typeof pricing === "object" && "prices" in pricing ? (pricing as RegionPricing) : null;
}

/** Who the sign-in service says is here. */
interface Person {
  uid: string;
  email: string | null;
}

/** What the account answered when it was asked for this path. */
type Account =
  | {
      reached: true;
      access: "free" | "pro";
      proPlan: boolean;
      paymentPastDue: boolean;
      certId: string;
      pricing: RegionPricing | null;
      stored: boolean;
    }
  /**
   * `signedOut`: the server answered that nobody is signed in, and the
   * browser's own sign-in client says so as well (see `browserSaysSignedOut`).
   */
  | { reached: false; signedOut: boolean };

async function readSession(): Promise<Person | null> {
  // No session cookie means that nobody is signed in on this browser: the
  // answer is known at once, and the sign-in client is never fetched for it.
  if (!hasSessionCookie()) return null;
  try {
    const { data } = await (await loadBrowserClient()).auth.getSession();
    const user = data.session?.user;
    return user ? { uid: user.id, email: user.email ?? null } : null;
  } catch {
    // The sign-in service could not be read: the visit carries on as a visitor's.
    return null;
  }
}

/**
 * True for an answer of the sign-in service that says nothing about who is
 * signed in: it could not be reached, or it failed on its own side. The same
 * rule as the server's (src/server/auth.ts).
 */
function unsettled(error: { name?: string; status?: number } | null | undefined): boolean {
  if (!error) return false;
  if (error.name === "AuthRetryableFetchError" || error.name === "AuthUnknownError") return true;
  return typeof error.status === "number" && (error.status === 0 || error.status >= 500);
}

/**
 * Whether the browser's own sign-in client agrees that nobody is signed in.
 * It is asked when the server has answered "signed out" to a page that holds
 * a session: the second lock on that answer. The first is the server's own,
 * which answers "the account could not be checked", and not "signed out",
 * when its session check failed or ran out of time.
 *
 * A wrong "signed out" shows a member the visitor's screen, with their
 * progress put away and nothing asked again, so it is believed only when the
 * client says the same. The client asks the sign-in service itself, and does
 * not only read its cookie: a session that was ended on another device still
 * has its cookie here, and such a learner is to be shown the way to sign in
 * again, not a notice that their account cannot be reached.
 *
 *   - It names the user: the session is good and the server's answer is not
 *     believed. The account is "not reached", and it is asked again.
 *   - The sign-in service answers that there is no such session: signed out.
 *   - It cannot be asked: nothing is known, so the account is "not reached".
 *
 * The client is in memory already whenever the browser holds a session
 * cookie (`readSession`), so nothing is fetched to ask it.
 */
async function browserSaysSignedOut(): Promise<boolean> {
  if (!hasSessionCookie()) return true;
  try {
    const { data, error } = await (await loadBrowserClient()).auth.getUser();
    if (data.user) return false;
    return !unsettled(error);
  } catch {
    return false;
  }
}

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
      let kept = next.deviceSaves;
      // Until the page knows whose copy the device holds, an answer stays in
      // memory: the page folds it in, and writes it, once it knows.
      if (next.ready) {
        if (!next.userId && next.owner) {
          // Signed out on a device that holds an account's path: the account's
          // copy stays as it is (it can hold work the account hasn't stored yet,
          // and signing back in carries it up). This page's work goes beside it,
          // for whichever account signs in next; a Google sign-in reloads the
          // page, and memory alone lost it (replay, Nov 16).
          if (hasStarted(next.progress)) kept = writeGuestPath(cert, next.progress);
        } else {
          kept = writeLocalPath(cert, { v: 1, owner: next.owner, progress: next.progress });
        }
      }
      const state = kept === next.deviceSaves ? next : { ...next, deviceSaves: kept };
      cur.current = state;
      setView(state);
    },
    [cert]
  );

  /**
   * The page has learned that it is out of date (see `outOfDate`). Whatever
   * the page goes on to learn, this stays: only loading the page again ends it.
   */
  const markOutOfDate = useCallback(() => {
    if (cur.current.outOfDate) return;
    cur.current = { ...cur.current, outOfDate: true };
    setView(cur.current);
  }, []);

  /** Failure codes already reported this visit, so one failing save is one event. */
  const reportedFailures = useRef(new Set<string>());
  /** The number of the latest save sent: only its outcome says whether the account is up to date. */
  const saveCount = useRef(0);

  const saveToAccount = useCallback(
    async (p: PathProgress, { leaving = false }: { leaving?: boolean } = {}) => {
      unsaved.current = 0;
      const sent = ++saveCount.current;
      const settle = (saveFailed: ApiErrorCode | null, stored = cur.current.stored) => {
        // An earlier save that finishes after a later one says nothing new.
        if (sent !== saveCount.current) return;
        if (cur.current.saveFailed === saveFailed && cur.current.stored === stored) return;
        cur.current = { ...cur.current, saveFailed, stored };
        setView(cur.current);
      };
      try {
        // Sent as it would be read back, so nothing malformed in memory can
        // get the whole save refused.
        const input = { cert, progress: sanitizePathProgress(p) };
        // A save sent as the tab goes away must be allowed to outlive it, or
        // the browser may drop it. Ids and dates are plain ASCII, so the
        // length of the text is its size in bytes.
        const keepalive = leaving && JSON.stringify(input).length < KEEPALIVE_MAX_BYTES;
        const { stored } = await api(savePathProgress, input, keepalive ? { keepalive: true } : {});
        settle(null, stored);
      } catch (err) {
        if (isOutOfDate(err)) {
          // The server carried the save out: it is the answer that this page
          // can no longer read. Nothing failed, so nothing is counted as a
          // failed save and nothing is sent again. The page says that it is
          // out of date, which only loading it again puts right.
          settle(null);
          markOutOfDate();
          return;
        }
        // It's on the device and goes up next time. Offline shows as "internal".
        const code = err instanceof ApiError ? err.code : "internal";
        if (!reportedFailures.current.has(code)) {
          reportedFailures.current.add(code);
          track("path_save_failed", { cert, code });
        }
        settle(code);
      }
    },
    [cert, markOutOfDate]
  );

  /**
   * Pull the account's saved path and merge this device's into it, and any
   * guest work played beside another account's copy (whoever signs in played it).
   */
  const adopt = useCallback(
    async (uid: string, local: LocalState | null, guest: PathProgress | null = null, timeoutMs?: number) => {
      let server = EMPTY_PATH_PROGRESS;
      let account: Account;
      try {
        const res = await api(getPathProgress, { cert }, timeoutMs ? { timeoutMs } : {});
        server = sanitizePathProgress(res.progress);
        account = {
          reached: true,
          access: res.access,
          proPlan: res.proPlan,
          // The server sends it only when it is true.
          paymentPastDue: res.paymentPastDue === true,
          certId: res.certId,
          pricing: pricingOf(res),
          stored: res.stored,
        };
      } catch (err) {
        // The account was not reached: what it holds and what it may open stay
        // unknown (never "free"), and the page carries on with this device's
        // progress. "Signed out" is believed only when the browser's own
        // sign-in client says so as well; otherwise the account was simply not
        // reached, and it is asked again.
        const refused = err instanceof ApiError && err.code === "unauthorized";
        account = { reached: false, signedOut: refused && (await browserSaysSignedOut()) };
        // The account answered, and this page can no longer read its answers:
        // the page says so, and does not go on asking.
        if (isOutOfDate(err)) markOutOfDate();
      }
      // Only progress that is anonymous or already this account's is folded
      // in: never another account's from a shared device.
      const mine = local && (local.owner === null || local.owner === uid) ? local : null;
      const played = guest && hasStarted(guest) ? guest : null;
      const merged = mergePathProgress(
        mergePathProgress(server, mine?.progress ?? EMPTY_PATH_PROGRESS),
        played ?? EMPTY_PATH_PROGRESS
      );
      return {
        merged,
        /** The account's own copy, before anything from this device was added. */
        server,
        account,
        /** An anonymous visitor's work on this device became this account's. */
        carriedDevice: mine?.owner === null && hasStarted(mine.progress),
        /** Guest work played beside another account's copy became this account's. */
        carriedGuest: played !== null,
        /** The device held work that the account may not have yet. */
        unsynced: (!!mine && hasStarted(mine.progress)) || played !== null,
      };
    },
    [cert, markOutOfDate]
  );

  /** Whether the account has been reached at least once on this visit. */
  const everReached = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const deadline = Date.now() + ACCOUNT_LIMIT_MS;
    // What the page has learned so far, for the time limit below.
    let local: LocalState | null | undefined;
    let who: Person | null | undefined;
    let adopted: Awaited<ReturnType<typeof adopt>> | undefined;

    /**
     * The path as a visitor sees it. Beside an account's copy that is the
     * guest work; the account's own copy is only offered back (`held`).
     */
    const asVisitor = (device: LocalState | null, carry: VersionCarry | null): View => {
      const kept = device?.owner
        ? (readGuestPath(cert) ?? EMPTY_PATH_PROGRESS)
        : (device?.progress ?? EMPTY_PATH_PROGRESS);
      const before = cur.current;
      // Whatever a visitor answered before this moment is folded in, never
      // replaced. (What the page held for an account is that account's, and it
      // is already in the device's copy: it is not a visitor's work.)
      const answered = before.userId === null ? before.progress : EMPTY_PATH_PROGRESS;
      return {
        ...INITIAL,
        ready: true,
        // Keep the stored owner: a signed-out account's progress stays theirs.
        owner: device?.owner ?? null,
        progress: mergePathProgress(carry ? mergePathProgress(kept, carry.progress) : kept, answered),
        held: device?.owner ? device.progress : null,
        deviceSaves: before.deviceSaves,
        outOfDate: before.outOfDate,
        arrival: before.arrival + 1,
      };
    };

    /**
     * The path as its account sees it. Without the account's answer that is
     * what this device holds for it, with nothing locked and nothing offered.
     */
    const asLearner = (
      me: Person,
      device: LocalState | null,
      guest: PathProgress | null,
      carry: VersionCarry | null
    ): View => {
      const mine = device && (device.owner === null || device.owner === me.uid) ? device.progress : EMPTY_PATH_PROGRESS;
      const kept = adopted ? adopted.merged : mergePathProgress(mine, guest ?? EMPTY_PATH_PROGRESS);
      const account = adopted?.account.reached ? adopted.account : null;
      const before = cur.current;
      // What the account said earlier on this visit still stands when this
      // request to it failed (a retry can answer before the first request ends).
      const last = before.userId === me.uid && before.access !== "unknown" ? before : null;
      return {
        ...before,
        ready: true,
        userId: me.uid,
        email: me.email,
        owner: me.uid,
        progress: mergePathProgress(carry ? mergePathProgress(kept, carry.progress) : kept, before.progress),
        access: account ? account.access : last ? last.access : "unknown",
        proPlan: account?.proPlan ?? last?.proPlan ?? false,
        paymentPastDue: account?.paymentPastDue ?? last?.paymentPastDue ?? false,
        certId: account?.certId ?? last?.certId ?? null,
        pricing: account?.pricing ?? last?.pricing ?? null,
        stored: account?.stored ?? last?.stored ?? null,
        held: null,
        unreached: account ? false : last ? last.unreached : true,
        foreign: !!device?.owner && device.owner !== me.uid,
        accountStarted: account && adopted ? hasStarted(adopted.server) : (last?.accountStarted ?? false),
        arrival: before.arrival + 1,
      };
    };

    // The time limit. A returning learner is looking at a held stage: if the
    // sign-in service, the account or a carry-over has not answered by now,
    // the page opens on what this device holds, and what arrives later is
    // merged in when it arrives.
    const limit = window.setTimeout(() => {
      if (cancelled || cur.current.ready) return;
      const device = local === undefined ? readLocalPath(cert) : local;
      commit(who ? asLearner(who, device, readGuestPath(cert), null) : asVisitor(device, null));
    }, ACCOUNT_LIMIT_MS);

    const openForVisitor = async (device: LocalState | null) => {
      const kept = device?.owner ? readGuestPath(cert) : (device?.progress ?? null);
      // A first visit to a newer exam version brings this device's answers on the earlier one.
      const carry = !device?.owner && !(kept && hasStarted(kept)) ? await carryFromEarlierVersion(cert, null) : null;
      if (cancelled) return;
      const answeredHere = hasStarted(cur.current.progress);
      commit(asVisitor(device, carry));
      if (carry) {
        trackCarry(cert, carry);
        passOnOwedStart(cert, carry, answeredHere);
      }
    };

    (async () => {
      await carryOverPreV15Path(cert);
      local = readLocalPath(cert);
      who = await readSession();
      if (cancelled) return;
      if (!who) {
        await openForVisitor(local);
        return;
      }

      // However they got here: back from Google or on a new device, a signed-in
      // learner stays anonymous without this (PostHog runs identified_only).
      identifyUser(who.uid, who.email ? { email: who.email } : undefined);

      const guest = readGuestPath(cert);
      // A public page that took the sign-up has already counted this account.
      const counted = readGuestClaim(cert) === who.uid;
      // Work begun on a public page with no save request shown since: the
      // request did not make this account, wherever it was made (path-start.ts).
      const begunElsewhere = begunOnPublicPage(cert);
      // The request ends just before the time limit, so a learner whose account
      // cannot be reached is shown the device's copy once, with the reason.
      adopted = await adopt(who.uid, local, guest, Math.max(ACCOUNT_MIN_MS, deadline - Date.now() - 250));
      if (cancelled) return;
      if (!adopted.account.reached && adopted.account.signedOut) {
        // The account says that this session has ended, so nobody is signed in:
        // the visit is a visitor's, and the device's copy is offered back.
        who = null;
        adopted = undefined;
        await openForVisitor(local);
        return;
      }

      // A first visit to a newer exam version brings the account's (and this
      // device's) answers on the earlier one. It waits for the account: the
      // carry happens once, and it is not made from half of what there is.
      const carry =
        adopted.account.reached && !hasStarted(adopted.merged) ? await carryFromEarlierVersion(cert, who.uid) : null;
      if (cancelled) return;
      const settled = carry ? mergePathProgress(adopted.merged, carry.progress) : adopted.merged;
      // Answers given while the page was opening are not in the account yet.
      const answeredMeanwhile = addsTo(settled, cur.current.progress);
      const answeredHere = hasStarted(cur.current.progress);
      const next = asLearner(who, local, guest, carry);
      commit(next);
      everReached.current = adopted.account.reached;
      // The guest work is in this account's copy now (and saved, below).
      clearGuestPath(cert);
      // Back from Google with an anonymous stop to keep: it's theirs now.
      if ((adopted.carriedDevice || (adopted.carriedGuest && !counted)) && !begunElsewhere) {
        track("path_account_linked", { cert, method: "redirect" });
      }
      if (adopted.carriedDevice || adopted.carriedGuest) clearBegunOnPublicPage(cert);
      if (carry) {
        trackCarry(cert, carry);
        passOnOwedStart(cert, carry, answeredHere);
      }
      if (adopted.account.reached && (adopted.unsynced || carry || answeredMeanwhile)) {
        void saveToAccount(next.progress);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(limit);
    };
  }, [cert, adopt, commit, saveToAccount]);

  // Flush unsaved answers when the tab is hidden or closed.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState !== "hidden") return;
      const { userId, progress, saveFailed } = cur.current;
      if (userId && (unsaved.current > 0 || saveFailed)) void saveToAccount(progress, { leaving: true });
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [saveToAccount]);

  // A save that failed is sent again when the connection returns, when the tab
  // is looked at again, and once after a short wait. It is also sent with the
  // next answers, as every save is. A page that is out of date sends nothing
  // again by itself: it could not read the answer.
  const saveFailed = view.saveFailed !== null && view.userId !== null && !view.outOfDate;
  useEffect(() => {
    if (!saveFailed) return;
    const again = () => {
      if (document.visibilityState === "visible") void saveToAccount(cur.current.progress);
    };
    const timer = window.setTimeout(again, SAVE_AGAIN_MS);
    window.addEventListener("online", again);
    document.addEventListener("visibilitychange", again);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", again);
      document.removeEventListener("visibilitychange", again);
    };
  }, [saveFailed, saveToAccount]);

  // Another tab, or a public page in one, has written to this device's copy.
  // Each tab writes the whole copy from its own memory, so the other tab's
  // work is brought into this one's memory (the copy on the device holds it
  // already: see writeLocalPath).
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      const c = cur.current;
      if (!c.ready) return;
      // Signed out beside an account's copy, this page's work is the guest work.
      const guestWork = !c.userId && c.owner !== null;
      if (event.key !== (guestWork ? pathGuestKey(cert) : pathStorageKey(cert))) return;
      let theirs: PathProgress | null;
      if (guestWork) {
        theirs = readGuestPath(cert);
      } else {
        const stored = readLocalPath(cert);
        // Never another account's: someone else has signed in in the other tab.
        theirs = stored && stored.owner === c.owner ? stored.progress : null;
      }
      if (!theirs || !addsTo(c.progress, theirs)) return;
      cur.current = { ...c, progress: mergePathProgress(c.progress, theirs) };
      setView(cur.current);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cert]);

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

  /**
   * Keep a finished exam rehearsal in one save: each answer given (misses come
   * back in later stops), its score, and the path's last stop when it counts.
   */
  const finishRehearsal = useCallback(
    (
      answers: readonly { repId: string; correct: boolean }[],
      result: RehearsalResult,
      stop: { id: string; correct: number; total: number } | null
    ) => {
      const c = cur.current;
      let p = c.progress;
      for (const a of answers) p = recordRep(p, a.repId, a.correct, result.at);
      p = addRehearsal(p, result);
      if (stop) p = finishStop(p, stop.id, stop.correct, stop.total, result.at);
      commit({ ...c, progress: p });
      if (c.userId) void saveToAccount(p);
    },
    [commit, saveToAccount]
  );

  /**
   * Keep a graded lab, wherever it was opened. A lab that closes a domain
   * finishes that stop too: played from the library, it needn't be played again.
   * Grading it again (a retry) records the new score.
   */
  const finishLab = useCallback(
    (labId: string, correct: number, total: number, stopId: string | null) => {
      const c = cur.current;
      const now = Date.now();
      let p = finishLabRun(c.progress, labId, correct, total, now);
      if (stopId) p = finishStop(p, stopId, correct, total, now);
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
      // Signed out beside an account's device copy (see commit), this page's
      // work is guest work: it joins whoever signs in, and the copy joins only
      // its own account. Otherwise the page's work is the device's anonymous path.
      const local: LocalState | null = c.owner ? readLocalPath(cert) : { v: 1, owner: null, progress: c.progress };
      const res = await adopt(uid, local, c.owner ? c.progress : null);
      const account = res.account.reached ? res.account : null;
      commit({
        ...cur.current,
        ready: true,
        userId: uid,
        email: email ?? null,
        owner: uid,
        progress: res.merged,
        access: account ? account.access : "unknown",
        proPlan: account?.proPlan ?? false,
        paymentPastDue: account?.paymentPastDue ?? false,
        certId: account?.certId ?? null,
        pricing: account?.pricing ?? null,
        stored: account?.stored ?? null,
        held: null,
        unreached: !account,
        foreign: !!c.owner && c.owner !== uid,
        accountStarted: account ? hasStarted(res.server) : false,
      });
      everReached.current = !!account;
      clearGuestPath(cert);
      await saveToAccount(res.merged);
      return res.merged;
    },
    [cert, adopt, commit, saveToAccount]
  );

  /** One request to the account at a time, however many callers ask. */
  const refreshing = useRef<Promise<void> | null>(null);

  /**
   * Re-ask the account what it can open (after a purchase elsewhere, say, or
   * when it could not be reached before). When it still cannot be reached, the
   * page keeps what it last knew: a member is never turned into a free account
   * by a failed request.
   */
  const refreshAccess = useCallback((): Promise<void> => {
    refreshing.current ??= (async () => {
      const c = cur.current;
      if (!c.userId) return;
      const res = await adopt(c.userId, { v: 1, owner: c.owner, progress: c.progress });
      const now = cur.current;
      if (now.userId !== c.userId) return;
      if (!res.account.reached) {
        if (!now.unreached) commit({ ...now, unreached: true });
        return;
      }
      // The account is reached for the first time on this visit: a first visit
      // to a newer exam version brings the earlier one's answers, as it does
      // when the page opens.
      const first = !everReached.current;
      everReached.current = true;
      const carry = first && !hasStarted(res.merged) && !hasStarted(now.progress) ? await carryFromEarlierVersion(cert, c.userId) : null;
      const latest = cur.current;
      const answeredHere = hasStarted(latest.progress);
      const settled = carry ? mergePathProgress(res.merged, carry.progress) : res.merged;
      // Whatever was answered while the account was being asked is kept.
      const progress = mergePathProgress(settled, latest.progress);
      // The account may be missing what this device kept while it was out of
      // reach: compared with the account's own copy, as it has just answered.
      const owed = latest.unreached || latest.saveFailed !== null ? addsTo(res.server, progress) : false;
      commit({
        ...latest,
        progress,
        access: res.account.access,
        proPlan: res.account.proPlan,
        paymentPastDue: res.account.paymentPastDue,
        certId: res.account.certId,
        pricing: res.account.pricing ?? latest.pricing,
        stored: res.account.stored,
        unreached: false,
        // Read from the account's own copy only when it answers for the first
        // time: later, its copy holds this visit's saves.
        accountStarted: first ? hasStarted(res.server) : latest.accountStarted,
        arrival: latest.unreached ? latest.arrival + 1 : latest.arrival,
      });
      // (A signed-in page has no guest work: it was carried in when it loaded.)
      if (carry) {
        trackCarry(cert, carry);
        passOnOwedStart(cert, carry, answeredHere);
      }
      if (owed || carry) void saveToAccount(progress);
    })().finally(() => {
      refreshing.current = null;
    });
    return refreshing.current;
  }, [cert, adopt, commit, saveToAccount]);

  // While the account cannot be reached, ask again: after 1, 3 and 8 seconds,
  // when the browser says the connection is back, and when the tab is looked
  // at again. The page also offers "Try again". A page that is out of date
  // does not ask again by itself: the account answers, and the page cannot
  // read the answer until it is loaded again.
  useEffect(() => {
    if (!view.unreached || view.outOfDate) return;
    const again = () => {
      if (document.visibilityState === "visible") void refreshAccess();
    };
    const timers = RETRY_AT_MS.map((ms) => window.setTimeout(again, ms));
    window.addEventListener("online", again);
    document.addEventListener("visibilitychange", again);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("online", again);
      document.removeEventListener("visibilitychange", again);
    };
  }, [view.unreached, view.outOfDate, refreshAccess]);

  /**
   * A practice exam finished on a public page, brought onto the path in one
   * save (core/path/exam-import.ts). True when it became the checkpoint.
   */
  const importExam = useCallback(
    (answers: readonly ExamAnswer[], result: RehearsalResult): boolean => {
      const c = cur.current;
      const { progress: p, asCheckpoint } = bringExam(c.progress, answers, result);
      if (p === c.progress) return false;
      commit({ ...c, progress: p });
      if (c.userId) void saveToAccount(p);
      return asCheckpoint;
    },
    [commit, saveToAccount]
  );

  /**
   * The state as it is at this moment, for a handler that must not wait for
   * the next render to read it, and so that the page's handlers need not be
   * made again each time this hook returns a new object. It never changes.
   */
  const peek = useCallback(() => cur.current, []);

  return {
    ...view,
    signedIn: view.userId !== null,
    peek,
    record,
    finish,
    finishRehearsal,
    importExam,
    finishLab,
    retire,
    setGoal,
    linkAccount,
    refreshAccess,
  };
}

export type PathProgressState = ReturnType<typeof usePathProgress>;
