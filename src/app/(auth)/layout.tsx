import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Dark instrument identity, matching the workspace — the entry into the app.
    <div className="dark relative flex min-h-svh flex-col overflow-hidden bg-background px-4 pb-10 pt-8 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      {/* Wordmark anchored top-centre like a header; content centres in the
          space below so tall pages (register's rail) don't push it adrift. */}
      <Link
        href="/"
        className="relative mx-auto flex items-center gap-2 font-display text-xl font-semibold tracking-tight"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-bold text-primary-foreground">
          CB
        </span>
        CertBench
      </Link>
      {/* Pages own their width so register can widen for its value rail. */}
      <div className="relative flex w-full flex-1 items-center justify-center py-8">
        {children}
      </div>
    </div>
  );
}
