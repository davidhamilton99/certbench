"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { createCheckout, createPortal } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";

export function UpgradeButton() {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const { url } = await api(createCheckout, {});
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }
  return (
    <Button size="lg" onClick={go} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
      Upgrade to Pro
    </Button>
  );
}

export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const { url } = await api(createPortal, {});
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" onClick={go} disabled={busy}>
      {busy && <Loader2 className="animate-spin" />}
      Manage billing
    </Button>
  );
}
