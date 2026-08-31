"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import type { ReferenceTable } from "@/data/reference/types";
import { Button } from "@/components/ui/button";

export function ReferenceTableViewer({
  tables,
  certSlug,
  drillableTableIds,
}: {
  tables: ReferenceTable[];
  certSlug: string;
  drillableTableIds: string[];
}) {
  const [activeTableId, setActiveTableId] = useState(tables[0]?.id || "");
  const [search, setSearch] = useState("");

  const activeTable = tables.find((t) => t.id === activeTableId) || tables[0];
  const isDrillable = activeTable
    ? drillableTableIds.includes(activeTable.id)
    : false;

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
      {/* Search */}
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

      {/* Description + drill link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {activeTable.description}
        </p>
        {isDrillable && (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/recall?deck=${activeTable.id}&cert=${certSlug}`}>
              <Zap className="size-3.5" />
              Drill this
            </Link>
          </Button>
        )}
      </div>

      {/* Table */}
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

      {/* Count */}
      <p className="text-[12px] text-muted-foreground">
        {filteredEntries.length} of {activeTable.entries.length} entries
        {search ? ` matching "${search}"` : ""}
      </p>
    </div>
  );
}
