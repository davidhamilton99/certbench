/**
 * Puts the rewritten question bank (src/data/bank-rewrite) into the live
 * database, one question at a time, and can put the old text back.
 *
 *   node scripts/bank-rewrite/apply.mjs                    Check only. Reads the live bank and reports; changes nothing.
 *   node scripts/bank-rewrite/apply.mjs --apply            Writes the rewritten text. Needs SUPABASE_SERVICE_ROLE_KEY.
 *   node scripts/bank-rewrite/apply.mjs --restore <file>   Puts back the text saved in a backup file made by --apply.
 *
 *   --exam <slug>       Only that exam (for example security-plus-sy0-701).
 *   --env-file <path>   Read the Supabase values from this file (default: .env.local in the current folder).
 *
 * What it does and does not do:
 *
 * - It changes five columns of cert_questions (question_text, options,
 *   correct_index, explanation, difficulty) on rows it names by id. It never
 *   adds or deletes a row, and it touches no other table.
 * - Every question keeps its id, its exam, its objective and the position of
 *   its correct answer, so members' past answers and progress still point at
 *   the right thing.
 * - A question is changed only while it still reads exactly as it did when the
 *   rewrite was made (its `was` fingerprint) and has not been edited since this
 *   run read it. One that has changed is reported and left alone.
 * - A question that already holds the rewritten text is skipped, so the run can
 *   be repeated, or resumed after an interruption, without harm.
 * - Before it writes anything, --apply saves every row it is about to change to
 *   bank-backup-<time>.json in the current folder. --restore puts those rows
 *   back, each only while it still holds the rewritten text.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = join(ROOT, "src", "data", "bank-rewrite");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

/**
 * The fingerprint of a question's text. Each question in the data files carries
 * `was`: this fingerprint of the live text it replaces, taken on the day the
 * rewrite was made.
 */
export function fingerprint(question, options, answer, explanation) {
  return createHash("sha256").update(JSON.stringify([question, options, answer, explanation])).digest("hex").slice(0, 16);
}
const printOf = (row) => fingerprint(row.question_text, row.options.map((o) => o.text), row.correct_index, row.explanation);

function loadEnv() {
  const env = { ...process.env };
  const file = value("--env-file") ?? join(process.cwd(), ".env.local");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

function loadData(onlyExam) {
  const out = [];
  for (const file of readdirSync(DATA).filter((f) => f.endsWith(".json")).sort()) {
    const exam = file.replace(/\.json$/, "");
    if (onlyExam && exam !== onlyExam) continue;
    for (const q of JSON.parse(readFileSync(join(DATA, file), "utf8"))) out.push({ exam, ...q });
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const writing = flag("--apply") || flag("--restore");
  const key = writing ? env.SUPABASE_SERVICE_ROLE_KEY : (env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) {
    console.error(writing ? "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    process.exit(2);
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const request = async (method, path, body, extra = {}) => {
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(`${url}/rest/v1/${path}`, {
          method,
          headers: { ...headers, ...(body ? { "Content-Type": "application/json" } : {}), ...extra },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (res.status >= 500 && attempt < 4) throw new Error(`status ${res.status}`);
        if (!res.ok) throw Object.assign(new Error(`${res.status} ${method} ${path.slice(0, 80)}: ${await res.text()}`), { final: true });
        return res.json();
      } catch (e) {
        if (e.final || attempt >= 4) throw e;
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  };
  const COLUMNS = "id,question_text,options,correct_index,explanation,difficulty,updated_at";
  /** Rows by id, read 100 ids at a time. */
  const readRows = async (ids) => {
    const rows = new Map();
    for (let i = 0; i < ids.length; i += 100) {
      const page = await request("GET", `cert_questions?select=${COLUMNS}&id=in.(${ids.slice(i, i + 100).join(",")})`);
      for (const row of page) rows.set(row.id, row);
    }
    return rows;
  };
  /** Runs `work` over `items`, six at a time. */
  const pooled = async (items, work) => {
    let next = 0;
    await Promise.all(
      Array.from({ length: 6 }, async () => {
        while (next < items.length) await work(items[next++]);
      })
    );
  };
  const patch = (id, updatedAt, body) =>
    request("PATCH", `cert_questions?id=eq.${id}&updated_at=eq.${encodeURIComponent(updatedAt)}`, body, { Prefer: "return=representation" });

  // ---- restore ----
  if (flag("--restore")) {
    const backup = JSON.parse(readFileSync(value("--restore"), "utf8"));
    const data = new Map(loadData().map((q) => [q.id, q]));
    const live = await readRows(backup.map((b) => b.id));
    let restored = 0;
    const left = [];
    await pooled(backup, async (old) => {
      const row = live.get(old.id);
      const q = data.get(old.id);
      if (!row || !q || printOf(row) !== fingerprint(q.question, q.options, q.answer, q.explanation)) return left.push(old.id);
      const done = await patch(old.id, row.updated_at, {
        question_text: old.question_text,
        options: old.options,
        correct_index: old.correct_index,
        explanation: old.explanation,
        difficulty: old.difficulty,
      });
      if (done.length === 1) restored++;
      else left.push(old.id);
    });
    console.log(`${restored} of ${backup.length} questions put back to their saved text.`);
    if (left.length) console.log(`${left.length} left alone because they no longer hold the rewritten text: ${left.slice(0, 10).join(", ")}${left.length > 10 ? " ..." : ""}`);
    process.exit(left.length ? 1 : 0);
  }

  // ---- check, then apply ----
  const data = loadData(value("--exam"));
  if (!data.length) {
    console.error("No rewritten questions found in src/data/bank-rewrite for that exam.");
    process.exit(2);
  }
  const live = await readRows(data.map((q) => q.id));
  const todo = [];
  const report = new Map();
  const count = (exam, state) => {
    if (!report.has(exam)) report.set(exam, { old: 0, done: 0, changed: 0, missing: 0 });
    report.get(exam)[state]++;
  };
  const trouble = [];
  for (const q of data) {
    const row = live.get(q.id);
    if (!row) {
      count(q.exam, "missing");
      trouble.push(`${q.id} is not in the live bank`);
    } else if (printOf(row) === fingerprint(q.question, q.options, q.answer, q.explanation)) {
      count(q.exam, "done");
    } else if (printOf(row) === q.was) {
      count(q.exam, "old");
      todo.push({ q, row });
    } else {
      count(q.exam, "changed");
      trouble.push(`${q.id} has been edited since the rewrite was made`);
    }
  }
  for (const [exam, r] of report) console.log(`${exam}: ${r.old} to rewrite, ${r.done} already rewritten, ${r.changed} edited since (left alone), ${r.missing} missing`);
  for (const line of trouble.slice(0, 20)) console.log(`  ${line}`);
  if (trouble.length > 20) console.log(`  and ${trouble.length - 20} more`);
  if (!flag("--apply")) {
    console.log(`Check only: nothing was changed. Add --apply to write ${todo.length} questions.`);
    process.exit(trouble.length ? 1 : 0);
  }
  if (!todo.length) {
    console.log("Nothing to write.");
    process.exit(trouble.length ? 1 : 0);
  }

  const backupFile = join(process.cwd(), `bank-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backupFile, JSON.stringify(todo.map(({ row }) => row), null, 1), "utf8");
  console.log(`Saved the ${todo.length} questions as they are now to ${backupFile}`);

  let written = 0;
  const failed = [];
  await pooled(todo, async ({ q, row }) => {
    try {
      const done = await patch(q.id, row.updated_at, {
        question_text: q.question,
        options: q.options.map((text, i) => ({ text, is_correct: i === q.answer })),
        correct_index: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      });
      if (done.length === 1) written++;
      else failed.push(`${q.id}: edited while this ran, left alone`);
    } catch (e) {
      failed.push(`${q.id}: ${e.message}`);
    }
    if ((written + failed.length) % 500 === 0) console.log(`  ${written + failed.length} of ${todo.length}`);
  });

  // Read everything back and compare.
  const after = await readRows(data.map((q) => q.id));
  const wrong = data.filter((q) => {
    const row = after.get(q.id);
    return !row || printOf(row) !== fingerprint(q.question, q.options, q.answer, q.explanation);
  });
  console.log(`${written} questions rewritten. Read back: ${data.length - wrong.length} of ${data.length} now hold the rewritten text.`);
  for (const line of failed.slice(0, 20)) console.log(`  ${line}`);
  if (wrong.length) console.log(`Not rewritten: ${wrong.slice(0, 10).map((q) => q.id).join(", ")}${wrong.length > 10 ? " ..." : ""}. Run the same command again to retry them.`);
  process.exit(wrong.length ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  });
}
