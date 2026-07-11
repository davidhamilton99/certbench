import React from "react";
import { AbsoluteFill } from "remotion";
import { BRAND, FONT_STACK, MONO_STACK } from "./brand";

/**
 * 1080×1080 profile avatar for TikTok / YouTube / Instagram — the CB mark
 * on the brand dark, sized to survive the circular crop.
 */
export const Avatar: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: BRAND.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 44,
        fontFamily: FONT_STACK,
      }}
    >
      <div
        style={{
          width: 420,
          height: 420,
          borderRadius: 96,
          background: BRAND.blue,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO_STACK,
          fontWeight: 800,
          fontSize: 190,
          letterSpacing: -6,
          boxShadow: "0 40px 120px rgba(37,99,235,0.35)",
        }}
      >
        CB
      </div>
      <div
        style={{
          color: BRAND.text,
          fontSize: 86,
          fontWeight: 700,
          letterSpacing: -2,
        }}
      >
        CertBench
      </div>
    </AbsoluteFill>
  );
};
