import { cookies } from "next/headers";
import { START_COLUMN, StartHeader, StartLead } from "./lead";

/**
 * The sign-in client's session cookie, by its name: the same test as
 * `hasSessionCookie` in src/lib/supabase-lazy.ts makes in the browser.
 */
const SESSION_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/;

/**
 * What stands in for the page while the server works out who is here. The
 * page reads the session, so it cannot be made ahead of time, and until now a
 * press on "Start for free" changed nothing on screen until the server had
 * answered. This is shown at once instead.
 *
 * For a visitor who is not signed in, the page that follows is always the list
 * of exams, so its title and first sentence are shown as real words in their
 * final place. Someone with a session is usually sent on to their own study
 * path instead, so they are told only that the page is loading: the title
 * would ask them a question that the next screen does not ask.
 *
 * Nothing here moves, and nothing starts invisible.
 */
export default async function StartLoading() {
  const signedIn = (await cookies()).getAll().some((cookie) => SESSION_COOKIE.test(cookie.name));
  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <StartHeader />
      <main id="main-content" tabIndex={-1} className={START_COLUMN}>
        {signedIn ? (
          <p role="status" className="text-lede text-muted-foreground">
            The page is loading.
          </p>
        ) : (
          <>
            <StartLead paid={false} />
            <p role="status" className="text-small text-muted-foreground">
              The list of exams is loading.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
