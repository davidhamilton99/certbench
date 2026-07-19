"use client";

import { useState } from "react";
import { PORT_ENTRIES } from "@/lib/tools/port-quiz-data";
import { SubnettingDrillLazy } from "@/components/marketing/SubnettingDrillLazy";
import { PortQuiz } from "@/components/marketing/PortQuiz";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "subnetting", label: "Subnetting" },
  { id: "ports", label: "Port numbers" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/**
 * Workspace host for the drill engines. Same components as the public
 * /tools pages, minus the register upsell — the person is already here.
 */
export function DrillsTabs() {
  const [tab, setTab] = useState<TabId>("subnetting");

  return (
    <div className="grid gap-4">
      <div className="flex gap-1.5" role="tablist" aria-label="Drill">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-muted-foreground/40"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "subnetting" ? (
        <SubnettingDrillLazy showRegisterCta={false} />
      ) : (
        <PortQuiz entries={PORT_ENTRIES} showRegisterCta={false} />
      )}
    </div>
  );
}
