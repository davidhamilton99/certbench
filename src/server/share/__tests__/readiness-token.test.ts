import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** The two secrets the module may sign with. A test that names neither has the service-role key only. */
const env = vi.hoisted(() => ({
  serviceRole: "test-service-role-key-for-hmac" as string | undefined,
  linkSecret: undefined as string | undefined,
}));

vi.mock("@/env", () => ({
  serverEnv: (key: string) => {
    if (key === "SUPABASE_SERVICE_ROLE_KEY" && env.serviceRole) return env.serviceRole;
    throw new Error(`Missing required environment variable ${key}`);
  },
  serverEnvOptional: (key: string) => (key === "LINK_SIGNING_SECRET" ? env.linkSecret : undefined),
}));

beforeEach(() => {
  env.serviceRole = "test-service-role-key-for-hmac";
  env.linkSecret = undefined;
});

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

  // The comparison that takes constant time throws when its two buffers differ
  // in BYTES. A signature of the right number of characters with one character
  // outside ASCII has more bytes, and made the public page answer with a 500.
  it("refuses, and does not throw on, a signature with a character outside ASCII", () => {
    const [body, sig] = signShare(payload).split(".");
    for (const code of [0xe9, 0x20ac, 0x1f600]) {
      const forged = `${body}.${sig.slice(0, -1)}${String.fromCodePoint(code)}`;
      expect(() => verifyShare(forged)).not.toThrow();
      expect(verifyShare(forged)).toBeNull();
    }
    const allOutside = `${body}.${String.fromCodePoint(0xe9).repeat(sig.length)}`;
    expect(verifyShare(allOutside)).toBeNull();
  });
});

// Every card shared before LINK_SIGNING_SECRET existed was signed with the
// service role key, so rotating that key voided all of them, and a deployment
// without it answered 500 on the public card page.
describe("share token: the signing key", () => {
  /** The signature a key gives a body, as the module writes it. */
  const signatureWith = (secret: string, body: string) =>
    createHmac("sha256", Buffer.from(secret)).update(body).digest("base64url");

  it("is the service role key until LINK_SIGNING_SECRET is set, so cards shared before keep working", () => {
    const [body, sig] = signShare(payload).split(".");
    expect(sig).toBe(signatureWith("test-service-role-key-for-hmac", body));
    expect(verifyShare(`${body}.${sig}`)).toEqual(payload);
  });

  it("is LINK_SIGNING_SECRET once it is set, and a card signed with the service role key then fails", () => {
    const before = signShare(payload);
    env.linkSecret = "test-link-signing-secret";

    const [body, sig] = signShare(payload).split(".");
    expect(sig).toBe(signatureWith("test-link-signing-secret", body));
    expect(verifyShare(`${body}.${sig}`)).toEqual(payload);
    expect(verifyShare(before)).toBeNull();
  });

  it("keeps cards working when the service role key is changed or missing, once LINK_SIGNING_SECRET is set", () => {
    env.linkSecret = "test-link-signing-secret";
    const token = signShare(payload);
    env.serviceRole = "a-rotated-service-role-key";
    expect(verifyShare(token)).toEqual(payload);
    env.serviceRole = undefined;
    expect(verifyShare(token)).toEqual(payload);
  });

  it("answers null, and does not throw, when no key is set", () => {
    const token = signShare(payload);
    env.serviceRole = undefined;
    expect(() => verifyShare(token)).not.toThrow();
    expect(verifyShare(token)).toBeNull();
    // Making a card without a key fails where it is made.
    expect(() => signShare(payload)).toThrow("Missing required environment variable SUPABASE_SERVICE_ROLE_KEY");
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
