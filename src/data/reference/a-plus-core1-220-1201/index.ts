import type { ReferenceTable } from "../types";
import { portsProtocols } from "./ports-protocols";
import { cableTypes } from "./cable-types";
import { motherboardComponents } from "./motherboard-components";
import { storageTypes } from "./storage-types";
import { wirelessStandards } from "./wireless-standards";
import { printerTypes } from "./printer-types";

export const tables: ReferenceTable[] = [
  portsProtocols,
  cableTypes,
  motherboardComponents,
  storageTypes,
  wirelessStandards,
  printerTypes,
];
