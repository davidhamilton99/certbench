import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret";
});

import { signStoryToken, STORY_TOKEN_TTL_MS, verifyStoryToken } from "../story-token";
import { signShare } from "@/server/share/readiness-token";

const NOW = Date.parse("2026-11-20T12:00:00Z");

describe("story tokens", () => {
  it("say who the email went to and for which exam", () => {
    const token = signStoryToken("user-1", "cert-1", NOW);
    expect(verifyStoryToken(token, NOW)).toEqual({ userId: "user-1", certId: "cert-1", expiresAt: NOW + STORY_TOKEN_TTL_MS });
  });

  it("refuse a token whose body or signature was changed", () => {
    const token = signStoryToken("user-1", "cert-1", NOW);
    const [body, sig] = token.split(".");
    const otherBody = signStoryToken("user-2", "cert-1", NOW).split(".")[0];
    expect(verifyStoryToken(`${otherBody}.${sig}`, NOW)).toBeNull();
    expect(verifyStoryToken(`${body}.${sig.slice(0, -2)}xx`, NOW)).toBeNull();
  });

  // The comparison in constant time throws when its two inputs differ in byte
  // length. A signature with the right number of characters, one of them
  // outside ASCII, is longer in bytes: it used to crash the request (a 500 on
  // the public story page and endpoint) instead of being refused.
  it("refuse, and do not throw on, a signature of the right length that holds a character outside ASCII", () => {
    const token = signStoryToken("user-1", "cert-1", NOW);
    const [body, sig] = token.split(".");
    const forged = [
      `${sig.slice(0, -1)}${String.fromCharCode(0xe9)}`, // two bytes
      `${String.fromCharCode(0x20ac)}${sig.slice(1)}`, // three bytes
      `${sig.slice(0, -2)}${String.fromCodePoint(0x1f600)}`, // four bytes, counted as two characters
      String.fromCharCode(0xe9).repeat(sig.length),
    ];
    for (const signature of forged) {
      expect(signature).toHaveLength(sig.length);
      expect(Buffer.byteLength(signature)).toBeGreaterThan(Buffer.byteLength(sig));
      expect(() => verifyStoryToken(`${body}.${signature}`, NOW)).not.toThrow();
      expect(verifyStoryToken(`${body}.${signature}`, NOW)).toBeNull();
    }
    // The genuine token still verifies.
    expect(verifyStoryToken(token, NOW)).not.toBeNull();
  });

  it("expire after their window", () => {
    const token = signStoryToken("user-1", "cert-1", NOW);
    expect(verifyStoryToken(token, NOW + STORY_TOKEN_TTL_MS - 1)).not.toBeNull();
    expect(verifyStoryToken(token, NOW + STORY_TOKEN_TTL_MS + 1)).toBeNull();
  });

  it("do not accept another kind of signed token, or junk", () => {
    const share = signShare({ n: "A B.", c: "CompTIA Security+", x: "SY0-701", s: 80, p: 0, d: [] });
    expect(verifyStoryToken(share, NOW)).toBeNull();
    for (const t of ["", "nodot", ".", "a.b"]) expect(verifyStoryToken(t, NOW)).toBeNull();
  });
});
