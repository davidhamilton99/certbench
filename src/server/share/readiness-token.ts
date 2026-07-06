import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/env";

/**
 * Stateless, signed share tokens for the public readiness card. The payload
 * is base64url-encoded JSON with an HMAC signature, so no table or migration
 * is needed and only CertBench-generated cards render (a tampered or forged
 * token fails verification — this prevents fake, brand-damaging cards).
 *
 * The HMAC key reuses the service-role secret: it's always present and never
 * leaves the server, and HMAC output doesn't expose it.
 */

export interface SharePayload {
  /** Display name, already reduced to first name + last initial. */
  n: string;
  /** Certification name, e.g. "CompTIA Security+". */
  c: string;
  /** Exam code, e.g. "SY0-701". */
  x: string;
  /** Readiness score, 0–100. */
  s: number;
  /** 1 when the score is still preliminary. */
  p: 0 | 1;
  /** Up to 5 [domainLabel, score] pairs for the breakdown. */
  d: [string, number][];
}

function key(): Buffer {
  return Buffer.from(serverEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8"
  );
}

function sign(body: string): string {
  return createHmac("sha256", key())
    .update(body)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Encode + sign a payload into a URL-safe token. */
export function signShare(payload: SharePayload): string {
  const body = b64urlEncode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verify + decode a token; null if malformed, tampered, or wrong shape. */
export function verifyShare(token: string): SharePayload | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body);
  // Constant-time compare; unequal lengths can't be equal.
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(b64urlDecode(body)) as SharePayload;
    if (
      typeof parsed.n !== "string" ||
      typeof parsed.c !== "string" ||
      typeof parsed.x !== "string" ||
      typeof parsed.s !== "number" ||
      (parsed.p !== 0 && parsed.p !== 1) ||
      !Array.isArray(parsed.d)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** "David Hamilton" → "David H." — the only identity a shared card exposes. */
export function shareName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A CertBench user";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
