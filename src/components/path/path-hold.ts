import { pathStorageKey } from "./storage-key";

/** The URL flag a buyer comes back from Stripe with (see afterCheckoutPath). */
export const UPGRADED_FLAG = /[?&]upgraded=1(?:&|$)/;

/**
 * Whether the path holds its stage until it knows where this learner is,
 * instead of painting the first visit's warm-up: they've started it on this
 * device, or they're back from paying. A first visit shows the warm-up at once.
 */
export function holdsStage(cert: string, search: string): boolean {
  if (UPGRADED_FLAG.test(search)) return true;
  try {
    const p = JSON.parse(localStorage.getItem(pathStorageKey(cert)) || "null")?.progress;
    return Boolean(p && (Object.keys(p.items || {}).length || Object.keys(p.stops || {}).length));
  } catch {
    return false;
  }
}

/**
 * The same check as an inline script, run before first paint on a full page
 * load. A visit from inside the app never runs it; the path checks again.
 */
export function holdScript(cert: string): string {
  return `try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(pathStorageKey(cert))})||"null"),p=s&&s.progress;if(${UPGRADED_FLAG}.test(location.search)||p&&(Object.keys(p.items||{}).length||Object.keys(p.stops||{}).length))document.documentElement.setAttribute("data-path-returning","")}catch(e){}`;
}
