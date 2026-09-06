import type { RecallDeckConfig } from "@/lib/recall/recall-deck";

/**
 * Curated Recall decks for Security+ SY0-701 — hand-tuned column pairs, modes,
 * and bidirectionality for the highest-value memorization tables. Any reference
 * table without a curated config here is still drillable via the engine's
 * auto-deck heuristic; these just get the sharper treatment.
 */
export const securityPlusRecallConfigs: RecallDeckConfig[] = [
  {
    id: "sec-acronyms",
    label: "Acronyms",
    blurb: "Expand every SY0-701 acronym — both directions.",
    tableId: "acronyms",
    mode: "choice",
    ask: { key: "acronym", label: "acronym" },
    answer: { key: "expansion", label: "expansion" },
    bidirectional: true,
    distractorGroupKey: "category",
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
    accept: "numeric-parts",
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
  {
    id: "sec-attacks",
    label: "Attacks",
    blurb: "Name the attack from what it does.",
    tableId: "attack-types",
    mode: "choice",
    ask: { key: "description", label: "description" },
    answer: { key: "attack", label: "attack" },
    distractorGroupKey: "category",
    detailKeys: ["category", "mitigation"],
  },
  {
    id: "sec-auth",
    label: "Authentication",
    blurb: "Identify the auth method from its description.",
    tableId: "authentication-types",
    mode: "choice",
    ask: { key: "description", label: "description" },
    answer: { key: "method", label: "method" },
    distractorGroupKey: "category",
    detailKeys: ["category", "port"],
  },
];
