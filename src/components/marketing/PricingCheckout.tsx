"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PricingCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        window.location.href = "/register";
      } else {
        setError(
          data?.error?.message ||
            "Checkout is not available right now. Please try again later."
        );
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <Button size="lg" className="w-full" onClick={handleCheckout} disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        Upgrade to Pro
      </Button>
    </div>
  );
}
