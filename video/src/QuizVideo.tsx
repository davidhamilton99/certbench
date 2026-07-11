import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND, FONT_STACK, MONO_STACK } from "./brand";

/**
 * The CertBench quiz video: hook → question + options → 5s countdown →
 * answer reveal + explanation → CTA. 1080×1920 @ 30fps, ~27s.
 *
 * Rendered silent by design: TikTok/Shorts performs best when a trending
 * sound is added natively in the app at post time.
 */

export interface QuizVideoProps {
  certName: string; // "CompTIA Security+"
  examCode: string; // "SY0-701"
  questionNumber: number; // for the hook ("Question 014")
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const FPS = 30;
export const BEATS = {
  hook: 2.5 * FPS, // 0–2.5s
  read: 7.5 * FPS, // question + options, 2.5–10s
  countdown: 5 * FPS, // 10–15s
  reveal: 7 * FPS, // 15–22s
  outro: 5 * FPS, // 22–27s
};
export const TOTAL_FRAMES =
  BEATS.hook + BEATS.read + BEATS.countdown + BEATS.reveal + BEATS.outro;

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function Brandmark({ size = 1 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 * size }}>
      <div
        style={{
          width: 56 * size,
          height: 56 * size,
          borderRadius: 12 * size,
          background: BRAND.blue,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO_STACK,
          fontWeight: 700,
          fontSize: 24 * size,
        }}
      >
        CB
      </div>
      <div
        style={{
          color: BRAND.text,
          fontSize: 34 * size,
          fontWeight: 650,
          fontFamily: FONT_STACK,
          letterSpacing: -0.5,
        }}
      >
        CertBench
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <AbsoluteFill
      style={{
        background: BRAND.bg,
        fontFamily: FONT_STACK,
        padding: 72,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/** Beat 1 — the hook. */
function Hook({ certName, questionNumber }: QuizVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  const shortCert = certName.replace(/^CompTIA\s+/, "");

  return (
    <Frame>
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 40,
          padding: 72,
        }}
      >
        <div style={{ transform: `scale(${pop})` }}>
          <Brandmark size={1.2} />
        </div>
        <div
          style={{
            color: BRAND.text,
            fontSize: 96,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.05,
            letterSpacing: -3,
            transform: `translateY(${interpolate(pop, [0, 1], [40, 0])}px)`,
            opacity: pop,
          }}
        >
          Can you pass
          <br />
          <span style={{ color: BRAND.blue }}>{shortCert}?</span>
        </div>
        <div
          style={{
            color: BRAND.muted,
            fontFamily: MONO_STACK,
            fontSize: 34,
            opacity: interpolate(frame, [15, 30], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {`Question ${String(questionNumber).padStart(3, "0")}`}
        </div>
      </AbsoluteFill>
    </Frame>
  );
}

/** Shared question + options layout (read, countdown, and reveal beats). */
function QuestionBoard({
  props,
  revealed,
  staggerFrom,
}: {
  props: QuizVideoProps;
  revealed: boolean;
  staggerFrom: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shortCert = props.certName.replace(/^CompTIA\s+/, "");
  const qScale = props.questionText.length > 150 ? 0.82 : 1;

  return (
    <Frame>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Brandmark size={0.75} />
        <div
          style={{
            color: BRAND.muted,
            fontFamily: MONO_STACK,
            fontSize: 26,
          }}
        >
          {`${shortCert} · ${props.examCode}`}
        </div>
      </div>

      <div
        style={{
          color: BRAND.text,
          fontSize: 54 * qScale,
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: -1,
          marginTop: 64,
        }}
      >
        {props.questionText}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          marginTop: 56,
          flex: 1,
        }}
      >
        {props.options.map((option, i) => {
          const enter = spring({
            frame: frame - staggerFrom - i * 6,
            fps,
            config: { damping: 14 },
          });
          const isCorrect = revealed && i === props.correctIndex;
          const dimmed = revealed && !isCorrect;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
                background: isCorrect ? "rgba(47,191,113,0.14)" : BRAND.panel,
                border: `3px solid ${isCorrect ? BRAND.green : BRAND.border}`,
                borderRadius: 22,
                padding: "30px 34px",
                opacity: dimmed ? 0.35 : enter,
                transform: `translateX(${interpolate(enter, [0, 1], [60, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO_STACK,
                  fontWeight: 700,
                  fontSize: 28,
                  background: isCorrect ? BRAND.green : BRAND.track,
                  color: isCorrect ? "#04140B" : BRAND.sub,
                }}
              >
                {isCorrect ? "✓" : LETTERS[i]}
              </div>
              <div
                style={{
                  color: BRAND.text,
                  fontSize: 36,
                  fontWeight: 550,
                  lineHeight: 1.3,
                }}
              >
                {option}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

/** Beat 3 — countdown overlay on top of the board. */
function Countdown({ props }: { props: QuizVideoProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const secondsLeft = Math.max(1, Math.ceil((BEATS.countdown - frame) / fps));
  const withinSecond = (frame % fps) / fps;
  const pulse = interpolate(withinSecond, [0, 0.25, 1], [1.25, 1, 1]);
  const r = 92;
  const c = 2 * Math.PI * r;
  const progress = frame / BEATS.countdown;

  return (
    <AbsoluteFill>
      <QuestionBoard props={props} revealed={false} staggerFrom={-999} />
      <div
        style={{
          position: "absolute",
          bottom: 96,
          right: 72,
          width: 220,
          height: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={220} height={220} style={{ position: "absolute" }}>
          <circle
            cx={110}
            cy={110}
            r={r}
            fill={BRAND.bg}
            stroke={BRAND.track}
            strokeWidth={14}
          />
          <circle
            cx={110}
            cy={110}
            r={r}
            fill="none"
            stroke={secondsLeft <= 2 ? BRAND.red : BRAND.blue}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * progress}
            transform="rotate(-90 110 110)"
          />
        </svg>
        <div
          style={{
            color: secondsLeft <= 2 ? BRAND.red : BRAND.text,
            fontFamily: MONO_STACK,
            fontWeight: 800,
            fontSize: 96,
            transform: `scale(${pulse})`,
          }}
        >
          {secondsLeft}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Beat 4 — reveal + explanation strip. */
function Reveal({ props }: { props: QuizVideoProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({ frame: frame - 12, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <QuestionBoard props={props} revealed staggerFrom={-999} />
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 88,
          background: BRAND.panel,
          border: `3px solid ${BRAND.border}`,
          borderLeft: `10px solid ${BRAND.green}`,
          borderRadius: 22,
          padding: "30px 34px",
          fontFamily: FONT_STACK,
          transform: `translateY(${interpolate(slide, [0, 1], [220, 0])}px)`,
          opacity: slide,
        }}
      >
        <div
          style={{
            color: BRAND.green,
            fontFamily: MONO_STACK,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          WHY
        </div>
        <div
          style={{
            color: BRAND.text,
            fontSize: 33,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          {props.explanation}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Beat 5 — CTA. */
function Outro({ props }: { props: QuizVideoProps }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  const shortCert = props.certName.replace(/^CompTIA\s+/, "");

  return (
    <Frame>
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 44,
          padding: 72,
        }}
      >
        <div style={{ transform: `scale(${pop})` }}>
          <Brandmark size={1.3} />
        </div>
        <div
          style={{
            color: BRAND.text,
            fontSize: 72,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.12,
            letterSpacing: -2,
            opacity: pop,
          }}
        >
          Am I ready for
          <br />
          <span style={{ color: BRAND.blue }}>{shortCert}?</span>
        </div>
        <div
          style={{
            color: BRAND.sub,
            fontSize: 38,
            textAlign: "center",
            lineHeight: 1.4,
            opacity: interpolate(frame, [12, 26], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Find out in 3 minutes — free,
          <br />
          no account needed
        </div>
        <div
          style={{
            background: BRAND.blue,
            color: "#fff",
            fontFamily: MONO_STACK,
            fontSize: 42,
            fontWeight: 700,
            padding: "26px 44px",
            borderRadius: 20,
            opacity: interpolate(frame, [20, 34], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          certbench.dev
        </div>
      </AbsoluteFill>
    </Frame>
  );
}

export const QuizVideo: React.FC<QuizVideoProps> = (props) => {
  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      <Sequence durationInFrames={BEATS.hook}>
        <Hook {...props} />
      </Sequence>
      <Sequence from={BEATS.hook} durationInFrames={BEATS.read}>
        <QuestionBoard props={props} revealed={false} staggerFrom={8} />
      </Sequence>
      <Sequence
        from={BEATS.hook + BEATS.read}
        durationInFrames={BEATS.countdown}
      >
        <Countdown props={props} />
      </Sequence>
      <Sequence
        from={BEATS.hook + BEATS.read + BEATS.countdown}
        durationInFrames={BEATS.reveal}
      >
        <Reveal props={props} />
      </Sequence>
      <Sequence from={BEATS.hook + BEATS.read + BEATS.countdown + BEATS.reveal}>
        <Outro props={props} />
      </Sequence>
    </AbsoluteFill>
  );
};
