import type { ReferenceTable } from "../types";
import { portsProtocols } from "./ports-protocols";
import { encryptionAlgorithms } from "./encryption-algorithms";
import { authenticationTypes } from "./authentication-types";
import { attackTypes } from "./attack-types";
import { osiModel } from "./osi-model";

export const tables: ReferenceTable[] = [
  portsProtocols,
  encryptionAlgorithms,
  authenticationTypes,
  attackTypes,
  osiModel,
];
