import { describe, expect, it } from "vitest";
import { repSchema } from "../path";

const choice = {
  id: "q|1.1|42",
  type: "choice" as const,
  label: "Exam style",
  tier: "exam" as const,
  objective: "1.1",
  prompt: "Which port does DNS use?",
  takeaway: "DNS uses port 53.",
  options: ["53", "80", "443", "22"],
  answer: 0,
  lettered: true,
};

describe("a choice rep as the browser reads it", () => {
  // The browser parses every answer with the contract, which drops a field it
  // does not list: the flag set by bankToRep never reached the study path.
  it("keeps the flag that keeps an answer's letter once marked", () => {
    expect(repSchema.parse({ ...choice, keepsLetters: true })).toMatchObject({ keepsLetters: true });
  });

  it("leaves a rep without the flag as it was", () => {
    expect(repSchema.parse(choice)).not.toHaveProperty("keepsLetters");
  });
});
