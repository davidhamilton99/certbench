"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { createPortal } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";

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
