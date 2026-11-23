import { ImageResponse } from "next/og";
import { verifyShare, type SharePayload } from "@/server/share/readiness-token";
import { CARD, readinessBand, truncate } from "@/lib/share/card";
import { ogFonts, OG_SANS, OG_SERIF } from "@/lib/og/fonts";
import { OgMark } from "@/lib/og/mark";

export const alt = "A CompTIA exam readiness score, measured on CertBench";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic social card: a score report on paper, never a badge. It is set in
 * the site's own two faces, as the site-wide card is (src/app/opengraph-image.tsx),
 * so the two images a link preview can show read as one publication. Only
 * those two weights are loaded: the serif at 600 for the wordmark, the score
 * and the exam's name, and the sans at 500 for everything else.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = verifyShare(token);
  return new ImageResponse(<Card payload={payload} />, { ...size, fonts: await ogFonts() });
}

const SERIF = { fontFamily: OG_SERIF, fontWeight: 600 } as const;

function Brandmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <OgMark size={44} color={CARD.text} />
      <div style={{ display: "flex", color: CARD.text, fontSize: 28, ...SERIF }}>CertBench</div>
    </div>
  );
}

function Card({ payload }: { payload: SharePayload | null }) {
  const base = {
    display: "flex",
    flexDirection: "column" as const,
    width: "100%",
    height: "100%",
    background: CARD.bg,
    padding: 64,
    fontFamily: OG_SANS,
    fontWeight: 500,
  };

  // Fallback (invalid/forged token): still a clean, branded card.
  if (!payload) {
    return (
      <div style={{ ...base, justifyContent: "space-between" }}>
        <Brandmark />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", color: CARD.text, fontSize: 60, lineHeight: 1.1, ...SERIF }}>
            One short step at a time
          </div>
          <div style={{ display: "flex", color: CARD.sub, fontSize: 28 }}>
            Every objective of CompTIA Security+, Network+, and A+, as a study path.
          </div>
        </div>
        <div style={{ display: "flex", color: CARD.muted, fontSize: 22 }}>certbench.dev</div>
      </div>
    );
  }

  const score = Math.max(0, Math.min(100, Math.round(payload.s)));
  const band = readinessBand(score);
  const domains = payload.d.slice(0, 5);

  return (
    <div style={{ ...base, justifyContent: "space-between" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Brandmark />
        {/* A label in sentence case, as every label on the site is: no spaced capitals. */}
        <div style={{ display: "flex", color: CARD.muted, fontSize: 22 }}>Exam readiness</div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
        {/* Score column */}
        <div style={{ display: "flex", flexDirection: "column", width: 500 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              color: band.color,
              fontSize: 140,
              lineHeight: 1,
              letterSpacing: -3,
              ...SERIF,
            }}
          >
            {score}
            <span style={{ fontSize: 60 }}>%</span>
          </div>
          <div
            style={{
              display: "flex",
              color: band.color,
              fontSize: 30,
              marginTop: 10,
            }}
          >
            {`${band.label}${payload.p === 1 ? " (preliminary)" : ""}`}
          </div>
          <div style={{ display: "flex", color: CARD.text, fontSize: 32, marginTop: 22, ...SERIF }}>
            {truncate(payload.c, 34)}
          </div>
          <div style={{ display: "flex", color: CARD.muted, fontSize: 20, marginTop: 6 }}>
            {`${truncate(payload.n, 24)}, ${payload.x}`}
          </div>
          {/* Readiness bar: a rule drawn thick, with square ends. */}
          <div
            style={{
              display: "flex",
              width: 460,
              height: 12,
              borderRadius: 2,
              overflow: "hidden",
              background: CARD.track,
              marginTop: 30,
            }}
          >
            <div
              style={{
                width: (460 * score) / 100,
                height: 12,
                background: band.color,
              }}
            />
          </div>
        </div>

        {/* Domain breakdown */}
        {domains.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 16,
              background: CARD.panel,
              border: `1px solid ${CARD.border}`,
              borderRadius: 6,
              padding: 28,
            }}
          >
            <div style={{ display: "flex", color: CARD.muted, fontSize: 18 }}>Domain breakdown</div>
            {domains.map(([label, dScore], i) => {
              const s = Math.max(0, Math.min(100, Math.round(dScore)));
              return (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 14 }}
                >
                  <div style={{ display: "flex", flex: 1, color: CARD.sub, fontSize: 19 }}>
                    {truncate(label, 22)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: 150,
                      height: 8,
                      borderRadius: 2,
                      overflow: "hidden",
                      background: CARD.track,
                    }}
                  >
                    <div
                      style={{
                        width: (150 * s) / 100,
                        height: 8,
                        background: readinessBand(s).color,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      color: CARD.sub,
                      fontSize: 18,
                      width: 48,
                    }}
                  >
                    {`${s}%`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${CARD.border}`,
          paddingTop: 24,
        }}
      >
        <div style={{ display: "flex", color: CARD.text, fontSize: 22 }}>certbench.dev</div>
        <div style={{ display: "flex", color: CARD.muted, fontSize: 18 }}>
          Readiness score for a CompTIA exam
        </div>
      </div>
    </div>
  );
}
