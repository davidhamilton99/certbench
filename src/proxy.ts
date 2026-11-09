import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/server/supabase/middleware";
import { afterCheckoutPath } from "@/lib/billing/after-checkout";

export async function proxy(request: NextRequest) {
  // next.config turns off Next's trailing-slash redirect so PostHog's API
  // paths reach /ingest intact. Every other URL keeps one form, without it.
  const { pathname } = request.nextUrl;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    // A plain URL: nextUrl would put the trailing slash back when formatted.
    const url = new URL(request.url);
    url.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(url, 308);
  }
  // A checkout begun before paying landed on the path still comes back to the
  // old success screen, inside the workspace. Send it to the path before any
  // of that renders.
  if (pathname === "/upgrade" && request.nextUrl.searchParams.get("upgraded") === "true") {
    return NextResponse.redirect(new URL(afterCheckoutPath(request.nextUrl.searchParams.get("next")), request.url));
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets, image optimization, and
     * the PostHog proxy (/ingest, rewritten in next.config: no session work).
     */
    "/((?!_next/static|_next/image|ingest|favicon.ico|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
