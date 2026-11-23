import { describe, expect, it } from "vitest";
import { pbqRegistry } from "..";

/**
 * A lab's explanations are read as running text after it is marked: the
 * lab's own, each stage's in a simulation, and each device's in a topology.
 * A sequence is written in words ("Preparation, Detection and Analysis,
 * Containment"), not with arrows between its steps, and "and" is a word, not
 * an ampersand. Five explanations once held one or the other, for example
 * "Preparation, arrow, Detection & Analysis" and "Pins 1 & 2 (Orange pair)".
 *
 * Only explanations are read here. An answer option, a zone or a line of
 * evidence may still hold the notation of the thing it shows (a firewall
 * rule's direction, a log line, the Windows permission "Read & Execute").
 */

/** Every `explanation` in a lab, with where it stands. */
function explanationsOf(value: unknown, at: string): { at: string; text: string }[] {
  if (Array.isArray(value)) return value.flatMap((item, i) => explanationsOf(item, `${at}[${i}]`));
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, inner]) =>
    key === "explanation" && typeof inner === "string"
      ? [{ at: `${at}.explanation`, text: inner }]
      : explanationsOf(inner, `${at}.${key}`)
  );
}

const EXPLANATIONS = Object.entries(pbqRegistry).flatMap(([cert, labs]) =>
  labs.flatMap((lab) => explanationsOf(lab, `${cert}/${lab.id}`))
);

/** An arrow drawn as one character or typed as two. */
const ARROW = /[\u2190-\u21ff\u27f0-\u27ff\u2900-\u297f]|->|=>|<-/;
/** An ampersand between two words. Inside a name ("AT&T") it has no space on either side. */
const AMPERSAND_FOR_AND = /\s&\s|\s&$|^&\s/;

describe("the words of a lab's explanations", () => {
  it("reads every lab's own explanation, and those of its stages and devices", () => {
    const labs = Object.values(pbqRegistry).flat();
    expect(labs.length).toBeGreaterThan(60);
    // Every lab has one of its own, and simulations and topologies have more.
    expect(EXPLANATIONS.length).toBeGreaterThan(labs.length);
    for (const lab of labs) expect(lab.explanation.trim(), lab.id).not.toBe("");
  });

  it("writes a sequence in words, with no arrow between its steps", () => {
    expect(EXPLANATIONS.filter(({ text }) => ARROW.test(text)).map(({ at }) => at)).toEqual([]);
  });

  it("writes 'and' as a word, not as an ampersand", () => {
    expect(EXPLANATIONS.filter(({ text }) => AMPERSAND_FOR_AND.test(text)).map(({ at }) => at)).toEqual([]);
  });

  it("says the two sequences that were drawn with arrows in the order the labs ask for", () => {
    const lab = (cert: string, id: string) => pbqRegistry[cert].find((s) => s.id === id)!;
    const incident = lab("security-plus-sy0-701", "incident-response-steps");
    expect(incident.explanation).toContain(
      "Preparation, Detection and Analysis, Containment, Eradication, Recovery, and Post-Incident Activity (Lessons Learned)."
    );
    const osi = lab("network-plus-n10-009", "osi-model-layers");
    expect(osi.explanation).toContain(
      "Physical (Layer 1), Data Link (Layer 2), Network (Layer 3), Transport (Layer 4), Session (Layer 5), Presentation (Layer 6) and Application (Layer 7)."
    );
    // Each lab is an ordering lab whose items stand in that same order.
    for (const ordering of [incident, osi]) {
      if (ordering.type !== "ordering") throw new Error(`${ordering.id} is not an ordering lab`);
      const inOrder = ordering.correct_order.map((i) => ordering.items[i]);
      const places = inOrder.map((item) => ordering.explanation.indexOf(item));
      expect(places.every((place) => place >= 0), ordering.id).toBe(true);
      expect([...places].sort((a, b) => a - b), ordering.id).toEqual(places);
    }
  });
});
