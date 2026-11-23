import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SharePayload } from "@/server/share/readiness-token";

const share = vi.hoisted(() => ({ payload: null as SharePayload | null }));
vi.mock("@/server/share/readiness-token", () => ({ verifyShare: () => share.payload }));

/** What the page handed to the image renderer: the drawing and its options. */
const drawn = vi.hoisted(() => ({
  element: null as ReactElement | null,
  options: null as { width?: number; height?: number; fonts?: { name: string; weight: number }[] } | null,
}));
vi.mock("next/og", async (original) => {
  const real = await original<typeof import("next/og")>();
  return {
    // The real renderer, which also notes what it was given.
    ImageResponse: class extends real.ImageResponse {
      constructor(element: ReactElement, options?: ConstructorParameters<typeof real.ImageResponse>[1]) {
        super(element, options);
        drawn.element = element;
        drawn.options = options as typeof drawn.options;
      }
    },
  };
});

import { OG_SANS, OG_SERIF } from "@/lib/og/fonts";
import Image, { size } from "../opengraph-image";

const PAYLOAD: SharePayload = {
  n: "Sam R.",
  c: "CompTIA Security+",
  x: "SY0-701",
  s: 72.4,
  p: 0,
  d: [
    ["General Security Concepts", 81],
    ["Security Architecture", 38],
  ],
};

const params = Promise.resolve({ token: "token" });
const PNG = [0x89, 0x50, 0x4e, 0x47];

async function render() {
  const response = await Image({ params });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { response, bytes, words: renderToStaticMarkup(drawn.element!) };
}

beforeEach(() => {
  share.payload = PAYLOAD;
  drawn.element = null;
  drawn.options = null;
});

describe("the shared readiness image", () => {
  it("is drawn as a PNG of the standard size, for a card and for a link that holds none", async () => {
    for (const payload of [PAYLOAD, null]) {
      share.payload = payload;
      const { response, bytes } = await render();
      expect(response.headers.get("content-type")).toBe("image/png");
      expect([...bytes.slice(0, 4)]).toEqual(PNG);
      expect(drawn.options).toMatchObject(size);
    }
  }, 30000);

  it("is set in the site's two faces, as the site-wide image is", async () => {
    const { words } = await render();
    expect(drawn.options?.fonts?.map((f) => `${f.name} ${f.weight}`)).toEqual([`${OG_SERIF} 600`, `${OG_SANS} 500`]);
    expect(words).toContain(OG_SANS);
    expect(words).toContain(OG_SERIF);
    expect(words).not.toMatch(/font-family:\s*sans-serif/);
  }, 30000);

  it("prints its labels in sentence case, with no spaced capitals", async () => {
    const { words } = await render();
    expect(words).toContain("Exam readiness");
    expect(words).toContain("Domain breakdown");
    expect(words).not.toContain("EXAM READINESS");
    expect(words).not.toContain("DOMAIN BREAKDOWN");
    // Only the large figure is tightened; no label is spaced out.
    expect(words).not.toMatch(/letter-spacing:\s*[1-9]/);
  }, 30000);

  it("prints the score, the exam and who it belongs to", async () => {
    const { words } = await render();
    expect(words).toContain(">72<");
    expect(words).toContain("CompTIA Security+");
    expect(words).toContain("Sam R., SY0-701");
    // A domain's name has a fixed width in the image, so a long one is shortened there.
    expect(words).toContain("Security Architecture");
    expect(words).toContain(">38%<");
  }, 30000);
});
