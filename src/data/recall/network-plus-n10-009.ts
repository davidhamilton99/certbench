import type { RecallDeckConfig } from "@/lib/recall/recall-deck";

/**
 * Curated Recall decks for Network+ N10-009. These pick a unique cue column so
 * the drill is never ambiguous (the generic auto-picker would otherwise cue on
 * a broad category like routing "type" or cable "category", which maps to many
 * answers). Tables with no config here still get a clean auto-deck.
 */
export const networkPlusRecallConfigs: RecallDeckConfig[] = [
  {
    id: "net-ports",
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
    id: "net-commands",
    label: "Commands",
    blurb: "Name the command for the job.",
    tableId: "network-commands",
    mode: "choice",
    ask: { key: "purpose", label: "purpose" },
    answer: { key: "command", label: "command" },
    detailKeys: ["platform", "example"],
  },
  {
    id: "net-routing",
    label: "Routing protocols",
    blurb: "Recall each protocol's administrative distance.",
    tableId: "routing-protocols",
    mode: "choice",
    ask: { key: "protocol", label: "protocol" },
    answer: { key: "ad", label: "admin distance" },
    detailKeys: ["type", "algorithm", "metric"],
  },
  {
    id: "net-cables",
    label: "Cable types",
    blurb: "Recall each cable's max speed.",
    tableId: "cable-types",
    mode: "choice",
    ask: { key: "cable", label: "cable" },
    answer: { key: "maxSpeed", label: "max speed" },
    detailKeys: ["maxDistance", "connector", "category"],
  },
];
