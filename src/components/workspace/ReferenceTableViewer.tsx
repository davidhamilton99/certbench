"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import type { ReferenceTable } from "@/data/reference/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * The reference tables for one exam: a row of tabs to choose a table, a field
 * to search it, and the table itself.
 *
 * The tabs are real tabs (one stop for the Tab key, the arrow keys move
 * between them). The search field has a label. The table scrolls sideways
 * inside its own frame on a narrow screen, and that frame can take the
 * keyboard, so it can be scrolled without a pointer. The count under the
 * table is a status line, so a screen reader hears how many entries match as
 * the search is typed.
 */
export function ReferenceTableViewer({
  tables,
  certSlug,
  drillableTableIds,
}: {
  tables: ReferenceTable[];
  certSlug: string;
  drillableTableIds: string[];
}) {
  const [activeTableId, setActiveTableId] = useState(tables[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const searchId = useId();

  const activeTable = tables.find((t) => t.id === activeTableId) ?? tables[0];
  const isDrillable = activeTable ? drillableTableIds.includes(activeTable.id) : false;
  const query = search.trim();

  const filteredEntries = useMemo(() => {
    if (!activeTable) return [];
    if (!query) return activeTable.entries;
    const needle = query.toLowerCase();
    return activeTable.entries.filter((entry) =>
      Object.values(entry.columns).join(" ").toLowerCase().includes(needle)
    );
  }, [activeTable, query]);

  if (!activeTable) return null;

  const total = activeTable.entries.length;

  return (
    <Tabs.Root
      value={activeTable.id}
      onValueChange={(id) => {
        setActiveTableId(id);
        setSearch("");
      }}
      className="grid gap-4"
    >
      <Tabs.List aria-label="Reference table" className="flex flex-wrap gap-1.5">
        {tables.map((table) => (
          <Tabs.Trigger
            key={table.id}
            value={table.id}
            className={cn(
              "rounded-md border border-input px-3.5 py-1.5 text-small font-medium transition-colors pointer-coarse:py-2.5",
              "hover:border-primary hover:bg-tint-hover",
              "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            )}
          >
            {table.title}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* The panel holds its own controls, so the panel itself is not a stop for the Tab key. */}
      <Tabs.Content value={activeTable.id} tabIndex={-1} className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="cb-measure text-small text-muted-foreground">{activeTable.description}</p>
          {isDrillable && (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href={`/recall?deck=${activeTable.id}&cert=${certSlug}`}>Practice this table in Recall</Link>
            </Button>
          )}
        </div>

        <div className="grid max-w-md gap-1.5">
          <Label htmlFor={searchId}>Search this table</Label>
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="glass overflow-hidden rounded-lg">
          <div
            // The frame scrolls sideways on a narrow screen: it takes the keyboard so that it can be scrolled.
            tabIndex={0}
            role="region"
            aria-label={`${activeTable.title}, table`}
            className="overflow-x-auto focus-visible:-outline-offset-2"
          >
            <table className="w-full text-small">
              <caption className="sr-only">{activeTable.title}</caption>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  {activeTable.columnHeaders.map((col) => (
                    <th key={col.key} scope="col" className="px-4 py-3 font-semibold">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={activeTable.columnHeaders.length} className="px-4 py-8 text-muted-foreground">
                      {query ? `No entries match "${query}".` : "This table has no entries."}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      {activeTable.columnHeaders.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-3 align-top",
                            col.mono ? "font-mono font-medium tabular-nums" : "text-muted-foreground"
                          )}
                        >
                          {entry.columns[col.key] || "None"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p role="status" className="text-note text-muted-foreground">
          {query
            ? `${filteredEntries.length} of ${total} ${total === 1 ? "entry" : "entries"} ${filteredEntries.length === 1 ? "matches" : "match"} "${query}".`
            : `This table has ${total} ${total === 1 ? "entry" : "entries"}.`}
        </p>
      </Tabs.Content>
    </Tabs.Root>
  );
}
