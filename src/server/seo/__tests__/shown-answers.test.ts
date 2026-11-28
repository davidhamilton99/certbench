import { describe, expect, it } from "vitest";
import { seededRng, seedFrom, shuffle } from "@/core/path/compose";
import { shownAnswers, type StoredAnswers } from "../shown-answers";

const STORED = ["Telnet", "FTP", "SSH", "HTTP"];
const STORED_ORDER = [0, 1, 2, 3];

/** As much of a bank question as the function reads. Its explanation names no answer by a letter unless one is given. */
function question(id: string, correct = 2, explanation = "SSH encrypts the whole session."): StoredAnswers {
  return { id, options: STORED.map((text) => ({ text })), correct_index: correct, explanation };
}

/** Four hundred question ids in the shape of the bank's own, each a character or two from the last. */
const IDS = Array.from({ length: 400 }, (_, i) => `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`);

/** The order the shuffle draws for an id: `order[place]` is the stored index of the answer shown at that place. */
const shuffledOrder = (id: string) => shuffle(STORED_ORDER, seededRng(seedFrom(id)));

/** An id whose shuffle really moves the answers, so that "kept in the stored order" can be told from "shuffled". */
const MOVED = IDS.find((id) => shuffledOrder(id).join() !== STORED_ORDER.join()) as string;

describe("a bank question's answers on a public page", () => {
  it("the test's own ground: this question's answers move when they are shuffled", () => {
    expect(MOVED).toBeTruthy();
    expect(shuffledOrder(MOVED)).not.toEqual(STORED_ORDER);
  });

  // The pages are static. An order that changed from one build to the next
  // would change every page's content for no reason, so it is drawn from the
  // question's id and from nothing else.
  it("come in the same order every time for one question", () => {
    const shown = shownAnswers(question(MOVED));
    expect(shown.options).not.toEqual(STORED);
    expect(shownAnswers(question(MOVED))).toEqual(shown);
    expect(shown.options).toEqual(shuffledOrder(MOVED).map((k) => STORED[k]));
    // Which answer is correct, and what the explanation says of it, do not move the others.
    expect(shownAnswers(question(MOVED, 0, "Telnet sends the session in clear text.")).options).toEqual(shown.options);
  });

  it("come in different orders for different questions", () => {
    const orders = new Set(IDS.map((id) => shownAnswers(question(id)).options.join()));
    // Four answers have 24 orders, and a few hundred questions between them use every one.
    expect(orders.size).toBe(24);
  });

  it("still mark the correct answer, wherever it is stored and wherever it is shown", () => {
    for (const id of IDS) {
      for (const correct of STORED_ORDER) {
        const shown = shownAnswers(question(id, correct));
        expect(shown.options[shown.correctIndex]).toBe(STORED[correct]);
        // Every answer is still there, once.
        expect([...shown.options].sort()).toEqual([...STORED].sort());
      }
    }
  });

  // The stored order has the answer at B in 52 of every 100 questions and at C
  // in 30, so a visitor who always chose B was right half the time.
  it("put the correct answer in each of the four places about as often as in any other", () => {
    const storedPlace = (i: number) => (i % 100 < 52 ? 1 : i % 100 < 82 ? 2 : i % 100 < 91 ? 0 : 3);
    const share = (places: number[], place: number) => places.filter((p) => p === place).length / places.length;
    const stored = IDS.map((_, i) => storedPlace(i));
    const shown = IDS.map((id, i) => shownAnswers(question(id, storedPlace(i))).correctIndex);
    // The test's own ground: as stored, these questions favor B as the bank does.
    expect(share(stored, 1)).toBe(0.52);
    for (const place of STORED_ORDER) {
      expect(share(shown, place), `place ${place}`).toBeGreaterThanOrEqual(0.15);
      expect(share(shown, place), `place ${place}`).toBeLessThanOrEqual(0.35);
    }
  });

  // The letter is the answer's place in the stored order. Shuffled, "Option C"
  // would name whichever answer the shuffle had put third.
  it("keep the stored order when the first sentence of the explanation names an answer by its letter", () => {
    const shown = shownAnswers(
      question(MOVED, 2, "Option C is the only protocol here that encrypts the session. Telnet sends it in clear text.")
    );
    expect(shown.options).toEqual(STORED);
    expect(shown.correctIndex).toBe(2);
    // The letter in the text names the answer shown under that letter.
    expect(shown.options["ABCD".indexOf("C")]).toBe("SSH");
  });

  it("keep the stored order when a later sentence names an answer by its letter", () => {
    const shown = shownAnswers(question(MOVED, 2, "SSH encrypts the session. Option A (Telnet) sends it in clear text."));
    expect(shown.options).toEqual(STORED);
    expect(shown.correctIndex).toBe(2);
  });

  it("are shuffled when the only letter is in a lead that no page prints", () => {
    // Every page drops the lead and prints the rest, which names no letter.
    const shown = shownAnswers(question(MOVED, 2, "Why C is correct: SSH encrypts the whole session. Telnet does not."));
    expect(shown.options).toEqual(shuffledOrder(MOVED).map((k) => STORED[k]));
    expect(shown.options[shown.correctIndex]).toBe("SSH");
  });
});
