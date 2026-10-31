import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/server/auth";
import { listEnrollments } from "@/server/data/enrollments";
import { listActiveCertifications } from "@/server/data/certifications";
import { isPathCert } from "@/core/path/types";
import { ExamPicker } from "@/components/path/ExamPicker";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";

export const metadata: Metadata = {
  title: "Pick your exam",
  description: "Choose your CompTIA exam and start studying it one short step at a time.",
  robots: { index: false, follow: true },
};

/**
 * Where "Get started" leads, and where a signed-in account without Pro lands.
 * Someone already enrolled in an exam goes straight to that path, unless they
 * came here to switch (`?pick=1`).
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ pick?: string }>;
}) {
  const { pick } = await searchParams;
  if (!pick) {
    const { db, user } = await getOptionalUser();
    if (user) {
      const [enrollments, certs] = await Promise.all([
        listEnrollments(db, user.id).catch(() => []),
        listActiveCertifications(db).catch(() => []),
      ]);
      const slug = certs.find((c) => c.id === enrollments[0]?.certificationId)?.slug;
      if (slug && isPathCert(slug)) redirect(`/path/${slug}`);
    }
  }

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <header className="glass-nav sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-bold text-primary-foreground">
              CB
            </span>
            CertBench
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-8 px-4 pb-20 pt-12 sm:px-6 sm:pt-20">
        <div className="grid gap-3 text-center">
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Which exam are you taking?
          </h1>
          <p className="text-balance text-muted-foreground">
            That&apos;s the only choice you make. From here, every step is laid out for you.
          </p>
        </div>
        <ExamPicker surface="start" />
      </main>
    </div>
  );
}
