import { ImageResponse } from "next/og";
import { ogFonts, OG_SANS, OG_SERIF } from "@/lib/og/fonts";
import { OG, OgMark } from "@/lib/og/mark";

// Site-wide social share card (Open Graph + Twitter fall back to this).
// 1200×630, the standard large-summary size: the navy band, the wordmark, and
// what the site is in one plain line.
export const alt = "CertBench. Exam preparation for CompTIA Security+, Network+ and A+.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 76px 60px",
          background: OG.sheet,
          color: OG.sheetText,
          fontFamily: OG_SANS,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <OgMark size={56} />
          <div style={{ display: "flex", fontFamily: OG_SERIF, fontSize: 42, fontWeight: 600 }}>CertBench</div>
        </div>

        {/* What it is */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              fontFamily: OG_SERIF,
              fontSize: 92,
              fontWeight: 600,
              lineHeight: 1.06,
              letterSpacing: -1.2,
              maxWidth: 1040,
            }}
          >
            Prepare for your CompTIA certification exam.
          </div>
          <div style={{ display: "flex", width: 96, height: 4, background: OG.sheetText }} />
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", fontSize: 30 }}>
          <div style={{ display: "flex", color: OG.sheetMuted }}>Security+, Network+ and A+</div>
          <div style={{ display: "flex" }}>certbench.dev</div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  );
}
