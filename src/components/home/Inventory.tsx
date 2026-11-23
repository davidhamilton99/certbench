import type { ReactNode } from "react";
import type { InventoryRow } from "@/core/path/inventory-types";
import { IntentLink } from "@/components/marketing/IntentLink";
import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("en-US");

/** The columns, named once: the table's head from sm up, and the label in each cell on a phone. */
const COLUMN = {
  exam: "Exam",
  questions: "Practice questions",
  coverage: "Coverage",
  labs: "Hands-on labs",
  practiceExam: "Free practice exam",
  path: "Study path",
} as const;

/**
 * A cell's own label, shown where the table's head is not: on a phone. The
 * space after it is never drawn; it keeps the label and the value apart for
 * anything that reads the page as text ("Practice questions 1,008").
 */
function Label({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="text-note text-muted-foreground sm:hidden">{children}</span>{" "}
    </>
  );
}

/** A cell that stands as a labelled figure on a phone: the label above, the value on the block's last line. */
const FIGURE = "max-sm:flex max-sm:flex-col max-sm:justify-between max-sm:gap-0.5";

/**
 * What CertBench holds for each exam, counted from the bank itself: a plain
 * table, because these are the numbers people compare study tools by.
 *
 * It is one table at every width, so each figure is in the page once. From sm
 * up it is drawn as a table. On a phone the same rows are set as a block for
 * each exam: the head is put away, and every cell carries its own label. The
 * three figures share a line there, whatever the length of their labels.
 *
 * Every part states its role. Some browsers stop treating a table as a table
 * once CSS draws it as blocks, and a screen reader would then lose the rows
 * and the row headers on a phone; a stated role is kept whatever the drawing.
 *
 * The links fetch their pages only when a visitor shows that they mean to open
 * one (IntentLink): ten pages, five of them whole practice exams, are too much
 * to download because a table scrolled into view.
 */
export function Inventory({ rows }: { rows: InventoryRow[] }) {
  const counted = rows.some((r) => r.questions !== null);
  return (
    <div className="sm:overflow-hidden sm:rounded-lg sm:border sm:border-border">
      <table role="table" className="w-full border-collapse text-left text-small max-sm:block">
        <caption className="sr-only">What CertBench includes for each exam</caption>
        <thead role="rowgroup" className="max-sm:hidden">
          <tr role="row" className="border-b border-foreground/80 bg-muted text-note text-muted-foreground">
            <th role="columnheader" scope="col" className="px-4 py-2.5 font-medium">
              {COLUMN.exam}
            </th>
            {counted && (
              <th role="columnheader" scope="col" className="px-4 py-2.5 text-right font-medium">
                {COLUMN.questions}
              </th>
            )}
            <th role="columnheader" scope="col" className="px-4 py-2.5 font-medium">
              {COLUMN.coverage}
            </th>
            <th role="columnheader" scope="col" className="px-4 py-2.5 text-right font-medium">
              {COLUMN.labs}
            </th>
            <th role="columnheader" scope="col" className="px-4 py-2.5 font-medium">
              {COLUMN.practiceExam}
            </th>
            <th role="columnheader" scope="col" className="px-4 py-2.5 text-right font-medium">
              {COLUMN.path}
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup" className="max-sm:grid max-sm:gap-3 sm:divide-y sm:divide-border">
          {rows.map((r) => (
            <tr
              key={r.cert}
              role="row"
              className="bg-card max-sm:grid max-sm:grid-cols-3 max-sm:gap-x-2 max-sm:gap-y-3 max-sm:rounded-lg max-sm:border max-sm:border-border max-sm:p-4"
            >
              <th
                role="rowheader"
                scope="row"
                className="font-semibold max-sm:col-span-3 sm:whitespace-nowrap sm:px-4 sm:py-3.5"
              >
                {r.name} <span className="ml-1 font-mono text-note font-normal text-muted-foreground">{r.code}</span>
              </th>
              {counted && (
                // An exam without a count keeps its cell in the table and has no figure on a phone.
                <td
                  role="cell"
                  className={cn(
                    FIGURE,
                    "tabular-nums sm:px-4 sm:py-3.5 sm:text-right",
                    r.questions === null && "max-sm:hidden"
                  )}
                >
                  <Label>{COLUMN.questions}</Label>
                  {r.questions === null ? "" : fmt(r.questions)}
                </td>
              )}
              <td role="cell" className={cn(FIGURE, "sm:px-4 sm:py-3.5 sm:text-muted-foreground")}>
                <Label>{COLUMN.coverage}</Label>
                {r.objectives}
              </td>
              <td role="cell" className={cn(FIGURE, "tabular-nums sm:px-4 sm:py-3.5 sm:text-right")}>
                <Label>{COLUMN.labs}</Label>
                {r.labs}
              </td>
              <td role="cell" className={cn(FIGURE, "max-sm:col-span-2 sm:px-4 sm:py-3.5")}>
                <Label>{COLUMN.practiceExam}</Label>
                {/* The name begins with the words on the page and goes on to say which exam. */}
                <IntentLink href={r.exam.href} className="cb-link cb-tap max-sm:w-fit">
                  {r.exam.label}
                  <span className="sr-only">
                    , {r.name} {r.code} practice exam
                  </span>
                </IntentLink>
              </td>
              <td role="cell" className={cn(FIGURE, "sm:px-4 sm:py-3.5 sm:text-right")}>
                <Label>{COLUMN.path}</Label>
                {/* The name begins with the word on the page and goes on to say which study path. */}
                <IntentLink href={r.path} className="cb-link cb-tap font-semibold max-sm:w-fit sm:whitespace-nowrap">
                  Start{" "}
                  <span className="sr-only">
                    the {r.name} {r.code} study path
                  </span>
                </IntentLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
