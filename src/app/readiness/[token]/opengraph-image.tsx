import { ImageResponse } from "next/og";
import { verifyShare, type SharePayload } from "@/server/share/readiness-token";
import { CARD, readinessBand, truncate } from "@/lib/share/card";

export const alt = "CompTIA exam readiness — CertBench";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Dynamic social card: a refined dark data-report, never a gamified badge. */
export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = verifyShare(token);
  return new ImageResponse(<Card payload={payload} />, { ...size });
}

function Brandmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 10,
          background: CARD.brand,
          color: "#fff",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        CB
      </div>
      <div style={{ color: CARD.text, fontSize: 26, fontWeight: 600 }}>
        CertBench
      </div>
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
    fontFamily: "sans-serif",
  };

  // Fallback (invalid/forged token): still a clean, branded card.
  if (!payload) {
    return (
      <div style={{ ...base, justifyContent: "space-between" }}>
        <Brandmark />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: CARD.text, fontSize: 56, fontWeight: 700 }}>
            Know exactly what to study
          </div>
          <div style={{ color: CARD.sub, fontSize: 28 }}>
            A readiness score you can trust — for CompTIA Security+, Network+, and A+.
          </div>
        </div>
        <div style={{ color: CARD.muted, fontSize: 22 }}>certbench.dev</div>
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
        <div
          style={{
            color: CARD.muted,
            fontSize: 15,
            letterSpacing: 3,
            fontWeight: 600,
          }}
        >
          EXAM READINESS
        </div>
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
              fontSize: 150,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -4,
            }}
          >
            {score}
            <span style={{ fontSize: 64, fontWeight: 700 }}>%</span>
          </div>
          <div
            style={{
              color: band.color,
              fontSize: 30,
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            {`${band.label}${payload.p === 1 ? " · preliminary" : ""}`}
          </div>
          <div style={{ color: CARD.text, fontSize: 30, fontWeight: 600, marginTop: 22 }}>
            {truncate(payload.c, 34)}
          </div>
          <div style={{ color: CARD.muted, fontSize: 20, marginTop: 6 }}>
            {`${truncate(payload.n, 24)} · ${payload.x}`}
          </div>
          {/* Readiness bar */}
          <div
            style={{
              display: "flex",
              width: 460,
              height: 12,
              borderRadius: 6,
              background: CARD.track,
              marginTop: 30,
            }}
          >
            <div
              style={{
                width: (460 * score) / 100,
                height: 12,
                borderRadius: 6,
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
              borderRadius: 16,
              padding: 28,
            }}
          >
            <div
              style={{
                color: CARD.muted,
                fontSize: 14,
                letterSpacing: 2,
                fontWeight: 600,
              }}
            >
              DOMAIN BREAKDOWN
            </div>
            {domains.map(([label, dScore], i) => {
              const s = Math.max(0, Math.min(100, Math.round(dScore)));
              return (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 14 }}
                >
                  <div style={{ display: "flex", flex: 1, color: "#C7CBD1", fontSize: 19 }}>
                    {truncate(label, 22)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: 150,
                      height: 8,
                      borderRadius: 4,
                      background: CARD.track,
                    }}
                  >
                    <div
                      style={{
                        width: (150 * s) / 100,
                        height: 8,
                        borderRadius: 4,
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
        <div style={{ color: CARD.text, fontSize: 22, fontWeight: 600 }}>
          certbench.dev
        </div>
        <div style={{ color: CARD.muted, fontSize: 18 }}>
          Adaptive CompTIA exam prep · free readiness score
        </div>
      </div>
    </div>
  );
}
