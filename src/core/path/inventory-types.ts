/**
 * One row of the table that says what CertBench holds for an exam: the home
 * page's and the educators page's "What each exam includes". The server counts
 * the row (src/server/path/inventory.ts) and a component draws it
 * (src/components/home/Inventory.tsx), so the shape lives here, where both
 * sides may read it.
 */
export interface InventoryRow {
  cert: string;
  /** "Security+" */
  name: string;
  /** "SY0-801" */
  code: string;
  /** Active questions in the exam's bank. Null only for an exam that is not in the database. */
  questions: number | null;
  /** "27 objectives" or, where the numbering is not CompTIA's, "27 topics". */
  objectives: string;
  labs: number;
  /** The exam's free practice exam: where it is and how long. */
  exam: { href: string; label: string };
  /** The exam's study path. */
  path: string;
}
