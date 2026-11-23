// Renders the CertBench icon files from the bench-mark glyph (src/components/brand/Logo.tsx):
//   public/icon-192.png, icon-512.png            the app icon, rounded
//   public/icon-maskable-192.png, -512.png       full-bleed, glyph inside the safe zone
//   public/apple-touch-icon.png                  180px, full-bleed (iOS rounds it)
//   public/icon.svg                              the same tile as a vector
//   src/app/favicon.ico                          16, 32 and 48px PNGs in one .ico
//
// It needs the image library sharp, which package.json does not list. Next.js
// installs sharp as one of its own optional dependencies (see "node_modules/next"
// in package-lock.json), so `npm install` brings it in unless optional
// dependencies are left out. If the import of sharp fails, install it without
// changing package.json or the lockfile, and run the script again:
//   npm install --no-save sharp
//
// Run it from the repository's root after changing the mark:
//   node scripts/render-icons.mjs
// It overwrites the seven files above, which are committed with the change.
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
/** The navy band, and white line work (src/app/globals.css: --sheet). */
const SHEET = "#0c2a55";
const INK = "#ffffff";

/**
 * The tile as SVG. `radius` rounds its corners (0 for full-bleed), `scale` is
 * the glyph's size within it, and `weight` thickens the strokes for small sizes.
 */
function tile({ radius = 6, scale = 0.74, weight = 1 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
  <rect width="28" height="28" rx="${radius}" fill="${SHEET}"/>
  <g transform="translate(14 14) scale(${scale}) translate(-14 -14.4)" fill="none" stroke="${INK}">
    <path d="M3.5 6.6h21" stroke-width="${2.8 * weight}"/>
    <path d="M14 8.6v14.2M14 8.6 7.55 21.25M14 8.6l6.45 12.65" stroke-width="${2.3 * weight}" stroke-linecap="round"/>
  </g>
</svg>`;
}

const png = (svg, size) => sharp(Buffer.from(svg), { density: 96 * (size / 28) * 2 }).resize(size, size).png().toBuffer();

/** An .ico holding PNG images (every current browser and Windows reads these). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size === 256 ? 0 : size, 0);
    e.writeUInt8(size === 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const rounded = tile();
const bleed = tile({ radius: 0, scale: 0.6 });
const out = (p) => join(root, p);

await writeFile(out("public/icon.svg"), rounded + "\n");
await writeFile(out("public/icon-192.png"), await png(rounded, 192));
await writeFile(out("public/icon-512.png"), await png(rounded, 512));
await writeFile(out("public/icon-maskable-192.png"), await png(bleed, 192));
await writeFile(out("public/icon-maskable-512.png"), await png(bleed, 512));
await writeFile(out("public/apple-touch-icon.png"), await png(tile({ radius: 0, scale: 0.7 }), 180));
await writeFile(
  out("src/app/favicon.ico"),
  ico([
    { size: 16, data: await png(tile({ radius: 4, scale: 0.84, weight: 1.35 }), 16) },
    { size: 32, data: await png(tile({ radius: 5, scale: 0.8, weight: 1.15 }), 32) },
    { size: 48, data: await png(tile({ radius: 6, scale: 0.78 }), 48) },
  ])
);
console.log("icons written");
