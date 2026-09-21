import "server-only";

import { publicEnv } from "@/env";
import { createAdminClient } from "@/server/supabase/admin";
import { sendEmail } from "@/server/email/resend";
import { studyPlanEmail } from "@/server/email/templates";
import type { ToolSource } from "@/contracts/tools";

/** Test-convention addresses never get lead mail (mirrors lifecycle email). */
function isTestAccount(email: string): boolean {
  return email.includes("+e2e") || email.includes("+rb");
}

/**
 * Records a free-tool email lead and sends the study-plan email. Deduped on
 * (email, source): re-submitting refreshes the row but never re-sends if the
 * lead has unsubscribed. Never throws — a capture must not surface an error
 * to the anonymous visitor; failures are logged and swallowed.
 */
export async function captureLead(
  email: string,
  source: ToolSource,
  context: Record<string, string | number>
): Promise<void> {
  try {
    if (isTestAccount(email)) return;
    const admin = createAdminClient();

    // Insert-or-refresh. On a repeat we still want the row, but not to reset
    // an unsubscribe — so read back the current opt-out state before sending.
    const { data, error } = await admin
      .from("tool_leads")
      .upsert(
        { email, source, context, updated_at: new Date().toISOString() },
        { onConflict: "email,source" }
      )
      .select("unsubscribe_token, unsubscribed")
      .single();
    if (error) {
      console.error("tool lead upsert failed:", error.message);
      return;
    }
    if (data.unsubscribed) return;

    const unsubscribeUrl = `${publicEnv.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe?token=${data.unsubscribe_token}&scope=lead`;
    await sendEmail({
      to: email,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
      ...studyPlanEmail({ source, unsubscribeUrl }),
    });
  } catch (err) {
    console.error("captureLead failed:", err);
  }
}
