"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { addCertCheckout } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

/**
 * Starts the one-time add-on checkout for an additional certification and
 * hands off to Stripe. Access still requires active Pro, so this is a
 * one-time fee to add the cert to the user's plan.
 */
export function AddCertButton({
  certId,
  price,
}: {
  certId: string;
  price: string;
}) {
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    track("checkout_started", { interval: "cert_addon" });
    try {
      const { url } = await api(addCertCheckout, { certId });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={start} disabled={busy} className="shrink-0">
      {busy ? <Loader2 className="animate-spin" /> : <Plus />}
      Add · {price}
    </Button>
  );
}
