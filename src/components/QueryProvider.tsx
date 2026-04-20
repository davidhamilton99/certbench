"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * TanStack Query client provider.
 *
 * One client per browser session, created via useState so it survives
 * React Fast Refresh but isn't shared across server renders (which would
 * leak data between users).
 *
 * Defaults tuned for an SPA-ish workspace:
 *  - staleTime: 30s so tab-flips don't refetch instantly
 *  - gcTime: 5 min before an unused query is evicted
 *  - retry: 1 network retry (server errors rarely succeed on the next try)
 *  - refetchOnWindowFocus: false — too noisy for mutation-heavy screens
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
