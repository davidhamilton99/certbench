"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { addCertCheckout } from "@/contracts/client";
import { userMessage } from "@/lib/errors/user-message";
import { PAYMENT_PAGE_FAILED } from "@/lib/billing/messages";
import { analyticsIds, track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { leaveFor } from "./leave";

/**
 * Opens the payment page for adding one more certification to a Pro plan: a
 * single payment. Access to it still needs an active Pro plan.
 */
export function AddCertButton({
  certId,
  price,
}: {
  certId: string;
  price: string;
}) {
  const [busy, setBusy] = useState(false);

  // Back from the payment page through the browser's own button: the page is
  // shown as it was left, so the button is made ready again.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const { url } = await api(addCertCheckout, { certId, analytics: analyticsIds() });
      // Counted only once there is a payment page to go to.
      track("checkout_started", { interval: "cert_addon" });
      leaveFor(url);
    } catch (err) {
      toast.error(userMessage(err, PAYMENT_PAGE_FAILED));
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={start} loading={busy} className="shrink-0">
      <Plus aria-hidden />
      Add for {price}
    </Button>
  );
}
