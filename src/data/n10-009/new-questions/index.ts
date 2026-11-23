import { questions as domain1 } from "./domain-1";
import { questions as domain2 } from "./domain-2";
import { questions as domain3 } from "./domain-3";
import { questions as domain4 } from "./domain-4";
import { questions as domain5 } from "./domain-5";
import type { N10009NewQuestion } from "../types";

/** Every new Network+ N10-009 question, domain by domain. */
export const N10_009_NEW_QUESTIONS: readonly N10009NewQuestion[] = [...domain1, ...domain2, ...domain3, ...domain4, ...domain5];
