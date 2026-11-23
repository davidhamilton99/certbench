import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/env";

/**
 * The link in the post-exam email: who it went to, for which exam, until when,
 * signed so only CertBench can mint one. It lets someone tell us how their
 * exam went from their inbox, on any device, without signing in first: the
 * sign-in step is where these stories used to get lost.
 *
 * Stateless (no table), keyed like the readiness share tokens on a secret that
 * never leaves the server, with its own prefix so no other signed token can
 * stand in for one.
 */

export interface StoryClaim {
  userId: string;
  certId: string;
  expiresAt: number;
}

const PREFIX = "story.v1";
/** Long enough for a late reply; a story months on is still welcome but rare. */
export const STORY_TOKEN_TTL_MS = 60 * 86_400_000;

function sign(body: string): string {
  return createHmac("sha256", Buffer.from(serverEnv("SUPABASE_SERVICE_ROLE_KEY")))
    .update(`${PREFIX}:${body}`)
    .digest("base64url");
}

export function signStoryToken(userId: string, certId: string, now: number = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ u: userId, c: certId, e: now + STORY_TOKEN_TTL_MS })).toString(
    "base64url"
  );
  return `${body}.${sign(body)}`;
}

/** The claim, or null when the token is malformed, tampered with or expired. */
export function verifyStoryToken(token: string, now: number = Date.now()): StoryClaim | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  // The comparison in constant time throws when its inputs differ in byte
  // length, and the token is whatever the address carried: a signature with the
  // right number of characters and one of them outside ASCII is longer in
  // bytes. So the lengths compared first are the byte lengths.
  const given = Buffer.from(sig);
  const expected = Buffer.from(sign(body));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof p.u !== "string" || typeof p.c !== "string" || typeof p.e !== "number") return null;
    if (p.e < now) return null;
    return { userId: p.u, certId: p.c, expiresAt: p.e };
  } catch {
    return null;
  }
}
