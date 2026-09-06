import type { RecallDeckConfig } from "@/lib/recall/recall-deck";

/** Curated Recall decks for A+ Core 1 (220-1101). Unique cues; the rest auto. */
export const aPlusCore1RecallConfigs: RecallDeckConfig[] = [
  {
    id: "a1-ports",
    label: "Ports & protocols",
    blurb: "Match protocols to their port numbers.",
    tableId: "ports-protocols",
    mode: "choice",
    ask: { key: "protocol", label: "protocol" },
    answer: { key: "port", label: "port" },
    bidirectional: true,
    accept: "numeric-parts",
    detailKeys: ["service", "transport"],
  },
  {
    id: "a1-cables",
    label: "Cable types",
    blurb: "Recall each cable's max speed.",
    tableId: "cable-types",
    mode: "choice",
    ask: { key: "cable", label: "cable" },
    answer: { key: "maxSpeed", label: "max speed" },
    distractorGroupKey: "category",
    detailKeys: ["maxDistance", "connector"],
  },
  {
    id: "a1-storage",
    label: "Storage",
    blurb: "Recall each storage device's speed.",
    tableId: "storage-types",
    mode: "choice",
    ask: { key: "type", label: "storage type" },
    answer: { key: "maxSpeed", label: "max speed" },
    detailKeys: ["interface", "formFactor"],
  },
  {
    id: "a1-wireless",
    label: "Wireless",
    blurb: "Recall each standard's max speed.",
    tableId: "wireless-standards",
    mode: "choice",
    ask: { key: "standard", label: "standard" },
    answer: { key: "maxSpeed", label: "max speed" },
    detailKeys: ["frequency", "name"],
  },
];
