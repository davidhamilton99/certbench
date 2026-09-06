import type { RecallDeckConfig } from "@/lib/recall/recall-deck";

/** Curated Recall decks for A+ Core 2 (220-1102). Unique cues; the rest auto. */
export const aPlusCore2RecallConfigs: RecallDeckConfig[] = [
  {
    id: "a2-windows",
    label: "Windows commands",
    blurb: "Name the command for the job.",
    tableId: "windows-commands",
    mode: "choice",
    ask: { key: "purpose", label: "purpose" },
    answer: { key: "command", label: "command" },
    detailKeys: ["type", "example"],
  },
  {
    id: "a2-linux",
    label: "Linux commands",
    blurb: "Name the command for the job.",
    tableId: "linux-commands",
    mode: "choice",
    ask: { key: "purpose", label: "purpose" },
    answer: { key: "command", label: "command" },
    detailKeys: ["syntax", "example"],
  },
  {
    id: "a2-security",
    label: "Security concepts",
    blurb: "Identify the concept from its description.",
    tableId: "security-concepts",
    mode: "choice",
    ask: { key: "description", label: "description" },
    answer: { key: "concept", label: "concept" },
    distractorGroupKey: "type",
    detailKeys: ["type", "example"],
  },
];
