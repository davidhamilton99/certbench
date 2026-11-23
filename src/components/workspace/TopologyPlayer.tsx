"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { SimField, SimFieldAnswer, TopoDevice, TopologyScenario } from "@/data/pbq/types";
import { gradeTopologyScenario } from "@/core/pbq/grade-topology";
import { devicesToFix } from "@/core/pbq/sim-play";
import type { PbqUpsell } from "@/components/workspace/pbq-upsell";
import type { PbqHostProps } from "@/components/workspace/pbq-host";
import { StagedLab, type LabStage } from "@/components/workspace/LabKit";
import { EvidenceConsole, Ticket } from "@/components/workspace/SimCaseFile";
import { TopologyDiagram, type DeviceMark } from "@/components/workspace/TopologyDiagram";

/**
 * A topology lab, played on its network map. Each device that needs fixing
 * is a stage, and each of its settings a move, marked the moment it's set.
 * Any device on the map opens its config, so the network can be read like
 * evidence. The score is the topology grader's, the same as it always was.
 *
 * Before, every setting sat in a dropdown form beside the map, and nothing
 * was graded until "Submit Configuration", which stayed greyed out until
 * every device was filled in.
 */
export function TopologyPlayer({
  scenario,
  onBack,
  upsell,
  ...host
}: {
  scenario: TopologyScenario;
  onBack: () => void;
  upsell?: PbqUpsell;
} & PbqHostProps) {
  const fixes = useMemo(() => devicesToFix(scenario), [scenario]);
  const stages = useMemo<LabStage[]>(
    () =>
      fixes.map((d) => ({
        id: d.id,
        title: d.label,
        // A topology's settings are the simulation's own field kinds.
        fields: d.fields as SimField[],
        explanation: d.explanation,
      })),
    [fixes]
  );

  const grade = useCallback(
    (answers: Record<string, SimFieldAnswer>) => {
      const { result, deviceResults } = gradeTopologyScenario(scenario, answers);
      return {
        result,
        stages: fixes.map((d) => {
          const r = deviceResults.find((x) => x.deviceId === d.id);
          return { correct: r?.correctFields ?? 0, total: r?.totalFields ?? 0 };
        }),
      };
    },
    [scenario, fixes]
  );

  return (
    <StagedLab
      scenarioId={scenario.id}
      title={scenario.title}
      subtitle={`${scenario.domain_number} ${scenario.domain_title}`}
      stages={stages}
      noun="Device"
      renderCase={({ stage, run, credit }) => (
        <NetworkCase key={run} scenario={scenario} fixes={fixes} active={stage} credit={credit} />
      )}
      grade={grade}
      explanation={scenario.explanation}
      upsell={upsell}
      onBack={onBack}
      // The result, the way out, word of the first move and the focus on arrival.
      {...host}
    />
  );
}

/**
 * The ticket, the map with each device's mark, and the configuration of the
 * device being fixed, or of any device chosen on the map until "Return to" it.
 */
function NetworkCase({
  scenario,
  fixes,
  active,
  credit,
}: {
  scenario: TopologyScenario;
  fixes: readonly TopoDevice[];
  active: number;
  credit: Readonly<Record<string, number>>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const current = fixes[Math.min(active, fixes.length - 1)];
  // Which device's config is up, and for which device being fixed: when the
  // lab moves on to the next device, its own config comes back up.
  const [view, setView] = useState<{ during: string; id: string | null }>({ during: current.id, id: null });
  const viewing = view.during === current.id ? view.id : null;
  const shown = scenario.devices.find((d) => d.id === (viewing ?? current.id)) ?? current;

  const marks = useMemo(() => {
    const toFix = new Set(fixes.map((d) => d.id));
    const out: Record<string, DeviceMark | undefined> = {};
    for (const d of scenario.devices) {
      if (!toFix.has(d.id)) {
        out[d.id] = d.preConfigured ? "ok" : undefined;
        continue;
      }
      const credits = d.fields.map((f) => credit[f.id]);
      if (credits.every((c) => c !== undefined)) {
        const share = credits.reduce<number>((sum, c) => sum + (c ?? 0), 0) / credits.length;
        out[d.id] = share >= 1 ? "right" : share > 0 ? "partly" : "wrong";
      } else {
        out[d.id] = d.id === current.id ? "active" : "fix";
      }
    }
    return out;
  }, [scenario.devices, fixes, credit, current.id]);

  function pick(id: string) {
    setView({ during: current.id, id: id === current.id ? null : id });
  }

  /**
   * Back to the device being fixed. The link that was pressed goes away with
   * the other device's configuration, so the focus moves to the button of the
   * device now shown, under the map, and does not fall back to the top of the page.
   */
  function showCurrent() {
    setView({ during: current.id, id: null });
    requestAnimationFrame(() => {
      box.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus({ preventScroll: true });
    });
  }

  return (
    <div ref={box} className="grid min-w-0 gap-3">
      <Ticket text={scenario.briefing} />
      <TopologyDiagram
        devices={scenario.devices}
        connections={scenario.connections}
        diagramTitle={scenario.diagramTitle}
        marks={marks}
        activeId={current.id}
        viewingId={viewing}
        onDeviceClick={pick}
      />
      {shown.currentConfig ? (
        <EvidenceConsole
          key={shown.id}
          evidence={[{ label: `${shown.label}: current configuration`, content: shown.currentConfig }]}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-small text-muted-foreground">
          {shown.label} has no configuration to show.
        </p>
      )}
      {viewing && (
        <button type="button" onClick={showCurrent} className="cb-link cb-tap w-fit text-small font-medium">
          Return to {current.label}
        </button>
      )}
    </div>
  );
}
