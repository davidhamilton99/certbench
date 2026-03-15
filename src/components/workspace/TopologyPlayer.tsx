"use client";

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type {
  TopologyScenario,
  TopoFieldAnswer,
  PbqGradeResult,
  TopoDeviceGradeResult,
} from "@/data/pbq/types";
import { gradeTopologyScenario } from "@/lib/pbq/grade-topology";
import { TopologyDiagram } from "@/components/workspace/TopologyDiagram";
import { DeviceConfigPanel } from "@/components/workspace/DeviceConfigPanel";

/* ------------------------------------------------------------------ */
/*  Results View                                                       */
/* ------------------------------------------------------------------ */

function TopologyResults({
  scenario,
  result,
  deviceResults,
  onRetry,
  onBack,
}: {
  scenario: TopologyScenario;
  result: PbqGradeResult;
  deviceResults: TopoDeviceGradeResult[];
  onRetry: () => void;
  onBack: () => void;
}) {
  const scoreColor =
    result.score >= 75
      ? "text-success"
      : result.score >= 40
      ? "text-warning"
      : "text-danger";

  return (
    <div className="flex flex-col gap-4">
      {/* Overall score */}
      <Card padding="lg">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span
              className={`text-[40px] font-mono font-semibold tabular-nums leading-none ${scoreColor}`}
            >
              {result.score}%
            </span>
            <span className="text-[14px] text-text-muted">
              {result.correctItems}/{result.totalItems} correct
            </span>
          </div>
          <Badge
            variant={
              result.score >= 75
                ? "success"
                : result.score >= 40
                ? "warning"
                : "danger"
            }
          >
            {result.score >= 75
              ? "Passed"
              : result.score >= 40
              ? "Partial Credit"
              : "Needs Work"}
          </Badge>
        </div>
      </Card>

      {/* Per-device breakdown */}
      {deviceResults.map((dr) => {
        const perfect = dr.correctFields === dr.totalFields;
        const device = scenario.devices.find((d) => d.id === dr.deviceId);

        return (
          <Card
            key={dr.deviceId}
            padding="md"
            accent={
              perfect ? "success" : dr.correctFields > 0 ? "warning" : "danger"
            }
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-text-primary">
                  {dr.deviceLabel}
                </h3>
                {dr.preConfigured && (
                  <Badge variant="neutral">Pre-configured</Badge>
                )}
              </div>
              <span className="text-[13px] font-mono text-text-secondary tabular-nums">
                {dr.correctFields}/{dr.totalFields}
              </span>
            </div>
            {dr.feedback.length > 0 && (
              <div className="flex flex-col gap-1 mt-2">
                {dr.feedback.map((fb, j) => (
                  <p key={j} className="text-[12px] text-text-secondary">
                    {fb}
                  </p>
                ))}
              </div>
            )}
            {/* Per-device explanation */}
            {device?.explanation && (
              <p className="text-[12px] text-text-muted mt-2 italic">
                {device.explanation}
              </p>
            )}
          </Card>
        );
      })}

      {/* Overall explanation */}
      <Card padding="md">
        <h3 className="text-[14px] font-semibold text-text-primary mb-2">
          Explanation
        </h3>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          {scenario.explanation}
        </p>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="primary" onClick={onRetry}>
          Try Again
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Back to Scenarios
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main TopologyPlayer                                                */
/* ------------------------------------------------------------------ */

export function TopologyPlayer({
  scenario,
  onBack,
}: {
  scenario: TopologyScenario;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, TopoFieldAnswer>>({});
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [gradeResult, setGradeResult] = useState<{
    result: PbqGradeResult;
    deviceResults: TopoDeviceGradeResult[];
  } | null>(null);

  const setAnswer = useCallback((id: string, answer: TopoFieldAnswer) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }));
  }, []);

  /** Track which devices the user has interacted with. */
  const touchedDeviceIds = useMemo(() => {
    const touched = new Set<string>();
    for (const device of scenario.devices) {
      for (const field of device.fields) {
        if (answers[field.id] !== undefined) {
          touched.add(device.id);
          break;
        }
      }
    }
    return touched;
  }, [answers, scenario.devices]);

  /** Devices that require configuration (not pre-configured and have fields). */
  const configurableDevices = useMemo(
    () =>
      scenario.devices.filter(
        (d) => !d.preConfigured && d.fields.length > 0
      ),
    [scenario.devices]
  );

  /** Check if all required fields on non-pre-configured devices are filled. */
  const allRequiredFilled = useMemo(() => {
    for (const device of configurableDevices) {
      for (const field of device.fields) {
        const ans = answers[field.id];
        if (!ans) return false;
        if (ans.type === "dropdown" && ans.selectedIndex === -1) return false;
        if (ans.type === "text" && ans.value.trim() === "") return false;
        if (ans.type === "cli" && ans.commands.length === 0) return false;
      }
    }
    return true;
  }, [answers, configurableDevices]);

  const handleSubmit = useCallback(() => {
    const graded = gradeTopologyScenario(scenario, answers);
    setGradeResult(graded);
    setSelectedDeviceId(null);
  }, [scenario, answers]);

  const handleRetry = useCallback(() => {
    setAnswers({});
    setSelectedDeviceId(null);
    setGradeResult(null);
  }, []);

  const selectedDevice = selectedDeviceId
    ? scenario.devices.find((d) => d.id === selectedDeviceId) || null
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to scenarios"
          className="text-text-secondary hover:text-text-primary transition-colors"
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
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold text-text-primary">
              {scenario.title}
            </h2>
            <Badge variant="neutral">Topology Lab</Badge>
          </div>
          <p className="text-[13px] text-text-secondary">
            {scenario.domain_number} {scenario.domain_title}
          </p>
        </div>
      </div>

      {/* Results or interactive */}
      {gradeResult ? (
        <TopologyResults
          scenario={scenario}
          result={gradeResult.result}
          deviceResults={gradeResult.deviceResults}
          onRetry={handleRetry}
          onBack={onBack}
        />
      ) : (
        <>
          {/* Briefing */}
          <Card padding="md" accent="primary">
            <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Scenario
            </p>
            <p className="text-[14px] text-text-primary leading-relaxed">
              {scenario.briefing}
            </p>
          </Card>

          {/* Topology + Config Panel layout (desktop: side-by-side, mobile: overlay) */}
          <div className="hidden sm:flex gap-0 relative">
            {/* Diagram */}
            <div
              className={`transition-all duration-300 ${
                selectedDevice ? "w-[55%] flex-shrink-0" : "w-full"
              }`}
            >
              <TopologyDiagram
                devices={scenario.devices}
                connections={scenario.connections}
                diagramTitle={scenario.diagramTitle}
                selectedDeviceId={selectedDeviceId}
                touchedDeviceIds={touchedDeviceIds}
                onDeviceClick={(id) =>
                  setSelectedDeviceId(
                    selectedDeviceId === id ? null : id
                  )
                }
              />
            </div>

            {/* Config panel (slides in from right) */}
            {selectedDevice && (
              <div className="w-[45%] flex-shrink-0 max-h-[520px] overflow-hidden rounded-r-lg border border-l-0 border-border">
                <DeviceConfigPanel
                  device={selectedDevice}
                  answers={answers}
                  setAnswer={setAnswer}
                  onClose={() => setSelectedDeviceId(null)}
                />
              </div>
            )}
          </div>

          {/* Mobile: diagram always full-width */}
          <div className="sm:hidden">
            <TopologyDiagram
              devices={scenario.devices}
              connections={scenario.connections}
              diagramTitle={scenario.diagramTitle}
              selectedDeviceId={selectedDeviceId}
              touchedDeviceIds={touchedDeviceIds}
              onDeviceClick={(id) =>
                setSelectedDeviceId(
                  selectedDeviceId === id ? null : id
                )
              }
            />
          </div>

          {/* Mobile: full-width config panel overlay */}
          {selectedDevice && (
            <div className="sm:hidden fixed inset-0 z-50 bg-bg-surface overflow-y-auto">
              <DeviceConfigPanel
                device={selectedDevice}
                answers={answers}
                setAnswer={setAnswer}
                onClose={() => setSelectedDeviceId(null)}
              />
            </div>
          )}

          {/* Progress indicator */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text-muted">
              {touchedDeviceIds.size} of {configurableDevices.length} devices
              configured
            </span>
            <span className="text-[12px] text-text-muted font-mono">
              ~{scenario.estimatedMinutes} min
            </span>
          </div>

          {/* Submit */}
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!allRequiredFilled}
          >
            Submit Configuration
          </Button>
          {!allRequiredFilled && (
            <p className="text-[12px] text-text-muted text-center">
              Configure all devices that need changes before submitting.
              Not all devices need modification — identify and fix only what is
              broken.
            </p>
          )}
        </>
      )}
    </div>
  );
}
