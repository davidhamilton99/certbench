/**
 * Writes src/data/sy0-801/sy0-701-bank.json: the id and objective code of every
 * SY0-701 question, or its domain number when the database never tagged it to
 * an objective. It reads the live bank through the public, read-only API (GET
 * requests only), so run it with the two public Supabase values CI uses:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… node scripts/sy0-801/snapshot-bank.mjs
 *
 * The SY0-801 map (src/data/sy0-801) decides where each of these questions
 * goes, and its tests account for every one. The migration that copies them
 * checks the bank still matches this snapshot before it changes anything.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SLUG = "security-plus-sy0-701";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

async function get(path, headers = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: "GET",
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`);
  return res.json();
}

const [cert] = await get(`certifications?select=id&slug=eq.${SLUG}`);
if (!cert) throw new Error(`no certification ${SLUG}`);
const domains = await get(`cert_domains?select=id,domain_number&certification_id=eq.${cert.id}`);
const subs = await get(`cert_sub_objectives?select=id,code&domain_id=in.(${domains.map((d) => d.id).join(",")})`);
const domainNumber = new Map(domains.map((d) => [d.id, d.domain_number]));
const subCode = new Map(subs.map((s) => [s.id, s.code]));

const rows = [];
for (let from = 0; ; from += 1000) {
  const page = await get(
    `cert_questions?select=id,domain_id,sub_objective_id&certification_id=eq.${cert.id}&order=id`,
    { Range: `${from}-${from + 999}`, "Range-Unit": "items" }
  );
  for (const q of page) {
    const code = (q.sub_objective_id && subCode.get(q.sub_objective_id)) || domainNumber.get(q.domain_id);
    if (!code) throw new Error(`question ${q.id} has no objective or domain`);
    rows.push([q.id, code]);
  }
  if (page.length < 1000) break;
}

const out = join(process.cwd(), "src/data/sy0-801/sy0-701-bank.json");
writeFileSync(out, `${JSON.stringify({ [SLUG]: rows })}\n`, "utf8");
console.log(`${rows.length} questions written to ${out}`);
