import { createServerClient } from "@supabase/ssr";
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
  "/reference",
  "/feedback",
  "/admin",
];

/** Auth pages an already-authenticated user should be bounced away from. */
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

/**
 * Session refresh + redirect matrix. Runs on every matched request:
 *   - refreshes the Supabase auth token (cookie rotation)
 *   - unauthenticated user on a protected route -> /login?next=<path>
 *   - authenticated user on an auth page       -> /dashboard
 *
 * Onboarding completeness is checked in the (workspace) layout, not here —
 * it needs a profile row read, which is too expensive per-request.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return response;
}
