"use client";

import { useState, useMemo } from "react";
import { BookOpen, Zap } from "lucide-react";
import type { ReferenceTable } from "@/data/reference/types";
import { canDrillTable } from "@/lib/tools/reference-drill";
import { ReferenceDrill } from "@/components/workspace/ReferenceDrill";
import { cn } from "@/lib/utils";

export function ReferenceTableViewer({ tables }: { tables: ReferenceTable[] }) {
  const [activeTableId, setActiveTableId] = useState(tables[0]?.id || "");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"table" | "drill">("table");

  const activeTable = tables.find((t) => t.id === activeTableId) || tables[0];
  const drillable = activeTable ? canDrillTable(activeTable) : false;
  const showDrill = mode === "drill" && drillable;

  const filteredEntries = useMemo(() => {
    if (!activeTable) return [];
    if (!search.trim()) return activeTable.entries;

    const query = search.toLowerCase();
    return activeTable.entries.filter((entry) => {
      const values = Object.values(entry.columns).join(" ").toLowerCase();
      return values.includes(query);
    });
  }, [activeTable, search]);

  if (!activeTable) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Search (lookup mode only) */}
      {!showDrill && (
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search across all columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-card border border-border rounded-lg text-foreground placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => {
              setActiveTableId(table.id);
              setSearch("");
            }}
            className={`
              px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap
              transition-colors duration-150
              ${
                activeTableId === table.id
                  ? "bg-primary text-white"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }
            `}
          >
            {table.title}
          </button>
        ))}
      </div>

      {/* Description + mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {activeTable.description}
        </p>
        {drillable && (
          <div className="flex shrink-0 overflow-hidden rounded-lg border">
            {(
              [
                { id: "table", label: "Table", Icon: BookOpen },
                { id: "drill", label: "Drill", Icon: Zap },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium transition-colors",
                  mode === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showDrill && <ReferenceDrill key={activeTable.id} table={activeTable} />}

      {/* Table */}
      {!showDrill && (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {activeTable.columnHeaders.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left font-semibold text-foreground ${
                      col.mono ? "font-mono" : ""
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTable.columnHeaders.length}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {search
                      ? `No results for "${search}"`
                      : "No entries available."}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border-light last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    {activeTable.columnHeaders.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-muted-foreground ${
                          col.mono
                            ? "font-mono tabular-nums text-foreground font-medium"
                            : ""
                        }`}
                      >
                        {entry.columns[col.key] || "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Count (lookup mode only) */}
      {!showDrill && (
        <p className="text-[12px] text-muted-foreground">
          {filteredEntries.length} of {activeTable.entries.length} entries
          {search ? ` matching "${search}"` : ""}
        </p>
      )}
    </div>
  );
}