/**
 * CertBench 2.0 launch timestamp.
 *
 * Users whose account was created before this moment are "returning" and see
 * the one-time "Welcome to CertBench 2.0" popup once; brand-new accounts don't.
 *
 * ⚠️ Set this to the actual merge/deploy time before (or when) 2.0 ships, so the
 * returning-user gate is accurate. Defaulting earlier under-shows (a few users
 * who sign up between here and the real launch miss it) rather than annoying
 * genuinely new users, which is the safer error.
 */
export const CERTBENCH_V2_LAUNCH = "2026-09-15T03:30:00Z";
