import type { ResolvedDeck } from "@/lib/recall/recall-deck";
import { securityPlusRecallDecks } from "./security-plus-sy0-701";

/**
 * Recall decks by certification slug. Security+ SY0-701 ships first; Network+
 * and A+ follow once the Security+ experience clears the bar.
 */
export const recallRegistry: Record<string, ResolvedDeck[]> = {
  "security-plus-sy0-701": securityPlusRecallDecks,
};
