"use client";

import { useState, useMemo } from "react";
import type { ReferenceTable } from "@/data/reference/types";

export function ReferenceTableViewer({ tables }: { tables: ReferenceTable[] }) {
  const [activeTableId, setActiveTableId] = useState(tables[0]?.id || "");
  const [search, setSearch] = useState("");

  const activeTable = tables.find((t) => t.id === activeTableId) || tables[0];

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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
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
          className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                  : "bg-bg-surface border border-border text-text-secondary hover:bg-bg-page hover:text-text-primary"
              }
            `}
          >
            {table.title}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-[13px] text-text-muted">{activeTable.description}</p>

      {/* Table */}
      <div className="bg-bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-page">
                {activeTable.columnHeaders.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left font-semibold text-text-primary ${
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
                    className="px-4 py-8 text-center text-text-muted"
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
                    className="border-b border-border-light last:border-0 hover:bg-bg-page transition-colors"
                  >
                    {activeTable.columnHeaders.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-text-secondary ${
                          col.mono
                            ? "font-mono tabular-nums text-text-primary font-medium"
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
      <p className="text-[12px] text-text-muted">
        {filteredEntries.length} of {activeTable.entries.length} entries
        {search ? ` matching "${search}"` : ""}
      </p>
    </div>
  );
}
