// Renders every props file in data/ that doesn't already have an MP4 in out/.
//
//   node scripts/render-batch.mjs
//
// Each ~27s 1080x1920 video takes a minute or three depending on the machine.
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dataDir = join(root, "data");
const outDir = join(root, "out");
mkdirSync(outDir, { recursive: true });

const propsFiles = existsSync(dataDir)
  ? readdirSync(dataDir).filter(
      (f) => f.endsWith(".json") && f !== "used-ids.json"
    )
  : [];

if (propsFiles.length === 0) {
  console.log("nothing to render — run `npm run fetch -- <cert-slug> <count>` first");
  process.exit(0);
}

let rendered = 0;
for (const file of propsFiles) {
  const base = file.replace(/\.json$/, "");
  const outFile = join(outDir, `${base}.mp4`);
  if (existsSync(outFile)) {
    console.log(`skip (exists): ${base}.mp4`);
    continue;
  }
  console.log(`\n=== rendering ${base} ===`);
  execSync(
    `npx remotion render src/index.ts QuizVideo "${outFile}" --props="${join(dataDir, file)}"`,
    { cwd: root, stdio: "inherit" }
  );
  rendered += 1;
}

console.log(`\ndone — ${rendered} video(s) in ${outDir}`);
