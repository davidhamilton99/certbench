"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CliTerminalProps {
  prompt: string;
  commands: string[];
  onChange: (commands: string[]) => void;
  label: string;
  /** Shown when user types "?" or "help". Falls back to generic hint. */
  helpText?: string;
}

/** Messages displayed in the terminal that aren't graded commands. */
interface TerminalLine {
  type: "command" | "output";
  text: string;
}

export function CliTerminal({
  prompt,
  commands,
  onChange,
  label,
  helpText,
}: CliTerminalProps) {
  const [currentInput, setCurrentInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  /** Output lines interleaved with command history (for help, errors, etc.) */
  const [outputLines, setOutputLines] = useState<TerminalLine[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build display lines from commands + outputs
  const displayLines: TerminalLine[] = [];
  let cmdIdx = 0;
  for (const line of outputLines) {
    displayLines.push(line);
    if (line.type === "command") cmdIdx++;
  }
  // Add any remaining commands not yet in outputLines
  while (cmdIdx < commands.length) {
    displayLines.push({ type: "command", text: commands[cmdIdx] });
    cmdIdx++;
  }

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commands, outputLines]);

  const handleSubmit = useCallback(() => {
    const trimmed = currentInput.trim();
    if (trimmed.length === 0) return;

    // Handle help/? — show help text without recording as a graded command
    if (trimmed === "?" || trimmed.toLowerCase() === "help") {
      const helpOutput = helpText || "Type IOS commands and press Enter. Use ? for available commands.";
      setOutputLines((prev) => [
        ...prev,
        { type: "command", text: trimmed },
        { type: "output", text: helpOutput },
      ]);
      setCurrentInput("");
      setHistoryIdx(-1);
      return;
    }

    // Normal command — record for grading
    setOutputLines((prev) => [...prev, { type: "command", text: trimmed }]);
    onChange([...commands, trimmed]);
    setCurrentInput("");
    setHistoryIdx(-1);
  }, [currentInput, commands, onChange, helpText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commands.length === 0) return;
        const nextIdx =
          historyIdx === -1
            ? commands.length - 1
            : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setCurrentInput(commands[nextIdx]);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIdx === -1) return;
        const nextIdx = historyIdx + 1;
        if (nextIdx >= commands.length) {
          setHistoryIdx(-1);
          setCurrentInput("");
        } else {
          setHistoryIdx(nextIdx);
          setCurrentInput(commands[nextIdx]);
        }
      }
    },
    [handleSubmit, commands, historyIdx]
  );

  /** Handle paste — split by newlines and submit each line as a command. */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text");
      if (!pasted.includes("\n")) return; // Single-line paste, let default handle it

      e.preventDefault();
      const lines = pasted
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) return;

      const newOutputLines: TerminalLine[] = [];
      for (const line of lines) {
        newOutputLines.push({ type: "command", text: line });
      }
      setOutputLines((prev) => [...prev, ...newOutputLines]);
      onChange([...commands, ...lines]);
      setCurrentInput("");
      setHistoryIdx(-1);
    },
    [commands, onChange]
  );

  const handleClear = useCallback(() => {
    onChange([]);
    setOutputLines([]);
    setCurrentInput("");
    setHistoryIdx(-1);
  }, [onChange]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-text-primary">
          {label}
        </label>
        {commands.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div
        className="bg-[#1a1a1f] rounded-lg border border-[#333] overflow-hidden cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Command history + input */}
        <div
          ref={scrollRef}
          className="p-3 max-h-[240px] overflow-y-auto font-mono text-[13px] leading-relaxed"
        >
          {/* Placeholder when empty */}
          {displayLines.length === 0 && currentInput === "" && (
            <div className="text-[#555] italic text-[12px] mb-1">
              Type a command and press Enter. Type ? for help.
            </div>
          )}

          {/* History lines */}
          {displayLines.map((line, i) =>
            line.type === "command" ? (
              <div key={i} className="flex gap-1">
                <span className="text-[#6b9fff] flex-shrink-0 select-none">
                  {prompt}
                </span>
                <span className="text-[#e0e0e0]">{line.text}</span>
              </div>
            ) : (
              <div key={i} className="text-[#aaa] pl-2 whitespace-pre-wrap">
                {line.text}
              </div>
            )
          )}

          {/* Active input line */}
          <div className="flex gap-1 items-center">
            <span className="text-[#6b9fff] flex-shrink-0 select-none">
              {prompt}
            </span>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(e) => {
                  setCurrentInput(e.target.value);
                  setHistoryIdx(-1);
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                aria-label={`CLI input for ${label}`}
                className="w-full bg-transparent text-[#e0e0e0] outline-none border-none text-[13px] font-mono p-0 caret-[#6b9fff]"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-3 py-1.5 border-t border-[#333] flex items-center justify-between">
          <span className="text-[11px] text-[#666] font-mono">
            {commands.length} command{commands.length !== 1 ? "s" : ""} entered
          </span>
          <span className="text-[11px] text-[#555] font-mono">
            Enter to submit | ? for help | Up/Down for history
          </span>
        </div>
      </div>
    </div>
  );
}
