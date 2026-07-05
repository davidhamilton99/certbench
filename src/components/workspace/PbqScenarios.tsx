"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import type { PbqScenario, SimulationScenario, TopologyScenario } from "@/data/pbq/types";
import { PbqPlayer } from "@/components/workspace/PbqPlayer";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

function drillTypeLabel(t: string): string {
  const map: Record<string, string> = {
    ordering: "Ordering",
    matching: "Matching",
    categorization: "Categorization",
  };
  return map[t] || t;
}

function drillTypeVariant(t: string): "neutral" | "warning" | "success" {
  const map: Record<string, "neutral" | "warning" | "success"> = {
    ordering: "neutral",
    matching: "warning",
    categorization: "success",
  };
  return map[t] || "neutral";
}

/* ------------------------------------------------------------------ */
/*  Scenario List (grouped by domain)                                  */
/* ------------------------------------------------------------------ */

function ScenarioList({
  scenarios,
  onSelect,
  onLocked,
  lockedIds,
  isSimulation,
}: {
  scenarios: PbqScenario[];
  onSelect: (s: PbqScenario) => void;
  onLocked: () => void;
  lockedIds: ReadonlySet<string>;
  isSimulation: boolean;
}) {
  const domainGroups = useMemo(() => {
    const groups = new Map<string, PbqScenario[]>();
    for (const s of scenarios) {
      const key = `${s.domain_number} ${s.domain_title}`;
      const group = groups.get(key) || [];
      group.push(s);
      groups.set(key, group);
    }
    return groups;
  }, [scenarios]);

  if (scenarios.length === 0) {
    return (
      <Panel padding="lg">
        <div className="flex flex-col items-center gap-3 py-6">
          <svg
            className="w-10 h-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          <p className="text-[15px] text-muted-foreground text-center max-w-md">
            {isSimulation
              ? "No exam simulations available for this certification yet."
              : "No concept drills available for this certification yet."}
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {[...domainGroups.entries()].map(([domainLabel, group]) => (
        <div key={domainLabel}>
          <h2 className="text-[14px] font-semibold text-foreground mb-2">
            {domainLabel}
          </h2>
          <div className="flex flex-col gap-2">
            {group.map((scenario) => {
              const locked = lockedIds.has(scenario.id);
              return (
              <button
                key={scenario.id}
                onClick={() => (locked ? onLocked() : onSelect(scenario))}
                className={`w-full text-left bg-card border border-border rounded-lg p-4 transition-colors duration-150 ${
                  locked ? "opacity-70 hover:border-border" : "hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 text-[14px] font-medium text-foreground">
                      {locked && <Lock className="size-3.5 text-muted-foreground" />}
                      {scenario.title}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {scenario.type === "simulation"
                        ? truncate((scenario as SimulationScenario).briefing, 120)
                        : scenario.type === "topology"
                        ? truncate((scenario as TopologyScenario).briefing, 120)
                        : "description" in scenario
                        ? (scenario as { description: string }).description
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(scenario.type === "simulation" || scenario.type === "topology") && (
                      <span className="text-[12px] text-muted-foreground font-mono">
                        ~{scenario.type === "simulation"
                          ? (scenario as SimulationScenario).estimatedMinutes
                          : (scenario as TopologyScenario).estimatedMinutes} min
                      </span>
                    )}
                    {locked ? (
                      <Badge variant="neutral">Pro</Badge>
                    ) : (
                      <Badge
                        variant={
                          scenario.type === "simulation" || scenario.type === "topology"
                            ? "neutral"
                            : drillTypeVariant(scenario.type)
                        }
                      >
                        {scenario.type === "simulation"
                          ? "Simulation"
                          : scenario.type === "topology"
                          ? "Topology Lab"
                          : drillTypeLabel(scenario.type)}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function PbqScenarios({
  scenarios,
  isPro = true,
}: {
  scenarios: PbqScenario[];
  /** Free users get the first simulation + first drill; the rest lock. */
  isPro?: boolean;
}) {
  const router = useRouter();
  const [activeScenario, setActiveScenario] = useState<PbqScenario | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"drills" | "simulations">(
    "simulations"
  );

  const drills = useMemo(
    () => scenarios.filter((s) => s.type !== "simulation" && s.type !== "topology"),
    [scenarios]
  );
  const simulations = useMemo(
    () => scenarios.filter((s) => s.type === "simulation" || s.type === "topology"),
    [scenarios]
  );

  const lockedIds = useMemo(() => {
    if (isPro) return new Set<string>();
    return new Set(
      [...simulations.slice(1), ...drills.slice(1)].map((s) => s.id)
    );
  }, [isPro, simulations, drills]);

  // Default to drills tab if no simulations exist
  const effectiveTab =
    activeTab === "simulations" && simulations.length === 0 ? "drills" : activeTab;

  if (scenarios.length === 0) {
    return (
      <Panel padding="lg">
        <div className="flex flex-col items-center gap-3 py-6">
          <svg
            className="w-10 h-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          <p className="text-[15px] text-muted-foreground text-center max-w-md">
            No hands-on practice scenarios available for this certification yet.
          </p>
        </div>
      </Panel>
    );
  }

  /* Active scenario — show the player */
  if (activeScenario) {
    return (
      <PbqPlayer
        scenario={activeScenario}
        onBack={() => setActiveScenario(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("simulations")}
          className={`
            relative px-4 py-2.5 text-[14px] font-medium
            transition-colors duration-150
            ${
              effectiveTab === "simulations"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          Exam Simulations ({simulations.length})
          {effectiveTab === "simulations" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("drills")}
          className={`
            relative px-4 py-2.5 text-[14px] font-medium
            transition-colors duration-150
            ${
              effectiveTab === "drills"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }
          `}
        >
          Concept Drills ({drills.length})
          {effectiveTab === "drills" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
          )}
        </button>
      </div>

      {/* Scenario list */}
      <ScenarioList
        scenarios={effectiveTab === "simulations" ? simulations : drills}
        onSelect={setActiveScenario}
        onLocked={() => router.push("/upgrade?reason=pbq")}
        lockedIds={lockedIds}
        isSimulation={effectiveTab === "simulations"}
      />
    </div>
  );
}