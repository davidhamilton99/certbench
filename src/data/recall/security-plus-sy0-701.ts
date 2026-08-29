import { referenceRegistry } from "@/data/reference";
import {
  buildDeck,
  type RecallDeckConfig,
  type ResolvedDeck,
} from "@/lib/recall/recall-deck";

/**
 * Recall decks for Security+ SY0-701 — the memorization layer, drilled. Each
 * deck is a config over a verified reference table; {@link buildDeck} validates
 * it at module load so a mis-mapped column fails the build, never a user.
 */

const CERT_SLUG = "security-plus-sy0-701";

const CONFIGS: RecallDeckConfig[] = [
  {
    id: "sec-acronyms",
    label: "Acronyms",
    blurb: "Expand every SY0-701 acronym — both directions.",
    tableId: "acronyms",
    mode: "choice",
    ask: { key: "acronym", label: "acronym" },
    answer: { key: "expansion", label: "expansion" },
    bidirectional: true,
    detailKeys: ["category"],
  },
  {
    id: "sec-ports",
    label: "Ports & protocols",
    blurb: "Match protocols to their port numbers, cold.",
    tableId: "ports-protocols",
    mode: "choice",
    ask: { key: "protocol", label: "protocol" },
    answer: { key: "port", label: "port" },
    bidirectional: true,
    detailKeys: ["service", "transport"],
  },
  {
    id: "sec-crypto",
    label: "Crypto & hashing",
    blurb: "Classify each algorithm — symmetric, asymmetric, hash…",
    tableId: "encryption-algorithms",
    mode: "choice",
    ask: { key: "algorithm", label: "algorithm" },
    answer: { key: "type", label: "type" },
    detailKeys: ["keySize", "use"],
  },
];

function resolve(): ResolvedDeck[] {
  const tables = referenceRegistry[CERT_SLUG] ?? [];
  return CONFIGS.map((config) => {
    const table = tables.find((t) => t.id === config.tableId);
    if (!table) {
      throw new Error(
        `Recall: reference table "${config.tableId}" missing for ${CERT_SLUG}`
      );
    }
    return buildDeck(config, table);
  });
}

export const securityPlusRecallDecks: ResolvedDeck[] = resolve();
