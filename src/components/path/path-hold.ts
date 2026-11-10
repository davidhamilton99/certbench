import { pathStorageKeys } from "./storage-key";

/** The URL flag a buyer comes back from Stripe with (see afterCheckoutPath). */
export const UPGRADED_FLAG = /[?&]upgraded=1(?:&|$)/;

/** Whether the path saved under this storage key has been started. */
function started(key: string): boolean {
  try {
    const p = JSON.parse(localStorage.getItem(key) || "null")?.progress;
    return Boolean(p && (Object.keys(p.items || {}).length || Object.keys(p.stops || {}).length));
  } catch {
    return false;
  }
}

/**
 * Whether the path holds its stage until it knows where this learner is,
 * instead of painting the first visit's warm-up: they've started it on this
 * device (under its slug, or the one A+ had before 220-1201/1202), or they're
 * back from paying. A first visit shows the warm-up at once.
 */
export function holdsStage(cert: string, search: string): boolean {
  return UPGRADED_FLAG.test(search) || pathStorageKeys(cert).some(started);
}

/**
 * The same check as an inline script, run before first paint on a full page
 * load. A visit from inside the app never runs it; the path checks again.
 */
export function holdScript(cert: string): string {
  return `try{var k=${JSON.stringify(pathStorageKeys(cert))},h=${UPGRADED_FLAG}.test(location.search);for(var i=0;i<k.length&&!h;i++)try{var s=JSON.parse(localStorage.getItem(k[i])||"null"),p=s&&s.progress;h=!!(p&&(Object.keys(p.items||{}).length||Object.keys(p.stops||{}).length))}catch(e){}if(h)document.documentElement.setAttribute("data-path-returning","")}catch(e){}`;
}
