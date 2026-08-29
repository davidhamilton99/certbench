"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Flame, Shuffle, X } from "lucide-react";
import {
  generateRecallQuestion,
  gradeRecall,
  type RecallQuestion,
  type ResolvedDeck,
} from "@/lib/recall/recall-deck";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIXED = "__mixed__";
/** How often a previously-missed item resurfaces instead of a fresh one. */
const RESURFACE_RATE = 0.3;
/** Pause on a correct answer before auto-advancing (ms). */
const ADVANCE_MS = 550;

/**
 * The Recall drill. A fast, keyboard-first recall loop over verified reference
 * decks — pick a deck or mix them, answer with the number keys, and correct
 * answers auto-advance so a session stays in flow. Missed items resurface until
 * you get them right. Question generation is random, so the first question is
 * created after mount (SSR renders a stable placeholder; no hydration mismatch).
 */
export function RecallPlayer({ decks }: { decks: ResolvedDeck[] }) {
  const canMix = decks.length > 1;
  const [deckKey, setDeckKey] = useState<string>(decks[0]?.config.id ?? MIXED);
  const [question, setQuestion] = useState<RecallQuestion | null>(null);
  const [answerValue, setAnswerValue] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [qpm, setQpm] = useState(0);

  const startedAt = useRef<number | null>(null);
  const missQueue = useRef<RecallQuestion[]>([]);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function deckFor(key: string): ResolvedDeck {
    if (key === MIXED) return decks[Math.floor(Math.random() * decks.length)];
    return decks.find((d) => d.config.id === key) ?? decks[0];
  }

  function nextQuestion(key: string): RecallQuestion {
    if (missQueue.current.length > 0 && Math.random() < RESURFACE_RATE) {
      return missQueue.current.shift()!;
    }
    return generateRecallQuestion(deckFor(key));
  }

  // First question after mount (random → client-only). Single setState.
  useEffect(() => {
    startedAt.current = Date.now();
    setQuestion(generateRecallQuestion(deckFor(decks[0]?.config.id ?? MIXED)));
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
    // Mount only; deck switches are handled in selectDeck.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealed = answerValue !== null;

  function selectDeck(key: string) {
    if (key === deckKey) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    missQueue.current = [];
    startedAt.current = Date.now();
    setDeckKey(key);
    setScore({ correct: 0, answered: 0 });
    setStreak(0);
    setBest(0);
    setQpm(0);
    setAnswerValue(null);
    setTyped("");
    setQuestion(generateRecallQuestion(deckFor(key)));
  }

  function advance() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setAnswerValue(null);
    setTyped("");
    setQuestion(nextQuestion(deckKey));
  }

  function record(value: string) {
    if (revealed || !question) return;
    const correct = gradeRecall(question, value);
    setAnswerValue(value);

    const answered = score.answered + 1;
    setScore({ correct: score.correct + (correct ? 1 : 0), answered });

    const elapsedMin = (Date.now() - (startedAt.current ?? Date.now())) / 60000;
    setQpm(elapsedMin > 0 ? Math.round(answered / elapsedMin) : 0);

    if (correct) {
      const s = streak + 1;
      setStreak(s);
      if (s > best) setBest(s);
      advanceTimer.current = setTimeout(advance, ADVANCE_MS);
    } else {
      setStreak(0);
      missQueue.current.push(question);
    }
  }

  // Keyboard: number keys pick an option; Enter/Space advances after reveal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!question) return;
      if (revealed) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          advance();
        }
        return;
      }
      if (question.mode === "choice") {
        const idx = Number(e.key) - 1;
        if (Number.isInteger(idx) && idx >= 0 && idx < question.options.length) {
          e.preventDefault();
          record(question.options[idx]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, revealed]);

  if (!question) {
    return (
      <div className="grid min-h-72 place-items-center rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading the drill…
      </div>
    );
  }

  const accuracy =
    score.answered > 0 ? Math.round((score.correct / score.answered) * 100) : 0;
  const wasCorrect = revealed && gradeRecall(question, answerValue!);

  return (
    <div className="grid gap-4">
      {/* Deck picker */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Deck">
        {decks.map((d) => (
          <button
            key={d.config.id}
            type="button"
            role="tab"
            aria-selected={deckKey === d.config.id}
            onClick={() => selectDeck(d.config.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              deckKey === d.config.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-muted-foreground/40"
            )}
          >
            {d.config.label}
          </button>
        ))}
        {canMix && (
          <button
            type="button"
            role="tab"
            aria-selected={deckKey === MIXED}
            onClick={() => selectDeck(MIXED)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              deckKey === MIXED
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-muted-foreground/40"
            )}
          >
            <Shuffle className="size-3.5" />
            Mixed
          </button>
        )}
      </div>

      {/* Scoreboard */}
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>
          {accuracy}% · {score.correct}/{score.answered}
        </span>
        <span className="flex items-center gap-3">
          <span aria-label="questions per minute">{qpm} q/min</span>
          <span className="flex items-center gap-1">
            <Flame
              className={cn(
                "size-3.5",
                streak >= 3 ? "text-warning" : "text-muted-foreground/50"
              )}
            />
            {streak} · best {best}
          </span>
        </span>
      </div>

      {/* Question card */}
      <div className="grid gap-5 rounded-xl border bg-card p-6">
        <div className="grid gap-1.5 text-center">
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            name the {question.answerLabel}
          </span>
          <p className="text-balance text-2xl font-semibold tracking-tight">
            {question.promptValue}
          </p>
        </div>

        {question.mode === "choice" ? (
          <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option, i) => {
              const isAnswer = revealed && option === question.answer;
              const isWrongPick =
                revealed && option === answerValue && !isAnswer;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={answerValue === option}
                  disabled={revealed}
                  onClick={() => record(option)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                    !revealed && "hover:border-muted-foreground/40 hover:bg-accent",
                    isAnswer && "border-success bg-success/10",
                    isWrongPick && "border-danger bg-danger/10",
                    revealed && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded border font-mono text-[11px]",
                      "text-muted-foreground"
                    )}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1">{option}</span>
                  {isAnswer && <Check className="size-4 shrink-0 text-success" />}
                  {isWrongPick && <X className="size-4 shrink-0 text-danger" />}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!revealed && typed.trim()) record(typed);
            }}
            className="grid gap-2"
          >
            <input
              autoFocus
              value={typed}
              disabled={revealed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={`Type the ${question.answerLabel}…`}
              inputMode="text"
              autoComplete="off"
              className={cn(
                "w-full rounded-lg border bg-background px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-primary",
                revealed &&
                  (wasCorrect
                    ? "border-success bg-success/10"
                    : "border-danger bg-danger/10")
              )}
            />
          </form>
        )}

        {revealed && (
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm leading-relaxed",
              wasCorrect
                ? "border-success/40 bg-success/5"
                : "border-danger/40 bg-danger/5"
            )}
          >
            <span className="font-semibold">{question.answer}</span>
            {question.detail && (
              <span className="text-muted-foreground"> · {question.detail}</span>
            )}
          </div>
        )}

        <Button onClick={advance} disabled={!revealed} className="min-w-28">
          Next
        </Button>
      </div>
    </div>
  );
}
