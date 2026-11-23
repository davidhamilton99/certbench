import { ApiError, type ApiErrorCode } from "@/contracts/errors";

/**
 * Turns an error into a sentence a visitor can act on. An error message
 * written by a library or the network layer ("fetch failed", "Request failed
 * (502)", a bare code) is never shown. A message that an endpoint wrote as a
 * sentence for the visitor is.
 *
 * Use this wherever an error reaches the screen:
 *
 *   } catch (err) {
 *     setError(userMessage(err));
 *   }
 */

export const SUPPORT_EMAIL = "support@certbench.dev";

/** The browser could not reach the server at all. */
export const CONNECTION_LOST = "The connection was lost. Please check your connection and try again.";

/** The server did not answer within the time allowed. */
export const REQUEST_TIMED_OUT = "The request took too long. Please try again.";

/**
 * The server answered, but a part of this page that is needed to read the
 * answer is no longer there to fetch: a new version of the site was published
 * while the page was open. Asking again cannot help; loading the page can.
 */
export const PAGE_OUT_OF_DATE = "This page is out of date. Please reload the page.";

/** Anything without a more exact sentence. */
export const REQUEST_FAILED = `The request could not be completed. Please try again. If the problem continues, write to ${SUPPORT_EMAIL}.`;

const BY_CODE: Record<ApiErrorCode, string> = {
  unauthorized: "You are signed out. Please sign in and try again.",
  forbidden: "This is not available to your account.",
  not_found: "The item that you asked for could not be found.",
  rate_limited: "Too many requests were made in a short time. Please wait a few minutes and try again.",
  quota_exceeded: "You have reached the limit of the free plan for today.",
  validation_failed: "Some of the details were not accepted. Please check them and try again.",
  conflict: "This has already been done, so nothing was changed.",
  internal: REQUEST_FAILED,
};

/**
 * Whether a message reads as a sentence written for a person: it has words in
 * it and it ends as a sentence does. "rate_limited", "Something went wrong"
 * and "Request failed (502)" are not.
 */
export function isSentence(message: string | null | undefined): message is string {
  if (!message) return false;
  const text = message.trim();
  return text.includes(" ") && /[.?]$/.test(text);
}

/** The sentence to show for an error from `api()` or from anywhere else. */
export function userMessage(error: unknown, fallback: string = REQUEST_FAILED): string {
  if (error instanceof ApiError) {
    // An endpoint's own sentence says more than the code does ("You have used
    // your 10 free questions for today."). An internal error never does.
    if (error.code !== "internal" && isSentence(error.message)) return error.message;
    if (error.code === "internal") {
      if (error.message === CONNECTION_LOST || error.message === REQUEST_TIMED_OUT || error.message === PAGE_OUT_OF_DATE) {
        return error.message;
      }
      return fallback;
    }
    return BY_CODE[error.code];
  }
  if (isOffline(error)) return CONNECTION_LOST;
  return fallback;
}

/** A failed `fetch`: browsers raise a TypeError and each words it differently. */
function isOffline(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!(error instanceof Error)) return false;
  return error.name === "TypeError" && /fetch|network|load failed/i.test(error.message);
}

/* ------------------------------------------------------------------ */
/* Sign-in, sign-up and password forms                                 */
/* ------------------------------------------------------------------ */

export const AUTH_UNREACHABLE = "The sign-in service could not be reached. Please try again in a few minutes.";
export const AUTH_WRONG_CREDENTIALS = "The email address and password do not match.";
export const AUTH_TOO_MANY = "Too many attempts have been made. Please wait a minute and try again.";
export const AUTH_ALREADY_REGISTERED = "An account with this email address already exists. Please sign in.";
export const AUTH_WEAK_PASSWORD = "The password must have at least 8 characters.";
export const AUTH_NOT_CONFIRMED =
  "Your email address has not been confirmed. Please open the confirmation email that was sent to you.";
export const AUTH_INVALID_EMAIL = "The email address is not valid. Please check it and try again.";
export const AUTH_LINK_EXPIRED = "This link has expired or has already been used. Please request a new one.";

interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

/**
 * The sentence to show for an error from the sign-in service. Its own text
 * ("Invalid login credentials", "fetch failed") is never displayed.
 */
export function authMessage(error: unknown, fallback = "You could not be signed in. Please try again."): string {
  const e = (error ?? {}) as AuthErrorLike;
  const code = e.code ?? "";
  const text = (e.message ?? "").toLowerCase();

  if (
    e.status === 0 ||
    e.name === "AuthRetryableFetchError" ||
    /failed to fetch|fetch failed|networkerror|load failed|network request failed/.test(text) ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  ) {
    return AUTH_UNREACHABLE;
  }
  if (e.status === 429 || /rate_limit/.test(code) || /rate limit|too many/.test(text)) return AUTH_TOO_MANY;
  if (code === "invalid_credentials" || /invalid login credentials/.test(text)) return AUTH_WRONG_CREDENTIALS;
  if (code === "user_already_exists" || code === "email_exists" || /already registered|already exists/.test(text)) {
    return AUTH_ALREADY_REGISTERED;
  }
  if (code === "weak_password" || /password should be at least|weak password/.test(text)) return AUTH_WEAK_PASSWORD;
  if (code === "email_not_confirmed" || /email not confirmed/.test(text)) return AUTH_NOT_CONFIRMED;
  if (code === "email_address_invalid" || code === "validation_failed" || /invalid email|unable to validate email/.test(text)) {
    return AUTH_INVALID_EMAIL;
  }
  if (code === "otp_expired" || code === "flow_state_expired" || /expired|invalid.*(token|link)/.test(text)) {
    return AUTH_LINK_EXPIRED;
  }
  return fallback;
}
