import { describe, expect, it } from "vitest";
import {
  LEAD_CONTEXT_MAX_KEYS,
  LEAD_CONTEXT_MAX_KEY_LENGTH,
  LEAD_CONTEXT_MAX_VALUE_LENGTH,
  captureToolLead,
} from "../tools";

const lead = (context?: unknown) =>
  captureToolLead.input.safeParse({ email: "sam@example.com", source: "port-numbers-quiz", context });

describe("the study plan form's contract", () => {
  it("accepts a lead with no context, and with the small signal a tool sends", () => {
    expect(lead().success).toBe(true);
    expect(lead({ answered: 20, accuracy: 85, mode: "ports" }).success).toBe(true);
  });

  // The route is public and the context is stored as sent: without limits
  // anyone could fill the table a few megabytes at a time.
  it("accepts a context at its limits and refuses one entry more", () => {
    const entries = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, i]));
    expect(lead(entries(LEAD_CONTEXT_MAX_KEYS)).success).toBe(true);
    expect(lead(entries(LEAD_CONTEXT_MAX_KEYS + 1)).success).toBe(false);
  });

  it("refuses a key or a text value that is too long, and an empty key", () => {
    expect(lead({ ["k".repeat(LEAD_CONTEXT_MAX_KEY_LENGTH)]: 1 }).success).toBe(true);
    expect(lead({ ["k".repeat(LEAD_CONTEXT_MAX_KEY_LENGTH + 1)]: 1 }).success).toBe(false);
    expect(lead({ note: "v".repeat(LEAD_CONTEXT_MAX_VALUE_LENGTH) }).success).toBe(true);
    expect(lead({ note: "v".repeat(LEAD_CONTEXT_MAX_VALUE_LENGTH + 1) }).success).toBe(false);
    expect(lead({ "": 1 }).success).toBe(false);
  });

  it("refuses a value that is not text or a number", () => {
    expect(lead({ nested: { a: 1 } }).success).toBe(false);
    expect(lead({ list: [1, 2, 3] }).success).toBe(false);
  });

  it("refuses an address that is not an email, and a tool it does not know", () => {
    expect(captureToolLead.input.safeParse({ email: "not an address", source: "port-numbers-quiz" }).success).toBe(false);
    expect(captureToolLead.input.safeParse({ email: "sam@example.com", source: "another-tool" }).success).toBe(false);
  });

  it("answers with what happened to the email, in one of three words", () => {
    for (const delivery of ["sent", "skipped", "failed"]) {
      expect(captureToolLead.output.safeParse({ ok: true, delivery }).success).toBe(true);
    }
    expect(captureToolLead.output.safeParse({ ok: true }).success).toBe(false);
    expect(captureToolLead.output.safeParse({ ok: true, delivery: "queued" }).success).toBe(false);
  });
});
