import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bandFor, BUILDING_BAND } from "@/lib/readiness/band";
import { BAND_HEX, OG } from "../mark";

/**
 * Generated images, the shared score card and emails cannot read the
 * stylesheet, so they take their colours from one table of plain hex. This
 * converts the stylesheet's light-theme tokens to sRGB and compares, so the
 * table and the site cannot drift apart.
 */
const CSS = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
// The light theme is the block that opens ":root, .cb-paper {" and runs to its closing brace.
const LIGHT_START = CSS.search(/^:root,\s*$/m);
const LIGHT = CSS.slice(LIGHT_START, CSS.indexOf("\n}", LIGHT_START));

/** An oklch colour as the browser draws it in sRGB: "#0c2a55". */
function oklchToHex(lightness: number, chroma: number, hue: number): string {
  const h = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(h);
  const b = chroma * Math.sin(h);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const encode = (value: number) => {
    const v = value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
  };
  return `#${linear.map((value) => encode(value).toString(16).padStart(2, "0")).join("")}`;
}

/** A light-theme token as hex. */
function token(name: string): string {
  const found = LIGHT.match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`));
  if (!found) throw new Error(`The stylesheet has no opaque oklch token --${name}`);
  return oklchToHex(Number(found[1]), Number(found[2]), Number(found[3]));
}

/** One colour laid over another at a given strength, as a translucent fill is drawn. */
function over(top: string, bottom: string, strength: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(channel(top, i) * strength + channel(bottom, i) * (1 - strength))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

describe("the hex table for images and emails", () => {
  it("holds the stylesheet's own colours", () => {
    expect({
      sheet: OG.sheet,
      paper: OG.paper,
      ink: OG.ink,
      muted: OG.muted,
      rule: OG.rule,
      control: OG.control,
      primary: OG.primary,
      desk: OG.desk,
      tint: OG.tint,
      success: OG.success,
      warning: OG.warning,
      warningInk: OG.warningInk,
      danger: OG.danger,
    }).toEqual({
      sheet: token("sheet"),
      paper: token("background"),
      ink: token("foreground"),
      muted: token("muted-foreground"),
      rule: token("border"),
      control: token("input"),
      primary: token("primary"),
      desk: token("surface"),
      tint: token("muted"),
      success: token("success"),
      warning: token("warning"),
      warningInk: token("warning-ink"),
      danger: token("danger"),
    });
  });

  it("draws a bar's track as the site does: the ink at 9% on paper", () => {
    expect(OG.track).toBe(over(token("foreground"), token("background"), 0.09));
  });

  it("writes every colour as plain hex or rgba, which an image or an email can use", () => {
    for (const [name, value] of Object.entries(OG)) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}$|^rgba\(255,255,255,0\.\d+\)$/);
    }
  });

  it("has a colour for every band a score can fall into, in the mark colours", () => {
    for (let score = 0; score <= 100; score++) expect(BAND_HEX[bandFor(score).key], String(score)).toBeDefined();
    expect(BAND_HEX[BUILDING_BAND.key]).toEqual({ fill: OG.primary, ink: OG.primary });
    expect(BAND_HEX.ready).toEqual({ fill: OG.success, ink: OG.success });
    expect(BAND_HEX.work).toEqual({ fill: OG.danger, ink: OG.danger });
    // Amber is drawn as a bar in one colour and written as words in a darker one.
    expect(BAND_HEX.close).toEqual({ fill: OG.warning, ink: OG.warningInk });
  });
});
