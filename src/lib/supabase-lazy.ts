type BrowserClientModule = typeof import("@/lib/supabase-browser");

/** The one fetch of the client's script, shared by every caller on the page. */
let pending: Promise<BrowserClientModule> | null = null;

/** Raised on `window` the first time the client exists on a page. */
const CLIENT_LOADED = "certbench:supabase-client";
let announced = false;

/**
 * The browser Supabase client, loaded on first use instead of with the page.
 * Public pages only need it to notice a session or to sign someone up, and
 * supabase-js is among the largest scripts they would otherwise parse before
 * answering a tap. Rejects if its script can't be fetched (offline, deploy
 * mid-visit), so callers can say so instead of hanging; the next call tries
 * again.
 */
export async function loadBrowserClient() {
  pending ??= import("@/lib/supabase-browser").catch((error: unknown) => {
    pending = null;
    throw error;
  });
  const { createClient } = await pending;
  const client = createClient();
  if (!announced && typeof window !== "undefined") {
    announced = true;
    window.dispatchEvent(new Event(CLIENT_LOADED));
  }
  return client;
}

/**
 * Whether this browser holds a session cookie, answered without loading the
 * client. The client keeps its session in a cookie named
 * `sb-<project>-auth-token` (in numbered pieces when it is long), which page
 * script can read. No such cookie means nobody is signed in, so a public page
 * can treat the visitor as signed out at once and never fetch the client's
 * script to learn it.
 *
 * A hint for what to show, never an access check: the server decides access.
 */
export function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)sb-[^=;\s]+-auth-token(?:\.\d+)?=/.test(document.cookie);
}

/**
 * Run `listener` once the client has been loaded by something on the page (a
 * sign-up form, for example). A page that skipped the client because there
 * was no session cookie uses this to notice a sign-in that happens later on
 * the same page. Runs at once when the client is already there. Returns the
 * function that stops listening.
 */
export function onBrowserClientLoaded(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (announced) {
    listener();
    return () => {};
  }
  window.addEventListener(CLIENT_LOADED, listener, { once: true });
  return () => window.removeEventListener(CLIENT_LOADED, listener);
}
