import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CertBench — Know exactly what to study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: "60px 80px",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "auto",
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            CertBench
          </span>
          <span
            style={{
              fontSize: 16,
              color: "#64748b",
            }}
          >
            certbench.dev
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginBottom: "auto",
          }}
        >
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              margin: 0,
              maxWidth: "800px",
            }}
          >
            Know exactly what to study. Pass your certification.
          </h1>
          <p
            style={{
              fontSize: 22,
              color: "#64748b",
              lineHeight: 1.5,
              margin: 0,
              maxWidth: "700px",
            }}
          >
            Personalised study plans, adaptive practice exams, and spaced
            repetition for CompTIA certifications.
          </p>
        </div>

        {/* Bottom stats */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "32px",
          }}
        >
          {[
            { value: "2,000+", label: "Practice questions" },
            { value: "4", label: "CompTIA certifications" },
            { value: "Free", label: "Get studying right away" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#2563eb",
                }}
              >
                {stat.value}
              </span>
              <span style={{ fontSize: 15, color: "#64748b" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
