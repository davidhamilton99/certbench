import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/env";
import { fetchWithTimeLimit, SESSION_CHECK_LIMIT_MS, withDeadline } from "./time-limit";

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
 *   - /upgrade    pricing and the plan page (paying itself lands on the path)
 *   - /onboarding forwards to the study path (kept for old links)
 * Everything else in the signed-in app is Pro-only. The free experience is the
 * study path (/path/*, /start) and the public pages, which are never protected.
 */
const PRO_EXEMPT_PREFIXES = ["/upgrade", "/onboarding"];

/**
 * Where a signed-in visitor on an auth page goes when the link was taking them
 * back to the study path (an email's path link, the path's own "Sign in"):
 * straight there instead of the toolkit. Same-site path pages only, and one
 * more address: the pricing page with the plan the visitor chose there. A
 * visitor who pressed a payment button while signed out is sent to create an
 * account with that address (src/components/auth/return-path.ts, chosenPlan);
 * someone who turns out to be signed in already must not lose the choice.
 */
export function guidedNext(next: string | null): string | null {
  if (!next) return null;
  if (/^\/(?:path\/[a-z0-9-]+|start)(?:\?|$)/.test(next)) return next;
  if (/^\/pricing\?plan=(?:monthly|quarterly|annual)$/.test(next)) return next;
  return null;
}

/**
 * The cookie the Supabase client keeps a session in: "sb-<project>-auth-token",
 * whole or split into numbered parts. Without one there is no session to
 * refresh and nobody to recognize.
 */
const SESSION_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/;

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => SESSION_COOKIE.test(name));
}

/** A page fetched ahead of a press, by Next's router or by the browser itself. */
function isPrefetch(request: NextRequest): boolean {
  const { headers } = request;
  return (
    headers.has("next-router-prefetch") ||
    headers.get("purpose") === "prefetch" ||
    (headers.get("sec-purpose") ?? "").startsWith("prefetch")
  );
}

/**
 * Session refresh + redirect matrix. Runs on every matched request:
 *   - refreshes the Supabase auth token (cookie rotation)
 *   - unauthenticated user on a protected route -> /login?next=<path>
 *   - authenticated user on an auth page         -> /start, their study path
 *                                                   (or where guidedNext says)
 *   - authenticated non-Pro user in the app      -> /start (their study path)
 *
 * A request to a page that is neither protected nor an auth page leaves
 * before any of that when it has no session to refresh, is a prefetch, or is
 * for the API (see the three cases below). Protected pages and auth pages
 * always take the whole route, prefetches included, so who may open what is
 * decided exactly as before.
 *
 * Onboarding completeness is checked in the (workspace) layout, not here:
 * it needs a profile row read on every protected route. The paywall gate does
 * read the subscription row, but only once the cheaper checks have passed and
 * only on protected, non-exempt routes.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // A page outside the gate is the same whoever asks for it, so the request
  // goes straight through, with no client built and no call to the sign-in
  // service, when:
  //   - it carries no session cookie: there is nothing to refresh;
  //   - it is a prefetch: one page view prefetches a hundred links or more,
  //     and each of them would otherwise be a call to the sign-in service;
  //   - it is for the API: every handler checks the session itself and can
  //     write the refreshed cookies, so the check here was a second one.
  if (!isProtected && !isAuthPage) {
    if (!hasSessionCookie(request) || isPrefetch(request) || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { fetch: fetchWithTimeLimit() },
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

  /**
   * A redirect that carries the cookies the session refresh has just written.
   * A refresh rotates the tokens; a redirect built without them would send the
   * browser on with tokens that have already been replaced.
   */
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  // A transient auth-token validation error (most notably "JWT issued at
  // future" from clock skew between the token issuer and this instance) must
  // never take down a page load, and a sign-in service that has stopped
  // answering must not hold every page for the half minute its client keeps
  // retrying. Either way this one request continues as signed out: auth pages
  // still render, protected routes fall back to /login, and the next request
  // checks again.
  let user: User | null = null;
  try {
    const result = await withDeadline(supabase.auth.getUser(), SESSION_CHECK_LIMIT_MS, "The session check");
    user = result.data.user;
  } catch (err) {
    console.warn("[proxy] the session check failed or ran out of time; continuing as signed out", err);
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return redirectTo(url);
  }

  if (user && isAuthPage) {
    const back = guidedNext(request.nextUrl.searchParams.get("next"));
    if (back) return redirectTo(new URL(back, request.url));
    // Home is the study path, Pro or not: /start opens their exam's path.
    const url = request.nextUrl.clone();
    url.pathname = "/start";
    url.search = "";
    return redirectTo(url);
  }

  // The signed-in toolkit is Pro-only. Send authenticated non-Pro users to
  // their study path for any protected route except the exempt ones (pricing
  // and the onboarding forward). Admins (the owner) always pass, Pro or
  // not, so a comp-free owner account is never locked out of its own app.
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
        // Without Pro, the place to be is the study path: /start opens the
        // exam they're enrolled in, or lets them pick one. The offer lives
        // inside the path, after the readiness checkpoint.
        url.pathname = "/start";
        return redirectTo(url);
      }
    }
  }

  return response;
}
