import type { ReferenceTable } from "../types";
import { windowsCommands } from "./windows-commands";
import { windowsTools } from "./windows-tools";
import { securityConcepts } from "./security-concepts";
import { malwareRemoval } from "./malware-removal";
import { linuxCommands } from "./linux-commands";

export const tables: ReferenceTable[] = [
  windowsCommands,
  windowsTools,
  securityConcepts,
  malwareRemoval,
  linuxCommands,
];
