import { examVersions } from "@/core/path/versions";
import { pathGuestKey, pathStorageKey, pathStorageKeys } from "./storage-key";

/** The URL flag a buyer comes back from Stripe with (see afterCheckoutPath). */
export const UPGRADED_FLAG = /[?&]upgraded=1(?:&|$)/;

/**
 * The sign-in client's session cookie. The same test as `hasSessionCookie` in
 * src/lib/supabase-lazy.ts, written out here so that it can also be placed in
 * the inline script below (a test holds the two to the same answers).
 */
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;\s]+-auth-token(?:\.\d+)?=/;

/**
 * The attributes on <html> that the held stage's style rules read (the block
 * that begins `html[data-path-returning]` in src/app/globals.css).
 *
 *   returning  this learner's own screen is on its way: the first visit's
 *              questions are not drawn meanwhile
 *   wait       the stage has been held long enough to say that it is loading
 *   late       the page's scripts have not started: it says so, with a link
 *              that reloads the page
 *   live       the page's scripts are running, so the page is never "late"
 */
export const HOLD_ATTRIBUTE = {
  returning: "data-path-returning",
  wait: "data-path-wait",
  late: "data-path-late",
  live: "data-path-live",
} as const;

/** How long a held stage stays silent before it says that it is loading. */
export const HOLD_WAIT_MS = 500;

/** How long the page may go without its scripts before it says so. */
export const HOLD_LATE_MS = 10_000;

/**
 * Every place on this device whose progress means that this learner's own
 * screen is coming: the exam's own copy (under its slug, or the one A+ had
 * before 220-1201/1202), work played beside an account's copy, and for the
 * newer version of an exam, the earlier version's copy, whose answers a first
 * visit brings along (version-carry.ts).
 */
function holdKeys(cert: string): string[] {
  const [newest, earlier] = examVersions(cert);
  const keys = [...pathStorageKeys(cert), pathGuestKey(cert)];
  return newest === cert && earlier ? [...keys, pathStorageKey(earlier)] : keys;
}

/** Whether the path saved under this storage key has been started. */
function started(key: string): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    // The device's copy wraps the progress; guest work is the progress itself.
    const p = stored?.progress ?? stored;
    return Boolean(p && (Object.keys(p.items || {}).length || Object.keys(p.stops || {}).length));
  } catch {
    return false;
  }
}

/** Whether someone is signed in on this browser, as far as its cookies say. */
function signedIn(): boolean {
  try {
    return SESSION_COOKIE.test(document.cookie);
  } catch {
    return false;
  }
}

/**
 * Whether the path holds its stage until it knows where this learner is,
 * instead of painting the first visit's introductory questions: they have
 * started it on this device, they are signed in (their account may hold a
 * path that this device does not), or they are back from paying. A first visit
 * by someone who is not signed in shows the introductory questions at once.
 *
 * The hold never lasts: the path opens on what the device holds when the
 * account has not answered within its time limit (usePathProgress.ts).
 */
export function holdsStage(cert: string, search: string): boolean {
  return UPGRADED_FLAG.test(search) || signedIn() || holdKeys(cert).some(started);
}

/**
 * The same check as an inline script, run before first paint on a full page
 * load. A visit from inside the app never runs it; the path checks again.
 *
 * It also starts the two clocks that the held stage's sentences are shown by.
 * They are set here and not in the page's own scripts so that the sentences
 * appear when those scripts are slow, and when they never arrive at all. Each
 * only sets an attribute: nothing is animated, so a session replay shows the
 * sentence too.
 */
export function holdScript(cert: string): string {
  const { returning, wait, late, live } = HOLD_ATTRIBUTE;
  return `try{var d=document.documentElement,k=${JSON.stringify(holdKeys(cert))},h=${UPGRADED_FLAG}.test(location.search);try{h=h||${SESSION_COOKIE}.test(document.cookie)}catch(e){}for(var i=0;i<k.length&&!h;i++)try{var s=JSON.parse(localStorage.getItem(k[i])||"null"),p=s&&(s.progress||s);h=!!(p&&(Object.keys(p.items||{}).length||Object.keys(p.stops||{}).length))}catch(e){}if(h)d.setAttribute("${returning}","");setTimeout(function(){d.setAttribute("${wait}","")},${HOLD_WAIT_MS});setTimeout(function(){d.hasAttribute("${live}")||d.setAttribute("${late}","")},${HOLD_LATE_MS})}catch(e){}`;
}
