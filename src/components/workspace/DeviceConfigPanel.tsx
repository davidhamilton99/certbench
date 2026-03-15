"use client";

import { useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type {
  TopoDevice,
  TopoField,
  TopoFieldAnswer,
  SimFieldAnswer,
  TopoCLIFieldAnswer,
} from "@/data/pbq/types";
import { CliTerminal } from "@/components/workspace/CliTerminal";

/* ------------------------------------------------------------------ */
/*  Field Renderers (reused patterns from SimulationPlayer)            */
/* ------------------------------------------------------------------ */

function DropdownField({
  field,
  value,
  onChange,
}: {
  field: { id: string; label: string; options: string[] };
  value: number;
  onChange: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-text-primary">
        {field.label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full bg-bg-page border border-border rounded-md px-3 py-2 text-[14px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      >
        <option value={-1}>— Select —</option>
        {field.options.map((opt, i) => (
          <option key={i} value={i}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextInputField({
  field,
  value,
  onChange,
}: {
  field: { id: string; label: string; placeholder?: string };
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-text-primary">
        {field.label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || "Type your answer..."}
        className="w-full px-3 py-2 text-[14px] text-text-primary bg-bg-surface border border-border rounded-md placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </div>
  );
}

function SelectManyField({
  field,
  selectedIndices,
  onChange,
}: {
  field: { id: string; label: string; options: string[] };
  selectedIndices: number[];
  onChange: (indices: number[]) => void;
}) {
  const toggle = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      onChange(selectedIndices.filter((i) => i !== idx));
    } else {
      onChange([...selectedIndices, idx]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium text-text-primary">
        {field.label}
      </label>
      <div className="flex flex-col gap-1.5">
        {field.options.map((opt, i) => {
          const isSelected = selectedIndices.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`
                w-full text-left px-3 py-2.5 rounded-md text-[13px]
                border transition-colors duration-150
                ${
                  isSelected
                    ? "bg-blue-50 border-primary/40 text-primary font-medium"
                    : "bg-bg-page border-border text-text-secondary hover:border-primary/30 hover:text-text-primary"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`
                    w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                    ${isSelected ? "bg-primary border-primary" : "border-border"}
                  `}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </span>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field Dispatcher                                                   */
/* ------------------------------------------------------------------ */

function FieldRenderer({
  field,
  answers,
  setAnswer,
}: {
  field: TopoField;
  answers: Record<string, TopoFieldAnswer>;
  setAnswer: (id: string, answer: TopoFieldAnswer) => void;
}) {
  switch (field.type) {
    case "dropdown": {
      const ans = answers[field.id];
      const value = ans?.type === "dropdown" ? ans.selectedIndex : -1;
      return (
        <DropdownField
          field={field}
          value={value}
          onChange={(idx) =>
            setAnswer(field.id, { type: "dropdown", selectedIndex: idx })
          }
        />
      );
    }

    case "text": {
      const ans = answers[field.id];
      const value = ans?.type === "text" ? ans.value : "";
      return (
        <TextInputField
          field={field}
          value={value}
          onChange={(val) =>
            setAnswer(field.id, { type: "text", value: val })
          }
        />
      );
    }

    case "select-many": {
      const ans = answers[field.id];
      const selected = ans?.type === "select-many" ? ans.selectedIndices : [];
      return (
        <SelectManyField
          field={field}
          selectedIndices={selected}
          onChange={(indices) =>
            setAnswer(field.id, {
              type: "select-many",
              selectedIndices: indices,
            })
          }
        />
      );
    }

    case "cli": {
      const ans = answers[field.id];
      const commands =
        ans?.type === "cli" ? (ans as TopoCLIFieldAnswer).commands : [];
      return (
        <CliTerminal
          label={field.label}
          prompt={field.prompt}
          commands={commands}
          onChange={(cmds) =>
            setAnswer(field.id, { type: "cli", commands: cmds })
          }
        />
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main DeviceConfigPanel                                             */
/* ------------------------------------------------------------------ */

interface DeviceConfigPanelProps {
  device: TopoDevice;
  answers: Record<string, TopoFieldAnswer>;
  setAnswer: (id: string, answer: TopoFieldAnswer) => void;
  onClose: () => void;
}

function deviceTypeLabel(t: string): string {
  const map: Record<string, string> = {
    router: "Router",
    switch: "Switch",
    firewall: "Firewall",
    server: "Server",
    pc: "Workstation",
    "access-point": "Access Point",
    cloud: "Cloud",
  };
  return map[t] || t;
}

export function DeviceConfigPanel({
  device,
  answers,
  setAnswer,
  onClose,
}: DeviceConfigPanelProps) {
  return (
    <div className="bg-bg-surface border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-text-primary">
            {device.label}
          </h3>
          <Badge variant="neutral">{deviceTypeLabel(device.type)}</Badge>
          {device.preConfigured && (
            <Badge variant="success">Pre-configured</Badge>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close panel"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Current config (read-only) */}
        {device.currentConfig && (
          <Card padding="sm" className="bg-gray-50">
            <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Current Configuration
            </p>
            <pre className="text-[12px] font-mono text-text-primary leading-relaxed overflow-x-auto whitespace-pre">
              {device.currentConfig}
            </pre>
          </Card>
        )}

        {/* Pre-configured notice */}
        {device.preConfigured && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2.5">
            <svg
              className="w-4 h-4 text-success flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-[12px] text-text-secondary">
              This device appears to be correctly configured. Review the
              current configuration below. Modifying a correctly-configured
              device will count against your score.
            </p>
          </div>
        )}

        {/* Fields */}
        {device.fields.length === 0 ? (
          !device.currentConfig && (
            <div className="text-center py-6">
              <p className="text-[14px] text-text-muted">
                No configuration available for this device.
              </p>
            </div>
          )
        ) : (
          device.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              answers={answers}
              setAnswer={setAnswer}
            />
          ))
        )}
      </div>
    </div>
  );
}
