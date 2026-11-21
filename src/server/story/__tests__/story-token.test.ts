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

  it("expire after their window", () => {
    const token = signStoryToken("user-1", "cert-1", NOW);
    expect(verifyStoryToken(token, NOW + STORY_TOKEN_TTL_MS - 1)).not.toBeNull();
    expect(verifyStoryToken(token, NOW + STORY_TOKEN_TTL_MS + 1)).toBeNull();
  });

  it("don't accept another kind of signed token, or junk", () => {
    const share = signShare({ n: "A B.", c: "CompTIA Security+", x: "SY0-701", s: 80, p: 0, d: [] });
    expect(verifyStoryToken(share, NOW)).toBeNull();
    for (const t of ["", "nodot", ".", "a.b"]) expect(verifyStoryToken(t, NOW)).toBeNull();
  });
});
