import "server-only";

import { createAdminClient } from "@/server/supabase/admin";
import { cancelLiveSubscriptions, expireOpenCheckouts, getStripe } from "@/server/stripe";
import { ApiError } from "@/contracts/common";
import { SUPPORT_EMAIL } from "@/lib/errors/user-message";

/** Stripe could not be reached, or refused: the account is kept, because a deleted account could not cancel later. */
export const SUBSCRIPTION_NOT_CANCELED = `Your account could not be deleted because your subscription could not be canceled. Please try again, or write to ${SUPPORT_EMAIL}.`;

/** No subscription was canceled and the account is still there. At most an open payment page has expired, and a new one can be opened. */
export const ACCOUNT_NOT_DELETED = `Your account could not be deleted. Please try again, or write to ${SUPPORT_EMAIL}.`;

/** The subscription is canceled and the account is still there: the member has to be told both. */
export const CANCELED_BUT_NOT_DELETED = `Your subscription has been canceled, but your account could not be deleted. Please try again, or write to ${SUPPORT_EMAIL}.`;

/**
 * Permanently deletes a user. auth.users is the root: profiles references it
 * ON DELETE CASCADE and every user-owned table cascades from profiles, so one
 * admin call removes everything.
 *
 * The subscription goes first. The subscription row, and the Stripe customer
 * id in it, is deleted with the account, so afterwards neither the member nor
 * the billing portal could cancel anything and Stripe would go on charging.
 * Every subscription of the customer that could still charge is therefore
 * canceled at Stripe before the account is touched, and if that cannot be
 * done the account is kept.
 *
 * Payment pages that are still open are expired before that, for the same
 * reason: one that is paid after the account has gone would start a
 * subscription that no account holds. They are expired first, so that a page
 * paid a moment earlier has its subscription among those that are canceled.
 * If a page cannot be expired the account is kept, with the same answer as
 * for a subscription that could not be canceled.
 *
 * The errors use the code "conflict" where the member has to read the exact
 * sentence: an "internal" error is shown as a general sentence instead.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: sub, error: readError } = await admin
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    // Whether there is a subscription is unknown, so nothing may be deleted.
    console.error(`[delete account] subscription row not read for ${userId}:`, readError.message);
    throw new ApiError("internal", ACCOUNT_NOT_DELETED);
  }

  let canceled = 0;
  if (sub?.stripe_customer_id) {
    try {
      const stripe = getStripe();
      await expireOpenCheckouts(stripe, sub.stripe_customer_id);
      canceled = await cancelLiveSubscriptions(stripe, sub.stripe_customer_id);
    } catch (err) {
      console.error(
        `[delete account] an open payment page was not expired or a subscription was not canceled for ${userId}:`,
        err
      );
      throw new ApiError("conflict", SUBSCRIPTION_NOT_CANCELED);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error(`[delete account] user ${userId} not deleted:`, error.message);
    if (canceled > 0) throw new ApiError("conflict", CANCELED_BUT_NOT_DELETED);
    throw new ApiError("internal", ACCOUNT_NOT_DELETED);
  }
}
