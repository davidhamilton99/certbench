import { describe, expect, it, vi } from "vitest";

// The module HMACs with the service-role key via serverEnv; stub it.
vi.mock("@/env", () => ({
  serverEnv: () => "test-service-role-key-for-hmac",
}));

import {
  shareName,
  signShare,
  verifyShare,
  type SharePayload,
} from "../readiness-token";

const payload: SharePayload = {
  n: "David H.",
  c: "CompTIA Security+",
  x: "SY0-701",
  s: 82,
  p: 0,
  d: [
    ["General Security Concepts", 90],
    ["Threats & Mitigations", 67],
  ],
};

describe("share token", () => {
  it("round-trips a signed payload", () => {
    const decoded = verifyShare(signShare(payload));
    expect(decoded).toEqual(payload);
  });

  it("rejects a tampered body", () => {
    const token = signShare(payload);
    const [body, sig] = token.split(".");
    // Flip a character in the payload body — signature no longer matches.
    const tampered = `${body.slice(0, -1)}${body.at(-1) === "A" ? "B" : "A"}.${sig}`;
    expect(verifyShare(tampered)).toBeNull();
  });

  it("rejects a forged signature", () => {
    const body = signShare(payload).split(".")[0];
    expect(verifyShare(`${body}.notarealsignature`)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    for (const t of ["", "nodot", ".", "a.b.c.d"]) {
      expect(verifyShare(t)).toBeNull();
    }
  });
});

describe("shareName", () => {
  it("reduces to first name + last initial", () => {
    expect(shareName("David Hamilton")).toBe("David H.");
    expect(shareName("  Jordan  Mensah ")).toBe("Jordan M.");
  });

  it("keeps a single name as-is", () => {
    expect(shareName("Prince")).toBe("Prince");
  });

  it("falls back for empty input", () => {
    expect(shareName("   ")).toBe("A CertBench user");
  });
});
