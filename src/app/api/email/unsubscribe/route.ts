import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/server/supabase/admin";

/**
 * One-click unsubscribe from lifecycle email. Token-authenticated (the
 * random unsubscribe_token from the email link — no session required, as
 * mail clients open this logged-out), so it's a plain handler rather than
 * a factory endpoint. Returns a tiny HTML page.
 */

function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;background:#f4f4f5;color:#18181b;">
<div style="text-align:center;padding:24px;"><h1 style="font-size:20px;">${title}</h1><p style="color:#52525b;">${body}</p></div>
</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  // Basic shape check keeps junk out of the query below.
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return page("Invalid link", "This unsubscribe link isn't valid.", 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_preferences")
    .update({ digest_enabled: false, updated_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("user_id");

  if (error) {
    return page("Something went wrong", "Please try again later.", 500);
  }
  if (!data || data.length === 0) {
    return page("Invalid link", "This unsubscribe link isn't valid.", 400);
  }
  return page(
    "You're unsubscribed",
    "You won't receive study digests or exam reminders anymore. You can keep using CertBench as usual."
  );
}
