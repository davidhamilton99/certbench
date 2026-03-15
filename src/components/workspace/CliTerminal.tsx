"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CliTerminalProps {
  prompt: string;
  commands: string[];
  onChange: (commands: string[]) => void;
  label: string;
}

export function CliTerminal({
  prompt,
  commands,
  onChange,
  label,
}: CliTerminalProps) {
  const [currentInput, setCurrentInput] = useState("");
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when commands change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commands]);

  const handleSubmit = useCallback(() => {
    const trimmed = currentInput.trim();
    if (trimmed.length === 0) return;
    onChange([...commands, trimmed]);
    setCurrentInput("");
    setHistoryIdx(-1);
  }, [currentInput, commands, onChange]);

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

  const handleClear = useCallback(() => {
    onChange([]);
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
          {/* History lines */}
          {commands.map((cmd, i) => (
            <div key={i} className="flex gap-1">
              <span className="text-[#6b9fff] flex-shrink-0 select-none">
                {prompt}
              </span>
              <span className="text-[#e0e0e0]">{cmd}</span>
            </div>
          ))}

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
            Enter to submit | Up/Down for history
          </span>
        </div>
      </div>
    </div>
  );
}
