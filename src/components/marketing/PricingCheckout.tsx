"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

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
      } else if (data.error === "Unauthorized") {
        window.location.href = "/login";
      } else {
        setError(data.error || "Checkout is not available right now. Please try again later.");
      }
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <p className="text-[13px] text-red-600 mb-2">{error}</p>
      )}
      <Button size="lg" className="w-full" onClick={handleCheckout} loading={loading}>
        Upgrade to Pro
      </Button>
    </div>
  );
}
