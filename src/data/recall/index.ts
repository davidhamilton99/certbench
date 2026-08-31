import { referenceRegistry } from "@/data/reference";
import {
  autoDeckConfig,
  buildDeck,
  type RecallDeckConfig,
  type ResolvedDeck,
} from "@/lib/recall/recall-deck";
import { securityPlusRecallConfigs } from "./security-plus-sy0-701";
import { networkPlusRecallConfigs } from "./network-plus-n10-009";
import { aPlusCore1RecallConfigs } from "./a-plus-core1-220-1101";
import { aPlusCore2RecallConfigs } from "./a-plus-core2-220-1102";

/**
 * Curated deck configs by certification slug. A cert with no entry (or a table
 * with no curated config) still gets drills via the engine's auto-deck
 * heuristic — see {@link getRecallDecks}.
 */
const curatedConfigs: Record<string, RecallDeckConfig[]> = {
  "security-plus-sy0-701": securityPlusRecallConfigs,
  "network-plus-n10-009": networkPlusRecallConfigs,
  "a-plus-core1-220-1101": aPlusCore1RecallConfigs,
  "a-plus-core2-220-1102": aPlusCore2RecallConfigs,
};

/**
 * Every Recall deck for a certification, one per drillable reference table:
 * the curated config when we have one, otherwise an auto-derived deck. Decks
 * are keyed by their table id, so a "Drill this" link from Reference
 * (`?deck=<tableId>`) always resolves. Unbuildable tables are skipped.
 */
export function getRecallDecks(certSlug: string): ResolvedDeck[] {
  const tables = referenceRegistry[certSlug] ?? [];
  const byId = new Map(tables.map((t) => [t.id, t] as const));
  const curated = curatedConfigs[certSlug] ?? [];

  const decks: ResolvedDeck[] = [];
  const used = new Set<string>();

  // Curated decks first, in their configured order (the flagship tables).
  for (const config of curated) {
    const table = byId.get(config.tableId);
    if (!table) continue;
    try {
      decks.push(buildDeck(config, table));
      used.add(table.id);
    } catch {
      // Skip a misconfigured curated deck rather than break the page.
    }
  }

  // Then an auto-derived deck for every other drillable reference table.
  for (const table of tables) {
    if (used.has(table.id)) continue;
    const config = autoDeckConfig(table);
    if (!config) continue;
    try {
      decks.push(buildDeck(config, table));
    } catch {
      // A table too thin to drill cleanly is simply left out.
    }
  }

  return decks;
}
