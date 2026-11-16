/**
 * Writes src/data/sy0-801/copies.json: for every SY0-701 question SY0-801
 * copies, the copy's own question id and its SY0-801 objective. Migration 030
 * creates the copies under these ids, and a learner who switches from SY0-701
 * takes their answers to the copies by them, so an id never changes once
 * given: a re-run keeps every id the file already holds and only adds ids for
 * questions that weren't in it. Run from the repo root after changing the map
 * or the bank snapshot:
 *
 *   npx jiti scripts/sy0-801/assign-copy-ids.ts
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SY0_801_MAP } from "../../src/data/sy0-801/map";

const root = process.cwd();
const bankFile = join(root, "src/data/sy0-801/sy0-701-bank.json");
const copiesFile = join(root, "src/data/sy0-801/copies.json");

const bank = (JSON.parse(readFileSync(bankFile, "utf8")) as Record<string, [string, string][]>)[
  SY0_801_MAP.sourceSlug
];
const before: Record<string, [string, string]> = existsSync(copiesFile)
  ? JSON.parse(readFileSync(copiesFile, "utf8"))
  : {};

const out: Record<string, [string, string]> = {};
for (const [id, code] of [...bank].sort(([a], [b]) => a.localeCompare(b))) {
  if (id in SY0_801_MAP.retired) continue;
  const objective = SY0_801_MAP.overrides[id]?.to ?? SY0_801_MAP.objectiveMap[code];
  if (!objective) throw new Error(`${id}: no SY0-801 objective for SY0-701 ${code}`);
  out[id] = [before[id]?.[0] ?? randomUUID(), objective];
}

writeFileSync(copiesFile, `${JSON.stringify(out, null, 0)}\n`, "utf8");
console.log(`${Object.keys(out).length} copies (${Object.keys(out).filter((id) => !(id in before)).length} new ids)`);
