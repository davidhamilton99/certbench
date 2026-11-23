import "server-only";

/**
 * The two kinds of address that CertBench's own tests use, which are never
 * sent an email: the end-to-end tests' (a "+e2e-" tag, see e2e/helpers.ts) and
 * the rebuild checks' (a "+rb" tag followed by digits). The daily job, the
 * welcome email and the study plan form all ask this one function.
 *
 * The tag is matched as a whole, just before the "@". The test used to be
 * "the address contains +e2e or +rb", which also took real addresses whose
 * tag only begins with those letters ("anna+rbc@...", "sam+e2ex@..."): they
 * were never welcomed or reminded, and the study plan form told them that the
 * plan had been sent in the last 24 hours, which was not true.
 */
export function isTestAddress(email: string): boolean {
  return /\+(?:e2e-[^@\s]+|rb\d+)@/.test(email.trim().toLowerCase());
}
