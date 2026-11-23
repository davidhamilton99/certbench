"use client";

import { useCallback, useMemo } from "react";
import type { PortEntry } from "@/lib/tools/port-quiz-data";
import { makeQuestion, type QuizQuestion } from "@/lib/tools/port-quiz";
import { portExplanation } from "@/lib/recall/port-explanations";
import { itemStatus } from "@/core/drill-rounds/drill-rounds";
import type { ChoiceRep } from "@/core/path/types";
import { useDrillRounds } from "./useDrillRounds";
import { DrillLoading, DrillPlayer, type Dealt } from "./DrillPlayer";
import { EXAMS, RoundComplete } from "./DrillRound";

const LABEL = "Port numbers";

/**
 * A port question as the study path asks a recall fact: the cue big, the ask
 * under it, and ports set in mono.
 *
 * After the verdict the card prints the sentences that the exam's own ports
 * deck gives the row, the same ones the study path and the Recall page print
 * ("FTP uses ports 20 and 21. The File Transfer Protocol uses port 20 for data
 * and port 21 for control."). A port that no deck explains gets one plain
 * sentence. The table's "Service / Use" cell is a note and is never printed
 * as if it were a sentence.
 */
export function portRep(q: QuizQuestion): ChoiceRep {
  const { answer, options } = q;
  const asksPort = q.direction === "port";
  const cue = asksPort ? answer.protocol : answer.port;
  const plain = `${answer.protocol} uses port ${answer.port}${answer.transport ? ` over ${answer.transport}` : ""}.`;
  return {
    id: `port|${answer.port}`,
    type: "choice",
    label: "Recall",
    tier: "recall",
    objective: "",
    prompt: cue,
    cue: asksPort ? "Which port?" : "Which protocol?",
    options: options.map((o) => (asksPort ? o.port : o.protocol)),
    answer: options.indexOf(answer),
    takeaway: portExplanation(answer.port, answer.protocol) ?? plain,
    mono: asksPort,
  };
}

/**
 * The port-numbers drill on the free tool page, played in rounds on the path's
 * own card: round 1 is free, a free account keeps going with rounds built from
 * the visitor's misses, and every round ends on their exam's path.
 */
export function PortQuiz({ entries }: { entries: PortEntry[] }) {
  const ids = useMemo(() => entries.map((e) => e.port), [entries]);
  const byPort = useMemo(() => new Map(entries.map((e) => [e.port, e])), [entries]);
  const rounds = useDrillRounds({ tool: "ports", ids });

  /** The planned port for the next question (random when there's no plan). */
  const deal = useCallback(
    (id: string | null): Dealt => {
      const q = makeQuestion(entries, id ? byPort.get(id) : undefined);
      return { rep: portRep(q), item: q.answer.port };
    },
    [entries, byPort]
  );

  // Questions are random, so nothing is dealt until after hydration.
  if (!rounds.ready) return <DrillLoading label={LABEL} size={rounds.size} />;

  if (rounds.complete) {
    const tiles = entries.map((e) => ({
      id: e.port,
      label: e.port,
      name: e.protocol,
      status: itemStatus(rounds.progress.items[e.port]),
    }));
    return (
      <RoundComplete
        rounds={rounds}
        label={LABEL}
        noun={["port", "ports"]}
        tiles={tiles}
        variant="labels"
        mapTitle="Your ports"
        lead={{
          title: "Port numbers are a small part of the exam.",
          body: "The rest of the exam decides whether you pass. Your study path covers every exam objective in short sets of questions like this one, up to a readiness checkpoint that shows where you stand.",
          exams: [EXAMS.securityPlus, EXAMS.networkPlus, EXAMS.aPlusCore1],
        }}
      />
    );
  }

  return (
    <DrillPlayer
      key={rounds.roundNumber}
      rounds={rounds}
      label={`${LABEL}, round ${rounds.roundNumber}`}
      deal={deal}
    />
  );
}
