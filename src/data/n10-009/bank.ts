/**
 * The live Network+ N10-009 bank that the new questions were written against:
 * its active questions per topic, read with the site's public key on
 * 23 November 2026. The migration refuses to run against a bank that has
 * changed since, so the new questions are never added twice or on top of edits
 * that were not seen.
 */
export const N10_009_BANK_COUNTS: Readonly<Record<string, number>> = {
  "1.1": 18,
  "1.2": 19,
  "1.3": 18,
  "1.4": 18,
  "1.5": 18,
  "1.6": 17,
  "1.7": 17,
  "1.8": 16,
  "2.1": 30,
  "2.2": 29,
  "2.3": 27,
  "2.4": 27,
  "3.1": 33,
  "3.2": 30,
  "3.3": 33,
  "3.4": 26,
  "3.5": 22,
  "4.1": 22,
  "4.2": 24,
  "4.3": 22,
  "4.4": 20,
  "4.5": 18,
  "5.1": 21,
  "5.2": 22,
  "5.3": 21,
  "5.4": 23,
  "5.5": 26,
};

/** CompTIA's N10-009 domain weights, in percent, as the database holds them since migration 028. */
export const N10_009_DOMAIN_WEIGHTS: Readonly<Record<string, number>> = {
  "1": 23,
  "2": 20,
  "3": 19,
  "4": 14,
  "5": 24,
};
