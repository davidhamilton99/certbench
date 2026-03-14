import type { ReferenceTable } from "./types";
import { tables as securityPlusTables } from "./security-plus-sy0-701";
import { tables as networkPlusTables } from "./network-plus-n10-009";
import { tables as aPlusCore1Tables } from "./a-plus-core1-220-1101";
import { tables as aPlusCore2Tables } from "./a-plus-core2-220-1102";

export const referenceRegistry: Record<string, ReferenceTable[]> = {
  "security-plus-sy0-701": securityPlusTables,
  "network-plus-n10-009": networkPlusTables,
  "a-plus-core1-220-1101": aPlusCore1Tables,
  "a-plus-core2-220-1102": aPlusCore2Tables,
};

export type { ReferenceTable, ReferenceColumn, ReferenceEntry } from "./types";
