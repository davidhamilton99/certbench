"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  generateQuestion,
  grade,
  MODES,
  pickGauntletMode,
  type Difficulty,
  type DrillMode,
  type DrillQuestion,
} from "@/lib/tools/subnetting";
import { MIXED_MODE_NAME, modeName } from "@/lib/tools/subnet-mode-names";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** "gauntlet" is the id of the mixed mode in code; a member reads "Mixed". */
type PickerMode = DrillMode | "gauntlet";

const PICKER: { id: PickerMode; label: string }[] = [
  ...MODES.map((m) => ({ id: m.id as PickerMode, label: modeName(m.id) })),
  { id: "gauntlet", label: MIXED_MODE_NAME },
];

// The class lists below are joined as plain strings: each pair is one or the
// other, so there is nothing in them for the class merger to resolve.
const MODE = "rounded-md border px-3 py-1.5 text-small font-medium transition-colors pointer-coarse:min-h-11";
const MODE_CHOSEN = "border-primary bg-primary text-primary-foreground";
const MODE_IDLE = "border-input bg-card text-muted-foreground hover:border-primary hover:text-foreground";

// A row inside a clipped box: the focus ring is drawn inside it.
const RANGE = "px-2 py-1 font-mono text-note transition-colors focus-visible:-outline-offset-2 pointer-coarse:min-h-11 pointer-coarse:px-3";
const RANGE_CHOSEN = "bg-primary text-primary-foreground";
const RANGE_IDLE = "hover:bg-tint-hover hover:text-foreground";

function makeQuestion(mode: PickerMode, difficulty: Difficulty): DrillQuestion {
  const concrete = mode === "gauntlet" ? pickGauntletMode() : mode;
  return generateQuestion(concrete, difficulty);
}

/**
 * The workspace's quick subnetting drill: one question after another with no
 * rounds and no account to make. The free tool page plays rounds on the study
 * path's question card instead (see SubnettingPractice). It is rendered in the
 * browser only (see SubnettingDrillLazy), because its first question is random.
 *
 * It keeps a plain count of correct answers and the average time for each.
 * A correct answer moves straight to the next question, and says "Correct."
 * to a screen reader as it does. An incorrect answer shows the correct answer
 * with the worked steps and waits for "Continue", which takes the focus.
 *
 * Keyboard. The Y and N keys answer a yes or no question only while the
 * keyboard's focus is inside the drill, never from elsewhere on the page.
 * Nothing takes the focus as the page loads; each question after the first
 * does, because it follows something the person did here.
 */
export function SubnettingDrill() {
  return <SubnettingRound initialMode="network-id" />;
}

function SubnettingRound({ initialMode }: { initialMode: PickerMode }) {
  const [mode, setMode] = useState<PickerMode>(initialMode);
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  // `n` counts the questions dealt: a new one takes the focus, the first does not.
  const [dealt, setDealt] = useState<{ question: DrillQuestion; n: number }>(() => ({
    question: makeQuestion(initialMode, "standard"),
    n: 0,
  }));
  const [value, setValue] = useState("");
  const [missed, setMissed] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [totalMs, setTotalMs] = useState(0);
  // Said to a screen reader after a correct answer, which is otherwise only a new question.
  const [said, setSaid] = useState("");
  const startedAt = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const { question } = dealt;

  // The first question's clock starts once it is on screen. (Date.now() is not
  // pure, so it cannot be read while rendering.)
  useEffect(() => {
    if (startedAt.current === 0) startedAt.current = Date.now();
  }, []);

  // A question that follows an answer or a new setting takes the focus: the
  // field where its answer is typed, or the question itself where the answer
  // is yes or no, so that it is read and the Y and N keys act.
  useEffect(() => {
    if (dealt.n === 0) return;
    (inputRef.current ?? promptRef.current)?.focus();
  }, [dealt.n]);

  // After an incorrect answer the worked steps are shown, and Continue takes the focus.
  useEffect(() => {
    if (missed) nextRef.current?.focus();
  }, [missed]);

  const fresh = useCallback((m: PickerMode, d: Difficulty) => {
    setDealt((prev) => ({ question: makeQuestion(m, d), n: prev.n + 1 }));
    setValue("");
    setMissed(false);
    startedAt.current = Date.now();
  }, []);

  const proceed = useCallback(() => {
    setSaid("");
    fresh(mode, difficulty);
  }, [fresh, mode, difficulty]);

  const settle = useCallback(
    (correct: boolean) => {
      setTotalMs((t) => t + (Date.now() - startedAt.current));
      setScore((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        answered: s.answered + 1,
      }));
      if (correct) {
        // The count is part of what is said, so that the words differ from one
        // correct answer to the next and are announced each time.
        setSaid(`Correct. ${score.correct + 1} of ${score.answered + 1} correct.`);
        fresh(mode, difficulty);
      } else {
        setSaid("");
        setMissed(true);
      }
    },
    [fresh, mode, difficulty, score]
  );

  const submit = useCallback(
    (raw: string) => {
      if (missed) return;
      settle(grade(question, raw));
    },
    [missed, question, settle]
  );

  /** Y and N answer a yes or no question, and only from inside the drill. */
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (question.answerKind !== "yes-no" || missed) return;
    const key = e.key.toLowerCase();
    if (key === "y") submit("yes");
    if (key === "n") submit("no");
  }

  function switchMode(m: PickerMode) {
    setMode(m);
    setScore({ correct: 0, answered: 0 });
    setTotalMs(0);
    setSaid("");
    fresh(m, difficulty);
  }

  function switchDifficulty(d: Difficulty) {
    setDifficulty(d);
    setSaid("");
    fresh(mode, d);
  }

  const avgSeconds = score.answered >= 3 ? (totalMs / score.answered / 1000).toFixed(1) : null;
  const modeLabel = modeName(question.mode);
  const rightAnswer = question.answerKind === "cidr" ? `/${question.answer}` : question.answer;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Drill mode">
        {PICKER.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => switchMode(m.id)}
            className={`${MODE} ${mode === m.id ? MODE_CHOSEN : MODE_IDLE}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div onKeyDown={onKeyDown} className="grid gap-4 rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-note text-muted-foreground">
          <span>
            {score.correct} of {score.answered} correct.
            {avgSeconds && <> Your average is {avgSeconds} seconds per answer.</>}
          </span>
          <span className="flex items-center gap-2">
            <span id="drill-prefixes">Prefixes</span>
            <span
              role="group"
              aria-labelledby="drill-prefixes"
              className="flex overflow-hidden rounded-md border border-input"
            >
              {(["standard", "any-prefix"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={difficulty === d}
                  onClick={() => switchDifficulty(d)}
                  className={`${RANGE} ${difficulty === d ? RANGE_CHOSEN : RANGE_IDLE}`}
                >
                  {d === "standard" ? "/24–/30" : "/8–/30"}
                </button>
              ))}
            </span>
          </span>
        </div>

        <div className="grid gap-1">
          {/* In the mixed mode the skill changes with every question, so it is named. */}
          {mode === "gauntlet" && <span className="cb-label text-muted-foreground">{modeLabel}</span>}
          {/* Takes the focus so that it is read; it is not a control. */}
          <p ref={promptRef} tabIndex={-1} className="grid gap-1">
            <span className="text-small text-muted-foreground">{question.prompt}</span>
            <span className="font-mono text-2xl font-semibold">{question.promptValue}</span>
          </p>
        </div>

        {question.answerKind === "yes-no" ? (
          <div className="grid gap-2">
            <div className="flex gap-2">
              {(["yes", "no"] as const).map((v) => {
                const isAnswer = missed && question.answer === v;
                return (
                  <Button
                    key={v}
                    variant="outline"
                    disabled={missed}
                    onClick={() => submit(v)}
                    className={isAnswer ? "min-w-24 border-success text-success" : "min-w-24"}
                  >
                    {v === "yes" ? "Yes" : "No"}
                  </Button>
                );
              })}
            </div>
            {!missed && (
              <p className="text-note text-muted-foreground pointer-coarse:hidden">
                You can answer with the keys Y and N while the drill has the focus.
              </p>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!missed) submit(value);
            }}
            className="grid gap-2"
          >
            <label htmlFor="drill-answer" className="cb-label text-muted-foreground">
              Your answer
            </label>
            {/* The form the answer takes, in view while typing (never the answer itself). */}
            <p id="drill-example" className="-mt-1 text-note text-muted-foreground">
              For example, <span className="font-mono">{question.placeholder}</span>.
            </p>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                id="drill-answer"
                aria-describedby="drill-example"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={missed}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                inputMode={question.answerKind === "count" || question.answerKind === "cidr" ? "numeric" : "decimal"}
                className="font-mono"
              />
              {!missed && (
                <Button type="submit" disabled={!value.trim()}>
                  Check answer
                </Button>
              )}
            </div>
          </form>
        )}

        {/* The worked solution, after an incorrect answer. */}
        {missed && (
          <div className="grid gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
              <p id="drill-verdict" className="min-w-0 flex-1 basis-60 text-small">
                <span className="font-semibold text-destructive">
                  Incorrect. The correct answer is <span className="font-mono">{rightAnswer}</span>.
                </span>
              </p>
              <Button ref={nextRef} onClick={proceed} aria-describedby="drill-verdict">
                Continue
              </Button>
            </div>
            {/* The worked steps are sentences, so they are set as text. */}
            <div className="grid gap-1.5 text-small leading-relaxed text-muted-foreground">
              {question.solution.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {!missed && (
          <p className="text-note text-muted-foreground">A correct answer moves straight to the next question.</p>
        )}

        {/* Always in the page, so that the word is announced when it appears. */}
        <p role="status" className="sr-only">
          {said}
        </p>
      </div>
    </div>
  );
}
