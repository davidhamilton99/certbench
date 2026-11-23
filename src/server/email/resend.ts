import "server-only";

import { serverEnvOptional } from "@/env";

const DEFAULT_FROM = "CertBench <hello@certbench.dev>";

/** How long one request to the mail service may take before it counts as failed. */
export const SEND_TIMEOUT_MS = 10_000;

/** How long to wait before the second and last attempt. */
export const RETRY_AFTER_MS = 1_000;

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers, e.g. List-Unsubscribe for lifecycle mail. */
  headers?: Record<string, string>;
}

/**
 * Sends one email through the Resend REST API (raw fetch). It answers true
 * only when the mail service accepted the email, and it never throws: with no
 * RESEND_API_KEY, after a refusal, or when the service cannot be reached, it
 * logs the reason and answers false, so that the caller can tell a sent email
 * from one that was not sent.
 *
 * A rate limit (429) or a fault at the service (5xx) is tried once more after
 * one second. A request that received no answer is not tried again: the email
 * may have been accepted, and a second attempt could deliver it twice.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`email skipped (no RESEND_API_KEY): "${input.subject}" -> ${input.to}`);
    return false;
  }

  const body = JSON.stringify({
    from: serverEnvOptional("EMAIL_FROM") ?? DEFAULT_FROM,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: input.headers,
  });

  const first = await attempt(apiKey, body);
  if (first !== "retry") return first === "sent";
  await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS));
  return (await attempt(apiKey, body)) === "sent";
}

/** One request. "retry" means the service answered that it could not take the email just now. */
async function attempt(apiKey: string, body: string): Promise<"sent" | "retry" | "failed"> {
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("resend send failed (no answer):", err instanceof Error ? `${err.name}: ${err.message}` : err);
    return "failed";
  }

  if (res.ok) return "sent";
  const detail = await res.text().catch(() => "");
  console.error(`resend send failed (${res.status}): ${detail.slice(0, 300)}`);
  return res.status === 429 || res.status >= 500 ? "retry" : "failed";
}
