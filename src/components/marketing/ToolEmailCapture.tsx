"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
// The endpoint by name only: its schemas arrive with the first request, so a
// tool page does not carry the schema library in its first load.
import { captureToolLead } from "@/contracts/client";
import { ApiError } from "@/contracts/errors";
import type { ToolSource } from "@/contracts/tools";
import { AUTH_INVALID_EMAIL, userMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Said when the mail service did not accept the email: the visitor may try again. */
export const EMAIL_NOT_SENT = "The email could not be sent. Please try again in a few minutes.";

/**
 * Said when no email was sent on purpose. The server sends the study plan to
 * an address at most once in 24 hours for each tool, and never to an address
 * that has unsubscribed, and it does not say which of the two applied.
 */
export const EMAIL_NOT_REPEATED =
  "No new email was sent. The study plan was sent to this address in the last 24 hours, or the address has unsubscribed from CertBench email.";

type Notice = { kind: "error" | "info"; text: string; field?: boolean };

/**
 * The form on a free tool's page that sends the study plan by email: one
 * field, and no account. It says what happened to the email in words. The
 * confirmation is shown only when the mail service accepted the email; when
 * it did not, or when nothing was sent on purpose, the form says so and stays
 * open.
 *
 * The field has a visible label, and its hint and any error are tied to it,
 * so a screen reader reads them with the field. An error is announced as it
 * appears, and the confirmation takes the focus because it replaces the form.
 */
export function ToolEmailCapture({
  source,
  context,
  heading = "Receive a free study plan by email",
  blurb = "The plan sets out three steps that cover the rest of the exam, with a link to start the study path for your exam. You do not need an account.",
}: {
  source: ToolSource;
  context?: Record<string, string | number>;
  heading?: string;
  blurb?: string;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const headingId = useId();
  const fieldId = useId();
  const hintId = useId();
  const noticeId = useId();
  const field = useRef<HTMLInputElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);

  // The confirmation replaces the form that held the focus: it takes the
  // focus so that it is read and the keyboard's place is not lost.
  useEffect(() => {
    if (sentTo !== null) confirmation.current?.focus({ preventScroll: true });
  }, [sentTo]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const address = email.trim();
    setBusy(true);
    setNotice(null);
    try {
      const { delivery } = await api(captureToolLead, { email: address, source, context });
      if (delivery === "sent") setSentTo(address);
      else if (delivery === "failed") setNotice({ kind: "error", text: EMAIL_NOT_SENT });
      else setNotice({ kind: "info", text: EMAIL_NOT_REPEATED });
    } catch (err) {
      // The one field is the email address, so a refused request names it.
      if (err instanceof ApiError && err.code === "validation_failed") {
        setNotice({ kind: "error", text: AUTH_INVALID_EMAIL, field: true });
        field.current?.focus();
      } else {
        setNotice({ kind: "error", text: userMessage(err) });
      }
    } finally {
      setBusy(false);
    }
  }

  if (sentTo !== null) {
    return (
      <div ref={confirmation} tabIndex={-1} role="status" className="glass grid gap-1.5 rounded-lg p-5 sm:p-7">
        <p className="text-lede font-semibold">The study plan has been sent.</p>
        <p className="cb-measure-sm text-small text-muted-foreground">
          It was sent to <span className="font-medium text-foreground [overflow-wrap:anywhere]">{sentTo}</span>. Please
          check your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-labelledby={headingId} className="glass grid gap-4 rounded-lg p-5 sm:p-7">
      <div className="grid gap-1.5">
        <h2 id={headingId} className="text-lede font-semibold">
          {heading}
        </h2>
        <p className="cb-measure-sm text-small text-muted-foreground">{blurb}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={fieldId}>Email address</Label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Input
            ref={field}
            id={fieldId}
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={notice?.field ? true : undefined}
            aria-describedby={notice ? `${hintId} ${noticeId}` : hintId}
            className="h-11 sm:max-w-sm sm:flex-1"
          />
          <Button type="submit" loading={busy} className="h-11">
            Send the study plan
          </Button>
        </div>
        <p id={hintId} className="text-note text-muted-foreground">
          You will receive one email with your study plan. You can unsubscribe at any time.
        </p>
      </div>
      {notice && (
        <p
          id={noticeId}
          // An error interrupts; a plain statement of what happened waits its turn.
          role={notice.kind === "error" ? "alert" : "status"}
          className={notice.kind === "error" ? "text-small text-destructive" : "cb-measure-sm text-small text-foreground"}
        >
          {notice.text}
        </p>
      )}
    </form>
  );
}
