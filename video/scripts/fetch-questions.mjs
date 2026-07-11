// Pulls video-friendly questions from the CertBench question bank into
// props files for the QuizVideo composition.
//
//   node scripts/fetch-questions.mjs <cert-slug> <count>
//   node scripts/fetch-questions.mjs security-plus-sy0-701 10
//
// Filters for on-screen readability (short question/options/explanation),
// and keeps a ledger (data/used-ids.json) so batches never repeat a question.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
config({ path: join(root, "..", ".env.local") });

const [slug, countArg] = process.argv.slice(2);
if (!slug) {
  console.error("usage: node scripts/fetch-questions.mjs <cert-slug> [count=10]");
  process.exit(1);
}
const count = Number(countArg ?? 10);

const MAX_QUESTION = 220;
const MAX_OPTION = 80;
const MAX_EXPLANATION = 220;

/**
 * Explanations in the bank are thorough (median ~390 chars) — far too long
 * for a 7-second beat. Keep whole sentences from the start until the cap;
 * the first sentence is almost always the core "why".
 */
function clipExplanation(text) {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [text];
  let out = "";
  for (const s of sentences) {
    if ((out + s).trim().length > MAX_EXPLANATION) break;
    out += s;
  }
  out = out.trim();
  return out.length >= 40 ? out : text.slice(0, MAX_EXPLANATION - 1).trim() + "…";
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });
const ledgerPath = join(dataDir, "used-ids.json");
const used = new Set(
  existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, "utf8")) : []
);

const { data: cert, error: certErr } = await db
  .from("certifications")
  .select("id, name, exam_code")
  .eq("slug", slug)
  .single();
if (certErr || !cert) {
  console.error(`cert not found: ${slug}`);
  process.exit(1);
}

const { data: questions, error } = await db
  .from("cert_questions")
  .select("id, question_text, options, correct_index, explanation")
  .eq("certification_id", cert.id)
  .eq("is_active", true);
if (error) {
  console.error(error.message);
  process.exit(1);
}

const eligible = questions.filter((q) => {
  if (used.has(q.id)) return false;
  if (q.question_text.length > MAX_QUESTION) return false;
  const opts = Array.isArray(q.options) ? q.options : [];
  if (opts.length < 3 || opts.length > 4) return false;
  if (opts.some((o) => (o.text ?? "").length > MAX_OPTION)) return false;
  if (!q.explanation) return false; // explanations get clipped, not rejected
  return true;
});

// Shuffle and take.
for (let i = eligible.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
}
const picked = eligible.slice(0, count);

if (picked.length === 0) {
  console.error("no eligible unused questions left for this cert");
  process.exit(1);
}

const stamp = new Date().toISOString().slice(0, 10);
let n = 0;
for (const q of picked) {
  n += 1;
  const props = {
    certName: cert.name,
    examCode: cert.exam_code,
    questionNumber: n,
    questionText: q.question_text,
    options: q.options.map((o) => o.text),
    correctIndex: q.correct_index,
    explanation: clipExplanation(q.explanation),
  };
  const file = join(dataDir, `${slug}-${stamp}-${String(n).padStart(2, "0")}.json`);
  writeFileSync(file, JSON.stringify(props, null, 2));
  used.add(q.id);
  console.log(`wrote ${file}`);
}

writeFileSync(ledgerPath, JSON.stringify([...used], null, 2));
console.log(
  `\n${picked.length} props file(s) ready (${eligible.length - picked.length} eligible remain). Next: npm run render`
);
