import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/env";

/** Route prefixes that require an authenticated session. */
const PROTECTED_PREFIXES = [
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

/** Auth pages an already-authenticated user should be bounced away from. */
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

/**
 * Protected routes an authenticated non-Pro user may still reach:
 *   - /upgrade    the paywall itself (redirecting it here would loop)
 *   - /onboarding the goal-setting flow that leads to the paywall
 * Everything else in the signed-in app is Pro-only. The free taste lives on
 * the public marketing pages, which are never protected.
 */
const PRO_EXEMPT_PREFIXES = ["/upgrade", "/onboarding"];

/**
 * Session refresh + redirect matrix. Runs on every matched request:
 *   - refreshes the Supabase auth token (cookie rotation)
 *   - unauthenticated user on a protected route -> /login?next=<path>
 *   - authenticated user on an auth page         -> /dashboard
 *   - authenticated non-Pro user in the app      -> /upgrade (hard paywall)
 *
 * Onboarding completeness is checked in the (workspace) layout, not here —
 * it needs a profile row read on every protected route. The paywall gate does
 * read the subscription row, but only once the cheaper checks have passed and
 * only on protected, non-exempt routes.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // A transient auth-token validation error — most notably "JWT issued at
  // future" from clock skew between the token issuer and this instance — must
  // never take down a page load. Fail closed to "no session" for this one
  // request: auth pages still render, protected routes fall back to /login,
  // and the rotated cookie validates cleanly on the very next request.
  let user: User | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (err) {
    console.warn("[proxy] auth.getUser failed; continuing unauthenticated", err);
  }

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Hard paywall: the signed-in app is Pro-only. Send authenticated non-Pro
  // users to /upgrade for any protected route except the exempt ones (the
  // paywall and the onboarding flow). Admins (the owner) always pass, Pro or
  // not — so a comp-free owner account is never locked out of its own app.
  // Checked here, not in the layout, because the redirect decision needs the
  // pathname. The subscription read only runs for signed-in users navigating
  // a protected, non-exempt route, and Pro users cost a single query.
  if (
    user &&
    isProtected &&
    !PRO_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const { data: sub, error: subErr } = await supabase
      .from("user_subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .maybeSingle();
    // Fail open on a transient read error: never wall a paying user over our
    // own infra blip. The leak (a free user slipping through during an outage)
    // is rare and still bounded by the data-layer quotas.
    if (subErr) {
      console.warn("[proxy] subscription read failed; allowing through", subErr);
      return response;
    }
    const isPro =
      sub?.plan === "pro" &&
      (sub.status === "active" || sub.status === "trialing");

    if (!isPro) {
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (profErr) {
        console.warn("[proxy] profile read failed; allowing through", profErr);
        return response;
      }
      if (profile?.role !== "admin") {
        const url = request.nextUrl.clone();
        url.search = "";
        // Un-onboarded users must run the goal-setting flow first (that's where
        // we sell); everyone else who isn't Pro lands on the paywall.
        url.pathname = profile?.onboarding_completed ? "/upgrade" : "/onboarding";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
