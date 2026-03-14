import type { ReferenceTable } from "../types";
import { portsProtocols } from "./ports-protocols";
import { osiModel } from "./osi-model";
import { networkCommands } from "./network-commands";
import { wirelessStandards } from "./wireless-standards";
import { cableTypes } from "./cable-types";
import { subnettingChart } from "./subnetting-chart";
import { routingProtocols } from "./routing-protocols";

export const tables: ReferenceTable[] = [
  portsProtocols,
  osiModel,
  networkCommands,
  wirelessStandards,
  cableTypes,
  subnettingChart,
  routingProtocols,
];
