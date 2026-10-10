import { ImageResponse } from "next/og";

// Site-wide social share card (Open Graph + Twitter fall back to this).
// 1200×630, the standard large-summary size. Branded to the instrument look:
// deep dark ground, indigo accent, the product's actual promise.
export const alt = "CertBench — know exactly what to study for your CompTIA exam";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const indigo = "#6366f1";
  const ink = "#eef1f9";
  const muted = "#9aa3bd";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(1200px 600px at 50% -20%, rgba(99,102,241,0.28), transparent 60%), linear-gradient(160deg, #0e1119, #0a0c12)",
          color: ink,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: indigo,
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            CB
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>
            CertBench
          </div>
        </div>

        {/* Promise */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            Know&nbsp;<span style={{ color: indigo }}>exactly</span>&nbsp;what to
            study.
          </div>
          <div style={{ fontSize: 34, color: muted, maxWidth: 920, lineHeight: 1.3 }}>
            Adaptive CompTIA exam prep with a readiness score you can trust — so
            you walk in ready.
          </div>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {["Security+", "Network+", "A+"].map((c) => (
              <div
                key={c}
                style={{
                  display: "flex",
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: 26,
                  color: ink,
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 28, color: muted, fontWeight: 600 }}>
            certbench.dev
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
