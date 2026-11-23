import { describe, expect, it } from "vitest";
import { getRecallDecks } from "@/data/recall";
import { referenceRegistry } from "@/data/reference";
import { PORT_ENTRIES } from "@/lib/tools/port-quiz-data";
import { portExplanation } from "../port-explanations";
import { explainRow } from "../recall-deck";

/**
 * The public port quiz prints, after an answer, the sentences that the row's
 * own exam's ports deck gives it. The quiz loads only the decks and tables it
 * needs (it is a client component), so this test ties that short list to the
 * merged list of ports that the quiz really asks.
 */
describe("the sentences the public port quiz prints", () => {
  const PORTS = "ports-protocols";
  /** The exam a port of the merged list was taken from: the first, in the registry's order, whose table lists it. */
  const examOf = (port: string) =>
    Object.keys(referenceRegistry).find((cert) =>
      referenceRegistry[cert].some((table) => table.id === PORTS && table.entries.some((entry) => entry.columns.port === port))
    );

  it("gives every port of the merged list the sentences of its own exam's deck", () => {
    const taken: Record<string, number> = {};
    for (const entry of PORT_ENTRIES) {
      const at = `${entry.protocol} ${entry.port}`;
      const cert = examOf(entry.port)!;
      expect(cert, at).toBeDefined();
      const deck = getRecallDecks(cert).find((d) => d.config.tableId === PORTS)!;
      const row = deck.rows.find((r) => r.port === entry.port && r.protocol === entry.protocol)!;
      expect(row, at).toBeDefined();
      const sentences = explainRow(deck.config, row);
      expect(sentences, at).not.toBeNull();
      expect(portExplanation(entry.port, entry.protocol), at).toBe(sentences);
      taken[cert] = (taken[cert] ?? 0) + 1;
    }
    // Every port of the Security+ table, and the one port that only the Network+ table lists.
    // If another exam's table starts to give the list a port, its deck has to be loaded by the quiz too.
    expect(taken).toEqual({ "security-plus-sy0-701": 34, "network-plus-n10-009": 1 });
  });

  it("prints a deck's sentences as that deck has them", () => {
    // A row the template serves, a pair of ports with sentences of its own, and both rows of RADIUS.
    expect(portExplanation("443", "HTTPS")).toBe("HTTPS uses port 443.");
    expect(portExplanation("20/21", "FTP")).toBe(
      "FTP uses ports 20 and 21. The File Transfer Protocol uses port 20 for data and port 21 for control."
    );
    expect(portExplanation("1645/1646", "RADIUS")).toBe("RADIUS uses ports 1645 and 1646. These are its legacy ports.");
    expect(portExplanation("1812/1813", "RADIUS")).toBe(
      "RADIUS uses ports 1812 and 1813. Port 1812 is for authentication and port 1813 is for accounting."
    );
    // The port that only the Network+ table lists.
    expect(portExplanation("1521", "Oracle SQL")).toBe("Oracle SQL uses port 1521. This is the port of the Oracle Database listener.");
  });

  it("has nothing to say about a pair that no table lists", () => {
    expect(portExplanation("9999", "Example")).toBeNull();
    // The port is listed, but not for this protocol.
    expect(portExplanation("443", "SSH")).toBeNull();
    expect(portExplanation("", "")).toBeNull();
  });
});
