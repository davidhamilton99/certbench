/**
 * Google sign-in is a full-page trip. Someone who backs out of it comes home
 * through /auth/callback with no code, and goes back to the page they tried
 * from with this flag set, so that page's Google button can say what happened.
 */
export const SIGNIN_CANCELLED_PARAM = "signin_cancelled";
