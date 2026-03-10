"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function PricingCheckout() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "Unauthorized") {
        // Not logged in — redirect to register
        window.location.href = "/register";
      }
    } catch {
      // Network error — fall back to register
      window.location.href = "/register";
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="lg" className="w-full" onClick={handleCheckout} loading={loading}>
      Upgrade to Pro
    </Button>
  );
}
