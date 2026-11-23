"use client";

import { useId, useState } from "react";
import { api } from "@/lib/api-client";
import { createPortal } from "@/contracts/billing";
import { userMessage } from "@/lib/errors/user-message";
import { Button } from "@/components/ui/button";

/**
 * Opens the billing page (the payment provider's portal, which holds the form
 * for the payment method). It is offered to every account that has a billing
 * record, and it is the one action shown to a member whose last payment failed.
 *
 * A failure is said beside the button and stays there: a message that slides
 * away is easy to miss, and this one is about money.
 */
export function ManageBillingButton({ variant = "outline" }: { variant?: "default" | "outline" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const errorId = useId();

  async function open() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { url } = await api(createPortal, {});
      window.location.href = url;
    } catch (err) {
      setError(userMessage(err, "The billing page could not be opened. Please try again."));
      setBusy(false);
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <Button variant={variant} onClick={open} loading={busy} aria-describedby={error ? errorId : undefined}>
        Manage billing
      </Button>
      {error && (
        <p id={errorId} role="alert" className="cb-measure text-small text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
