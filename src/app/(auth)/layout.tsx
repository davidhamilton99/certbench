import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <Link href="/" className="text-xl font-semibold tracking-tight">
        CertBench
      </Link>
      {/* Pages own their width so register can widen for its value rail. */}
      <div className="w-full">{children}</div>
    </div>
  );
}
