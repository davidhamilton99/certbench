/**
 * Builds supabase/migrations/030_security_plus_sy0_801.sql from the decisions
 * in src/data/sy0-801: the map, the bank snapshot, the copies' fixed ids and
 * both new-question sets. Run from the repo root after changing any of them:
 *
 *   npx jiti scripts/sy0-801/build-migration.ts
 *
 * A test keeps the committed file equal to what this builds.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SY0_801_MAP } from "../../src/data/sy0-801/map";
import { buildSy0801Migration } from "../../src/data/sy0-801/migration-sql";
import { SY0_801_NEW_QUESTIONS_D1_2 } from "../../src/data/sy0-801/new-questions/d1-2";
import { SY0_801_NEW_QUESTIONS_D3_5 } from "../../src/data/sy0-801/new-questions/d3-5";

const root = process.cwd();
const json = (file: string) => JSON.parse(readFileSync(join(root, "src/data/sy0-801", file), "utf8"));

const sql = buildSy0801Migration({
  map: SY0_801_MAP,
  bank: (json("sy0-701-bank.json") as Record<string, [string, string][]>)[SY0_801_MAP.sourceSlug],
  copies: json("copies.json"),
  newQuestions: [...SY0_801_NEW_QUESTIONS_D1_2, ...SY0_801_NEW_QUESTIONS_D3_5],
});
const out = join(root, "supabase/migrations/030_security_plus_sy0_801.sql");
writeFileSync(out, sql, "utf8");
console.log(`Wrote ${out} (${sql.length} characters)`);
