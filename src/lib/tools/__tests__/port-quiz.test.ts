import { describe, expect, it } from "vitest";
import { makeQuestion } from "../port-quiz";
import { PORT_ENTRIES } from "../port-quiz-data";

describe("port quiz question generation", () => {
  it("builds four options, includes the answer, with distinct labels and keys", () => {
    for (let i = 0; i < 3000; i++) {
      const q = makeQuestion(PORT_ENTRIES);
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);

      // Every option must show a distinct value in the asked direction — a
      // duplicate would confuse the quiz and (via a duplicate React key) leave
      // a stale option on screen.
      const labels = q.options.map((o) =>
        q.direction === "port" ? o.port : o.protocol
      );
      expect(new Set(labels).size, `dup label: ${labels.join(", ")}`).toBe(4);

      // The rendered React key (option.port) must be unique too.
      expect(new Set(q.options.map((o) => o.port)).size).toBe(4);
    }
  });

  it("never shows a protocol twice, even for RADIUS (two ports, one name)", () => {
    let protocolQuestions = 0;
    for (let i = 0; i < 5000; i++) {
      const q = makeQuestion(PORT_ENTRIES);
      if (q.direction !== "protocol") continue;
      protocolQuestions++;
      const names = q.options.map((o) => o.protocol);
      expect(new Set(names).size).toBe(names.length);
    }
    expect(protocolQuestions).toBeGreaterThan(100);
  });
});
