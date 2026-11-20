import { ImageResponse } from "next/og";
import { OgMark } from "@/lib/og/mark";

// Site-wide social share card (Open Graph + Twitter fall back to this).
// 1200×630, the standard large-summary size, in the CertBench 3 look: a deep
// canvas lit from above, the promise set large, and the route lit to "you".
export const alt = "CertBench — pass your CompTIA exam one short stop at a time";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The route along the bottom: stops lit up to a puck, the rest dim, a flag at the end. */
const STOPS = 24;
const HERE = 9;

export default function OpengraphImage() {
  const ink = "#f4f5f8";
  const muted = "#8e94a5";
  const blue = "#3d8bff";
  const cyan = "#5ad2f4";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px 70px",
          background:
            "radial-gradient(900px 520px at 50% -18%, rgba(61,139,255,0.30), transparent 70%), linear-gradient(180deg, #0b0c11, #07080b)",
          color: ink,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <OgMark size={56} />
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.8 }}>CertBench</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: muted, letterSpacing: 2 }}>
            SECURITY+ · NETWORK+ · A+
          </div>
        </div>

        {/* Promise */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.02, letterSpacing: -4 }}>
            Pass your exam.
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.02, letterSpacing: -4, color: "#6b7182" }}>
            One short stop at a time.
          </div>
        </div>

        {/* The route */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", position: "relative", alignItems: "center", height: 28 }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 12,
                height: 4,
                borderRadius: 4,
                background: "rgba(255,255,255,0.10)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                width: `${(HERE / (STOPS - 1)) * 100}%`,
                top: 12,
                height: 4,
                borderRadius: 4,
                background: `linear-gradient(90deg, ${blue}, ${cyan})`,
                boxShadow: `0 0 18px ${blue}`,
              }}
            />
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
              {Array.from({ length: STOPS }, (_, i) =>
                i === HERE ? (
                  <div
                    key={i}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: blue,
                      border: "6px solid #0a0b0f",
                      boxShadow: `0 0 0 2px ${blue}, 0 0 28px ${blue}`,
                    }}
                  />
                ) : (
                  <div
                    key={i}
                    style={{
                      width: i === STOPS - 1 ? 20 : 12,
                      height: i === STOPS - 1 ? 20 : 12,
                      borderRadius: 999,
                      background: i < HERE ? blue : i === STOPS - 1 ? "#0a0b0f" : "rgba(255,255,255,0.28)",
                      border: i === STOPS - 1 ? "3px solid rgba(255,255,255,0.55)" : "none",
                    }}
                  />
                )
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: muted }}>
            <div style={{ display: "flex" }}>Every objective, in short stops</div>
            <div style={{ display: "flex", color: ink, fontWeight: 600 }}>certbench.dev</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
