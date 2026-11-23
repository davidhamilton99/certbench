import { networkPlusRecallConfigs } from "@/data/recall/network-plus-n10-009";
import { securityPlusPortsDeck } from "@/data/recall/security-plus-ports";
import { portsProtocols as networkPlusPorts } from "@/data/reference/network-plus-n10-009/ports-protocols";
import { portsProtocols as securityPlusPorts } from "@/data/reference/security-plus-sy0-701/ports-protocols";
import type { ReferenceTable } from "@/data/reference/types";
import { explainRow, type RecallDeckConfig } from "./recall-deck";

/**
 * The sentences that explain a port on the public port quiz.
 *
 * The quiz asks one merged list of ports (src/lib/tools/port-quiz-data.ts):
 * the ports tables of the exams that have one, in the registry's order, each
 * port taken from the first table that lists it. Each table has a recall deck
 * that explains its rows in sentences, so the quiz prints what that deck
 * prints on the study path and on the Recall page, and a port reads the same
 * in all three places.
 *
 * The quiz is a client component, so whatever is imported here is sent to the
 * browser. That is why the tables and the decks are imported by name and not
 * through the registries, and why only the tables that give the merged list a
 * port are here: every port of the Security+ table, and the ports that only
 * the Network+ table lists. The A+ Core 1 table lists no port that those two
 * do not. A test (port-explanations.test.ts) fails when the merged list holds
 * a port that these do not explain as its own exam's deck does, which is what
 * a new ports table, or a new port in the A+ table, would cause.
 */
const SOURCES: { table: ReferenceTable; deck: RecallDeckConfig | undefined }[] = [
  { table: securityPlusPorts, deck: securityPlusPortsDeck },
  { table: networkPlusPorts, deck: networkPlusRecallConfigs.find((config) => config.tableId === networkPlusPorts.id) },
];

/**
 * The sentences for a protocol on a port: those of the first exam's deck, in
 * the order of the merged list, whose table lists that protocol on that port.
 * Null when no table here lists the pair, or when its deck has no sentences
 * for it.
 */
export function portExplanation(port: string, protocol: string): string | null {
  for (const { table, deck } of SOURCES) {
    const row = table.entries.find(({ columns }) => columns.port === port && columns.protocol === protocol)?.columns;
    if (row) return deck ? explainRow(deck, row) : null;
  }
  return null;
}
