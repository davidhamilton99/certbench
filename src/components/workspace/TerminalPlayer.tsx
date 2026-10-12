"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Check, X, Terminal as TerminalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PbqUpsellCard,
  type PbqUpsell,
} from "@/components/workspace/pbq-upsell";
import type {
  TerminalScenario,
  TerminalLine,
  TerminalGradeResult,
} from "@/data/pbq/types";
import { runCommand, completeInput } from "@/core/pbq/terminal-engine";
import { gradeTerminal } from "@/core/pbq/grade-terminal";

/* The terminal is its own committed dark surface, independent of the app
   theme — a terminal is dark. Tones map to a fixed palette. */
const TONE: Record<NonNullable<TerminalLine["tone"]> | "default", string> = {
  default: "text-[#cdd7e3]",
  muted: "text-[#6d7d90]",
  dim: "text-[#48566a]",
  green: "text-[#4ec9a5]",
  amber: "text-[#e3b341]",
  red: "text-[#ff6b6b]",
  cyan: "text-[#5bb8c9]",
};

type Row = { echo: string; cwd: string } | { line: TerminalLine };

function shortCwd(scenario: TerminalScenario, cwd: string): string {
  const home = "/home/" + scenario.user;
  if (cwd === home) return "~";
  if (cwd.startsWith(home + "/")) return "~" + cwd.slice(home.length);
  return cwd;
}

function LineView({ line }: { line: TerminalLine }) {
  return (
    <div className="whitespace-pre-wrap break-words">
      {line.prefix && <span className="text-[#48566a]">{line.prefix}</span>}
      <span className={TONE[line.tone ?? "default"]}>{line.text}</span>
    </div>
  );
}

export function TerminalPlayer({
  scenario,
  onBack,
  upsell,
}: {
  scenario: TerminalScenario;
  onBack: () => void;
  upsell?: PbqUpsell;
}) {
  const bootRows: Row[] = [
    {
      line: {
        text: `${scenario.host} — Debian GNU/Linux — last login from 10.0.2.2`,
        tone: "muted",
      },
    },
    {
      line: {
        text: "read-only analyst session · type help for commands, or cat readme.txt to start",
        tone: "dim",
      },
    },
    { line: { text: "" } },
  ];

  const [rows, setRows] = useState<Row[]>(bootRows);
  const [cwd, setCwd] = useState(scenario.cwd);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TerminalGradeResult | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [rows]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const submit = useCallback(
    (raw: string) => {
      const res = runCommand(scenario, cwd, raw);
      setRows((prev) => {
        const echo: Row = { echo: raw, cwd };
        if (res.clear) return [];
        return [...prev, echo, ...res.lines.map((line) => ({ line }))];
      });
      setCwd(res.cwd);
    },
    [scenario, cwd]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const v = input;
      setInput("");
      if (v.trim()) {
        setHistory((h) => [...h, v]);
        setHIdx(history.length + 1);
      }
      submit(v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length && hIdx > 0) {
        const i = hIdx - 1;
        setHIdx(i);
        setInput(history[i]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx < history.length - 1) {
        const i = hIdx + 1;
        setHIdx(i);
        setInput(history[i]);
      } else {
        setHIdx(history.length);
        setInput("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const completed = completeInput(scenario, cwd, input);
      if (completed !== null) setInput(completed);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setRows([]);
    }
  };

  const check = () => setResult(gradeTerminal(scenario, { values }));

  const reset = () => {
    setRows(bootRows);
    setCwd(scenario.cwd);
    setInput("");
    setHistory([]);
    setHIdx(0);
    setValues({});
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const solved = result?.correct === scenario.findings.length;
  const findingState = (id: string) =>
    result?.findings.find((f) => f.id === id);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to scenarios"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-semibold text-foreground">
            {scenario.title}
          </h2>
          <p className="text-[13px] text-muted-foreground">
            {scenario.domain_number} {scenario.domain_title} · ~
            {scenario.estimatedMinutes} min
          </p>
        </div>
      </div>

      {/* Briefing */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-4">
        <TerminalIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-[14px] leading-relaxed text-foreground">
          {scenario.briefing}
        </p>
      </div>

      {/* Terminal */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-[#1d2733] bg-[#0a0c10] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-2 border-b border-[#161e28] bg-[#121922] px-3.5 py-2.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-[11px] text-[#6d7d90]">
            {scenario.user}@{scenario.host}
          </span>
        </div>
        <div
          ref={scrollRef}
          onMouseDown={(e) => {
            if (window.getSelection()?.toString()) return;
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
          className="h-[46vh] min-h-[300px] max-h-[520px] cursor-text overflow-auto px-4 py-3 font-mono text-[13px] leading-[1.6]"
        >
          {rows.map((row, i) =>
            "echo" in row ? (
              <div key={i} className="whitespace-pre-wrap break-words">
                <span className="text-[#4ec9a5]">
                  {scenario.user}@{scenario.host}
                </span>
                <span className="text-[#6d7d90]">:</span>
                <span className="text-[#5bb8c9]">{shortCwd(scenario, row.cwd)}</span>
                <span className="text-[#4ec9a5]">$ </span>
                <span className="text-[#cdd7e3]">{row.echo}</span>
              </div>
            ) : (
              <LineView key={i} line={row.line} />
            )
          )}
          {/* Live input line */}
          <div className="flex whitespace-pre-wrap break-words">
            <span className="shrink-0 text-[#4ec9a5]">
              {scenario.user}@{scenario.host}
            </span>
            <span className="shrink-0 text-[#6d7d90]">:</span>
            <span className="shrink-0 text-[#5bb8c9]">{shortCwd(scenario, cwd)}</span>
            <span className="shrink-0 text-[#4ec9a5]">$&nbsp;</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Terminal command input"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[13px] text-[#cdd7e3] caret-[#4ec9a5] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Findings */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">
            Report your findings
          </h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Fill these in from what the shell showed you. Check as often as you
            like — the box stays open.
          </p>
        </div>

        {scenario.findings.map((f, i) => {
          const state = findingState(f.id);
          return (
            <div key={f.id} className="grid gap-1.5">
              <label
                htmlFor={`tf-${f.id}`}
                className="text-[13px] font-medium text-foreground"
              >
                {i + 1} · {f.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`tf-${f.id}`}
                  value={values[f.id] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.id]: e.target.value }))
                  }
                  placeholder={f.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
                />
                {state && (
                  <span
                    className={
                      "flex size-6 shrink-0 items-center justify-center " +
                      (state.correct ? "text-success" : "text-danger")
                    }
                    aria-label={state.correct ? "Correct" : "Not yet"}
                  >
                    {state.correct ? (
                      <Check className="size-4" />
                    ) : (
                      <X className="size-4" />
                    )}
                  </span>
                )}
              </div>
              {state?.correct && (
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {f.explanation}
                </p>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button onClick={check}>Check findings</Button>
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
          {result && !solved && (
            <span className="text-[13px] font-medium text-warning">
              {result.correct} of {result.total} — keep digging.
            </span>
          )}
        </div>
      </div>

      {/* Solved: kill chain + convert-at-the-win */}
      {solved && (
        <>
          <div className="rounded-xl border border-success/40 bg-success/5 p-5">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-success" />
              <h3 className="text-[15px] font-semibold text-foreground">
                Solved — you traced the whole intrusion.
              </h3>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {scenario.explanation}
            </p>
          </div>
          {upsell && <PbqUpsellCard upsell={upsell} />}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={reset}>
              Run it again
            </Button>
            <Button variant="ghost" onClick={onBack}>
              Back to scenarios
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
