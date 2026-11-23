import "server-only";

import { ApiError } from "@/contracts/common";

/** What an endpoint answers when the account's plan, role or exams could not be read. */
export const ACCOUNT_NOT_CHECKED = "Your account could not be checked. Please try again.";

/**
 * The error for a failed read of an account's plan, role or enrollments.
 *
 * A read that fails says nothing about the account, so it is never taken to
 * mean "free" or "not allowed": a paying member must not be shown the offer,
 * or turned away, because of a fault on our side. The endpoint answers with
 * this error and the page asks again. The cause goes to the server log only.
 */
export function accountNotChecked(what: string, cause: { message: string }): ApiError {
  console.error(`[account] the ${what} could not be read: ${cause.message}`);
  return new ApiError("internal", ACCOUNT_NOT_CHECKED);
}
