import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/server/supabase/middleware";

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
