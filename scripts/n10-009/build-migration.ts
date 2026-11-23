/**
 * Builds the SQL that adds the new Network+ N10-009 questions to the live
 * bank, from src/data/n10-009. Run from the repo root after changing those
 * files:
 *
 *   npx jiti scripts/n10-009/build-migration.ts
 *
 * A test (src/data/n10-009/__tests__/migration.test.ts) fails when the file in
 * supabase/migrations no longer matches what this builds.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { N10_009_BANK_COUNTS } from "../../src/data/n10-009/bank";
import { N10_009_LIVE_FIXES } from "../../src/data/n10-009/live-fixes";
import { N10_009_MIGRATION_FILE, buildN10009Migration } from "../../src/data/n10-009/migration-sql";
import { N10_009_NEW_QUESTIONS } from "../../src/data/n10-009/new-questions";

const sql = buildN10009Migration({
  slug: "network-plus-n10-009",
  examCode: "N10-009",
  before: N10_009_BANK_COUNTS,
  newQuestions: N10_009_NEW_QUESTIONS,
  liveFixes: N10_009_LIVE_FIXES,
});
const out = join(process.cwd(), "supabase/migrations", N10_009_MIGRATION_FILE);
writeFileSync(out, sql);
console.log(
  `Wrote ${out} (${N10_009_NEW_QUESTIONS.length} new questions, ${N10_009_LIVE_FIXES.length} corrections, ${sql.length} characters)`
);
