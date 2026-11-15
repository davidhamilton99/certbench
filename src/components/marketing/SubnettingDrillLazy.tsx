"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper for the workspace's subnetting drill: its first question
 * is random, so it must not render on the server (SSR output would never
 * match hydration). ssr:false lets the drill create its first question in a
 * plain state initializer.
 */
const LazyInner = dynamic(
  () =>
    import("@/components/marketing/SubnettingDrill").then(
      (m) => m.SubnettingDrill
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-72 place-items-center rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading the drill…
      </div>
    ),
  }
);

export function SubnettingDrillLazy() {
  return <LazyInner />;
}
