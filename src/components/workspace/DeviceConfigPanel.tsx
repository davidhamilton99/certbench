"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type {
  TopoDevice,
  TopoField,
  TopoFieldAnswer,
  TopoCLIFieldAnswer,
} from "@/data/pbq/types";
import { CliTerminal } from "@/components/workspace/CliTerminal";
import {
  DropdownFieldRenderer,
  TextInputFieldRenderer,
  SelectManyFieldRenderer,
} from "@/components/workspace/PbqFieldRenderers";

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
        <DropdownFieldRenderer
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
        <TextInputFieldRenderer
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
        <SelectManyFieldRenderer
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
          helpText={field.hint}
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
          <Card padding="sm" className="bg-bg-page border-l-2 border-l-primary/20">
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
