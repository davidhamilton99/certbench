import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";

// Sign-in and account screens: nothing here should answer a search.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Dark instrument identity, matching the workspace — the entry into the app.
    <div className="relative flex min-h-svh flex-col overflow-hidden aurora-bg px-4 pb-10 pt-8 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[28rem] w-[56rem] max-w-[200%] -translate-x-1/2 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_12%,transparent),transparent)]"
      />
      {/* Wordmark anchored top-centre like a header; content centres in the
          space below so tall pages (register's rail) don't push it adrift. */}
      <Logo className="relative mx-auto" />
      {/* Pages own their width so register can widen for its value rail. */}
      <div className="relative flex w-full flex-1 items-center justify-center py-8">
        {children}
      </div>
    </div>
  );
}
