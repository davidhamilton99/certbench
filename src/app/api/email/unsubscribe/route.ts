import { NextRequest, NextResponse } from "next/server";
import { afterResponse } from "@/server/api/after-response";
import { reportServerError } from "@/server/api/report-error";
import { createAdminClient } from "@/server/supabase/admin";
import {
  UNSUBSCRIBE_PAGE_PATH,
  isUnsubscribeToken,
  parseUnsubscribeScope,
  unsubscribe,
  type UnsubscribeOutcome,
} from "@/server/email/unsubscribe";

/**
 * The address every email carries for unsubscribing. The random token in the
 * link says whose preference it is, and no session is needed (a mail client
 * opens it signed out), so this is a plain handler and not a factory endpoint.
 *
 * GET changes nothing. It leads to the page at /unsubscribe, which says what
 * will stop and has the one button. Mail scanners and link previews open every
 * link in a message, and a GET must be safe to repeat (RFC 9110, 9.2.1).
 *
 * POST makes the change. Two things send one: a mail client's own
 * "Unsubscribe" button (RFC 8058, announced by the List-Unsubscribe-Post
 * header), which is answered in JSON, and the button on the page, which is
 * answered with the page again, saying what happened.
 */

/** The page, with only the parameters it reads. */
function pageUrl(req: NextRequest, query: Record<string, string | null>): URL {
  const url = new URL(UNSUBSCRIBE_PAGE_PATH, req.url);
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const scope = parseUnsubscribeScope(req.nextUrl.searchParams.get("scope"));
  // A link in mail already sent arrives here. The page checks the token's
  // shape again and says so when the link is not valid.
  return NextResponse.redirect(pageUrl(req, { token: isUnsubscribeToken(token) ? token : null, scope }));
}

const NOT_VALID = "This unsubscribe link is not valid.";

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const scope = parseUnsubscribeScope(req.nextUrl.searchParams.get("scope"));
  // The page's form says where it came from. A mail client sends only
  // "List-Unsubscribe=One-Click", and some send no readable body at all.
  const form = await req.formData().catch(() => null);
  const fromPage = form?.get("from") === "page";

  let outcome: UnsubscribeOutcome;
  if (!isUnsubscribeToken(token)) {
    outcome = "invalid";
  } else {
    try {
      outcome = await unsubscribe(createAdminClient(), token, scope);
    } catch (err) {
      console.error("unsubscribe failed:", err);
      outcome = "failed";
    }
  }
  // An unsubscribe that could not be saved is reported as a server error: after
  // the response, once, and with neither the token nor the address asked for.
  if (outcome === "failed") {
    afterResponse(() =>
      reportServerError(new Error("An unsubscribe could not be saved"), {
        route: "/api/email/unsubscribe",
        method: "POST",
        kind: "route",
      })
    );
  }

  if (fromPage) {
    // 303: the browser fetches the page with a GET, so a reload of the result
    // does not send the form again. The token goes back only when the person
    // needs it to try again.
    return NextResponse.redirect(
      pageUrl(req, { status: outcome, scope, token: outcome === "failed" ? token : null }),
      303
    );
  }

  if (outcome === "done") return NextResponse.json({ ok: true });
  if (outcome === "failed") {
    return NextResponse.json(
      { error: { code: "internal", message: "You could not be unsubscribed. Please try again." } },
      { status: 500 }
    );
  }
  return isUnsubscribeToken(token)
    ? NextResponse.json({ error: { code: "not_found", message: NOT_VALID } }, { status: 404 })
    : NextResponse.json({ error: { code: "validation_failed", message: NOT_VALID } }, { status: 400 });
}
