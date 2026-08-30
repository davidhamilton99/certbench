import type { PortEntry } from "./port-quiz-data";

/** "Which port?" given a protocol, or "which protocol?" given a port. */
export interface QuizQuestion {
  direction: "port" | "protocol";
  answer: PortEntry;
  options: PortEntry[]; // 4, shuffled, includes answer
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build one port-quiz question. Distractors are chosen so every option shows a
 * value distinct from the answer and from each other in the asked direction.
 *
 * This matters because a protocol like RADIUS maps to two ports: without the
 * guard it could appear twice in one question, and — worse — two options with
 * the same displayed value produce the same React key, which breaks list
 * reconciliation so a stale option lingers on screen from one question to the
 * next. Keying the rendered options by the (unique) port closes that too.
 */
export function makeQuestion(entries: PortEntry[]): QuizQuestion {
  const answer = entries[Math.floor(Math.random() * entries.length)];
  const direction: "port" | "protocol" =
    Math.random() < 0.5 ? "port" : "protocol";
  const shown = (e: PortEntry) => (direction === "port" ? e.port : e.protocol);
  const taken = new Set<string>([shown(answer)]);
  const pool: PortEntry[] = [];
  for (const entry of entries) {
    const label = shown(entry);
    if (taken.has(label)) continue;
    taken.add(label);
    pool.push(entry);
  }
  return {
    direction,
    answer,
    options: shuffle([...shuffle(pool).slice(0, 3), answer]),
  };
}
