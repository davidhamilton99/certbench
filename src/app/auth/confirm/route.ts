import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/server/supabase/server";

/**
 * Email OTP confirmation. Verifies a `token_hash` from a Supabase email link
 * (password recovery, signup confirmation, email change) with verifyOtp,
 * establishes the session server-side in cookies, then redirects to `next`.
 *
 * Why this exists alongside /auth/callback: the PKCE `?code=` flow needs a
 * code_verifier stored on the device that REQUESTED the email, so a reset link
 * opened on a different phone or browser fails with "Auth session missing".
 * verifyOtp validates a server-issued token that isn't bound to a device, so
 * the link works from anywhere.
 *
 * Activate it by pointing the Supabase email templates here, e.g. the
 * "Reset Password" template:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Invalid or expired link — send them to sign in with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
