type BrowserClientModule = typeof import("@/lib/supabase-browser");

/** The one fetch of the client's script, shared by every caller on the page. */
let pending: Promise<BrowserClientModule> | null = null;

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
  return createClient();
}
