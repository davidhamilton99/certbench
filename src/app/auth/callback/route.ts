import { NextResponse } from "next/server";
import { createClient } from "@/server/supabase/server";
import { returnPath } from "@/components/auth/return-path";
import { SIGNIN_CANCELLED_PARAM } from "@/lib/google-signin";

/**
 * The signed-in workspace, which only an account that has chosen its exam can
 * use. It is the same list of prefixes as PROTECTED_PREFIXES in
 * src/server/supabase/middleware.ts. That file remains the guard: a route
 * missing from this copy costs a new account one more redirect, and nothing
 * else.
 */
const WORKSPACE_PREFIXES = [
  "/dashboard",
  "/certifications",
  "/study-materials",
  "/community",
  "/profile",
  "/onboarding",
  "/upgrade",
  "/review",
  "/analytics",
  "/srs",
  "/pbq",
  "/recall",
  "/drills",
  "/reference",
  "/feedback",
  "/admin",
];

function isWorkspaceRoute(path: string): boolean {
  return WORKSPACE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** The page they tried from, flagged for its Google button. Only ever on this site. */
function backToPage(back: string | null, origin: string): URL | null {
  if (!back) return null;
  try {
    const url = new URL(back, origin);
    if (url.origin !== origin) return null;
    url.searchParams.set(SIGNIN_CANCELLED_PARAM, "1");
    return url;
  } catch {
    return null;
  }
}

/**
 * OAuth code exchange. The path is unchanged from the previous app: it is the
 * registered redirect URI in Google Console and in the Supabase Auth settings.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Where they were headed, if the address names a page on this site.
  const next = returnPath(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Signed in from a public page: the study path, a practice exam's score,
      // a lab, the pricing page with a plan chosen, a new password. They go
      // straight back to it, a new account included. Sending a new account to
      // the exam list from there lost the score or the lab it had signed up for.
      if (next && !isWorkspaceRoute(next)) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // No page was named, or it is in the workspace. An account that has not
      // chosen an exam cannot use the workspace yet, so it goes to choose one.
      if (next) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", user.id)
            .single();

          if (profile?.onboarding_completed) {
            return NextResponse.redirect(`${origin}${next}`);
          }
        }
      }

      return NextResponse.redirect(`${origin}/start`);
    }
  }

  // Backed out of Google, or it failed: back to the page they tried from, where
  // their progress still is. A bare login form is where people gave up.
  const back = backToPage(searchParams.get("back"), origin);
  if (back) return NextResponse.redirect(back);

  // A link that could not be used (a stale reset link, for one): the sign-in
  // page says so and offers a new link.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
