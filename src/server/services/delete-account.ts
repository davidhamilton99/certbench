import "server-only";

import { createAdminClient } from "@/server/supabase/admin";
import { ApiError } from "@/contracts/common";

/**
 * Permanently deletes a user. auth.users is the root — profiles references
 * it ON DELETE CASCADE and every user-owned table cascades from profiles,
 * so one admin call removes everything.
 *
 * Deliberately does NOT touch Stripe: a deleted user's subscription (if any)
 * is cancelled via the customer portal or dashboard; the webhook has nothing
 * to sync once the row is gone.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new ApiError("internal", error.message);
}
