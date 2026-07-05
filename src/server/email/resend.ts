import "server-only";

import { serverEnvOptional } from "@/env";

const DEFAULT_FROM = "CertBench <hello@certbench.dev>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers, e.g. List-Unsubscribe for lifecycle mail. */
  headers?: Record<string, string>;
}

/**
 * Sends one email through the Resend REST API (raw fetch — same idiom as
 * the Anthropic client). Degrades gracefully: with no RESEND_API_KEY the
 * send is skipped and logged, never thrown, so email being unconfigured
 * can't break onboarding or crons.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`email skipped (no RESEND_API_KEY): "${input.subject}" -> ${input.to}`);
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: serverEnvOptional("EMAIL_FROM") ?? DEFAULT_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: input.headers,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`resend send failed (${res.status}): ${body.slice(0, 300)}`);
    return false;
  }
  return true;
}
