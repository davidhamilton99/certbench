import type { PathCert } from "@/core/path/types";
import type { DrillMode } from "@/lib/tools/subnetting";
import type { AuthoredRep } from "./types";
import { domain1, domain2, warmup as securityPlusWarmup } from "./security-plus-sy0-701/domains-1-2";
import { domain3, domain4 } from "./security-plus-sy0-701/domains-3-4";
import { domain5 } from "./security-plus-sy0-701/domain-5";

/**
 * What each exam's path is made of, beyond the question bank:
 *
 * - `authored`: hand-written reps, by objective. A learn stop uses these first.
 *   Security+ has them for every objective, because its bank is the wordiest
 *   (fewer than half its questions are 30 words or fewer).
 * - `warmup`: the opening stop. Hand-written, or a recipe of recall facts plus
 *   the bank's shortest questions.
 * - `recallTables`: reference tables whose facts feed a learn stop, keyed by
 *   table id, valued by the objective they teach.
 * - `subnetting`: hands-on subnetting problems for an objective's learn stop —
 *   fresh numbers every time, one per skill listed.
 */
export interface PathContent {
  authored: AuthoredRep[];
  warmup: {
    authored?: AuthoredRep[];
    decks?: { tableId: string; count: number }[];
    /** How many of the bank's shortest questions to add. */
    bank?: number;
  };
  recallTables: Record<string, string>;
  subnetting?: Record<string, DrillMode[]>;
}

export const PATH_CONTENT: Record<PathCert, PathContent> = {
  "security-plus-sy0-701": {
    authored: [...domain1, ...domain2, ...domain3, ...domain4, ...domain5],
    warmup: { authored: securityPlusWarmup },
    recallTables: {},
  },
  "network-plus-n10-009": {
    authored: [],
    warmup: {
      decks: [
        { tableId: "ports-protocols", count: 3 },
        { tableId: "osi-model", count: 2 },
      ],
      bank: 3,
    },
    recallTables: {
      "osi-model": "1.1",
      "cable-types": "1.3",
      "subnetting-chart": "1.4",
      "ports-protocols": "1.5",
      "network-commands": "1.6",
      "routing-protocols": "2.2",
      "wireless-standards": "2.4",
    },
    subnetting: {
      "1.4": ["cidr-mask", "host-math", "network-id", "same-subnet"],
    },
  },
  "a-plus-core1-220-1101": {
    authored: [],
    warmup: {
      decks: [
        { tableId: "ports-protocols", count: 3 },
        { tableId: "cable-types", count: 2 },
      ],
      bank: 3,
    },
    recallTables: {
      "ports-protocols": "2.1",
      "wireless-standards": "2.3",
      "cable-types": "3.1",
      "storage-types": "3.3",
      "motherboard-components": "3.4",
      "printer-types": "3.6",
      "troubleshooting-steps": "5.1",
    },
    subnetting: {
      "2.6": ["cidr-mask", "host-math"],
    },
  },
  "a-plus-core2-220-1102": {
    authored: [],
    warmup: {
      decks: [
        { tableId: "windows-commands", count: 3 },
        { tableId: "linux-commands", count: 2 },
      ],
      bank: 3,
    },
    recallTables: {
      "windows-commands": "1.2",
      "windows-tools": "1.3",
      "linux-commands": "1.11",
      "security-concepts": "2.1",
      "malware-removal": "3.3",
    },
  },
};
