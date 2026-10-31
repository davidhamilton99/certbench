import { NextResponse } from "next/server";
import { createClient } from "@/server/supabase/server";

/** Places that need no onboarding — pulling people away from them is the drop-off we avoid. */
const GUIDED = ["/path/", "/start", "/tools/"];

/**
 * OAuth code exchange. Path unchanged from the previous app — it is the
 * registered redirect URI in Google Console and Supabase Auth settings.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/start";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/start";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Signed in from the guided path, the exam picker or a free drill:
      // straight back to where they were.
      if (GUIDED.some((prefix) => next.startsWith(prefix))) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        // No exam yet: pick one and start its path.
        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/start`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
