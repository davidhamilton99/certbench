import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40 px-4 pb-10 pt-8">
      {/* Wordmark anchored top-centre like a header; content centres in the
          space below so tall pages (register's rail) don't push it adrift. */}
      <Link
        href="/"
        className="mx-auto text-xl font-semibold tracking-tight"
      >
        CertBench
      </Link>
      {/* Pages own their width so register can widen for its value rail. */}
      <div className="flex w-full flex-1 items-center justify-center py-8">
        {children}
      </div>
    </div>
  );
}
