"use client";

import dynamic from "next/dynamic";

/**
 * Loads the workspace's subnetting drill in the browser only. Its first
 * question is random, so a copy rendered on the server would never match the
 * one the browser makes. Without server rendering the drill can deal its first
 * question as it mounts.
 */
const LazyInner = dynamic(() => import("@/components/marketing/SubnettingDrill").then((m) => m.SubnettingDrill), {
  ssr: false,
  loading: () => (
    <p role="status" className="grid min-h-72 place-items-center rounded-lg border bg-card p-6 text-small text-muted-foreground">
      The drill is loading.
    </p>
  ),
});

export function SubnettingDrillLazy() {
  return <LazyInner />;
}
