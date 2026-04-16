// Drift check for src/types/database.ts.
//
// Regenerates Supabase types against the linked project and compares against
// the committed file. Exits 1 if they differ so CI can flag the drift.
//
// Requires SUPABASE_ACCESS_TOKEN in env. SUPABASE_PROJECT_ID is optional and
// defaults to the project ref used elsewhere in the codebase.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectId = process.env.SUPABASE_PROJECT_ID || "mdvkidwkjjfgfwkogqvq";

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.log(
    "[db:types:check] SUPABASE_ACCESS_TOKEN not set — skipping drift check."
  );
  process.exit(0);
}

const result = spawnSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--project-id", projectId],
  { encoding: "utf8", shell: process.platform === "win32" }
);

if (result.status !== 0) {
  console.error("[db:types:check] Failed to generate types:");
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}

const generated = result.stdout.replace(/\r\n/g, "\n").trim();
const committedPath = resolve("src/types/database.ts");
const committed = readFileSync(committedPath, "utf8").replace(/\r\n/g, "\n").trim();

if (generated !== committed) {
  console.error(
    "[db:types:check] src/types/database.ts is out of date with the live schema."
  );
  console.error("[db:types:check] Run `npm run db:types` and commit the result.");
  process.exit(1);
}

console.log("[db:types:check] Types match the live schema.");
