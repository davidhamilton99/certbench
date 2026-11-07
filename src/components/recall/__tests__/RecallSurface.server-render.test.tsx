import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { getRecallDecks } from "@/data/recall";
import { RecallSurface } from "@/components/recall/RecallSurface";

vi.mock("@/components/marketing/SubnettingDrillLazy", () => ({
  SubnettingDrillLazy: () => null,
}));

const CERTS = [
  "security-plus-sy0-701",
  "network-plus-n10-009",
  "a-plus-core1-220-1101",
  "a-plus-core2-220-1102",
] as const;

/**
 * The Recall page is server-rendered first: every exam's page must survive that.
 * This renders the component directly, so it can't see the hand-off from the
 * server page; recall-deck.test.ts checks that decks are plain data for it.
 */
describe.each(CERTS)("Recall's server render for %s", (cert) => {
  it("renders without throwing", () => {
    const html = renderToString(<RecallSurface decks={getRecallDecks(cert)} certSlug={cert} />);
    expect(html).toContain('role="tablist"');
  });
});
