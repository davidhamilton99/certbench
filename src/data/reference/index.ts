import type { ReferenceTable } from "./types";
import { tables as securityPlusTables } from "./security-plus-sy0-701";

export const referenceRegistry: Record<string, ReferenceTable[]> = {
  "security-plus-sy0-701": securityPlusTables,
};

export type { ReferenceTable, ReferenceColumn, ReferenceEntry } from "./types";
