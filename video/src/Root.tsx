import React from "react";
import { Composition } from "remotion";
import { QuizVideo, TOTAL_FRAMES, type QuizVideoProps } from "./QuizVideo";

const DEFAULT_PROPS: QuizVideoProps = {
  certName: "CompTIA Security+",
  examCode: "SY0-701",
  questionNumber: 1,
  questionText:
    "An administrator needs to allow secure remote shell access to a Linux server through the firewall. Which port should be opened?",
  options: ["Port 23", "Port 22", "Port 443", "Port 3389"],
  correctIndex: 1,
  explanation:
    "SSH (Secure Shell) uses TCP port 22. Telnet (23) is unencrypted, 443 is HTTPS, and 3389 is RDP.",
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="QuizVideo"
      component={QuizVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEFAULT_PROPS}
    />
  );
};
