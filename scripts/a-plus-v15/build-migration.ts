/**
 * Builds the SQL that moves the A+ bank onto 220-1201/1202 from the decisions
 * in src/data/a-plus-v15. Run from the repo root after changing those
 * decisions or the new-question files:
 *
 *   npx jiti scripts/a-plus-v15/build-migration.ts            preview, for review
 *   npx jiti scripts/a-plus-v15/build-migration.ts --release  supabase/migrations
 *
 * The preview stays out of supabase/migrations until the switch-over, so
 * nothing can apply it before the code that needs it ships.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CORE1_V15 } from "../../src/data/a-plus-v15/core1";
import { CORE2_V15 } from "../../src/data/a-plus-v15/core2";
import { buildAPlusV15Migration, type V15NewQuestion } from "../../src/data/a-plus-v15/migration-sql";
import type { V15Exam } from "../../src/data/a-plus-v15/types";

const root = process.cwd();
const bank = JSON.parse(readFileSync(join(root, "src/data/a-plus-v15/v14-bank.json"), "utf8")) as Record<
  string,
  [string, string][]
>;

/** A core's new questions, once its data files exist. */
async function newQuestions(core: "core1" | "core2"): Promise<V15NewQuestion[]> {
  const file = join(root, "src/data/a-plus-v15/new-questions", core, "index.ts");
  if (!existsSync(file)) return [];
  const mod = await import(pathToFileURL(file).href);
  return mod[core === "core1" ? "CORE1_NEW_QUESTIONS" : "CORE2_NEW_QUESTIONS"];
}

const input = async (exam: V15Exam, core: "core1" | "core2") => ({
  exam,
  bank: bank[exam.oldSlug],
  newQuestions: await newQuestions(core),
});

const sql = buildAPlusV15Migration([await input(CORE1_V15, "core1"), await input(CORE2_V15, "core2")]);
const out = process.argv.includes("--release")
  ? join(root, "supabase/migrations/029_a_plus_v15.sql")
  : join(root, "scripts/a-plus-v15/029_a_plus_v15.preview.sql");
writeFileSync(out, sql);
console.log(`Wrote ${out} (${sql.length} characters)`);
