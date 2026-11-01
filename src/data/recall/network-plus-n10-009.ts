import { isDataRate, type RecallDeckConfig } from "@/lib/recall/recall-deck";

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
    accept: "numeric-parts",
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
    distractorGroupKey: "type",
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
    distractorGroupKey: "category",
    detailKeys: ["maxDistance", "connector", "category"],
    only: (row) => isDataRate(row.maxSpeed),
  },
  {
    id: "net-osi",
    label: "OSI model",
    blurb: "Match each layer to its number, both ways.",
    tableId: "osi-model",
    mode: "choice",
    ask: { key: "name", label: "layer" },
    answer: { key: "layer", label: "layer number" },
    bidirectional: true,
    detailKeys: ["function", "protocols"],
  },
  {
    id: "net-wireless",
    label: "Wi-Fi standards",
    blurb: "Recall each 802.11 standard's frequency band.",
    tableId: "wireless-standards",
    mode: "choice",
    ask: { key: "standard", label: "standard" },
    answer: { key: "frequency", label: "frequency band" },
    detailKeys: ["name", "maxSpeed"],
    // Bluetooth, NFC, Zigbee and Z-Wave share the table but not the question.
    only: (row) => row.standard.startsWith("802.11"),
  },
];
