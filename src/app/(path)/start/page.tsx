import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/server/auth";
import { listEnrollments } from "@/server/data/enrollments";
import { listActiveCertifications } from "@/server/data/certifications";
import { isPathCert } from "@/core/path/types";
import { ExamPicker } from "@/components/path/ExamPicker";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";
import { pageMetadata } from "@/lib/seo/metadata";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = pageMetadata({
  title: "Pick your exam",
  description: "Choose your CompTIA exam and start studying it one short step at a time.",
  path: "/start",
  noindex: true,
});

/**
 * Where "Start free" leads, and where a signed-in account without Pro lands.
 * Someone already enrolled in an exam goes straight to that path, unless they
 * came here to switch (`?pick=1`). Paying from anywhere but a path lands here
 * too (`?upgraded=1`), and goes on to their path, which opens with the unlock.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ pick?: string; upgraded?: string }>;
}) {
  const { pick, upgraded } = await searchParams;
  const paid = upgraded === "1";
  if (!pick) {
    const { db, user } = await getOptionalUser();
    if (user) {
      const [enrollments, certs] = await Promise.all([
        listEnrollments(db, user.id).catch(() => []),
        listActiveCertifications(db).catch(() => []),
      ]);
      const slug = certs.find((c) => c.id === enrollments[0]?.certificationId)?.slug;
      if (slug && isPathCert(slug)) redirect(`/path/${slug}${paid ? "?upgraded=1" : ""}`);
    }
  }

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <header className="glass-nav sticky top-0 z-40">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-2xl flex-1 content-start gap-10 px-4 pb-20 pt-14 sm:px-6 sm:pt-24">
        <div className="grid gap-4 text-center">
          {paid && (
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Payment received</span>
          )}
          <h1 className="cb-display text-balance text-[2.5rem] sm:text-6xl">
            {paid ? "Which exam is Pro for?" : "Which exam are you taking?"}
          </h1>
          <p className="mx-auto max-w-md text-balance text-lg text-muted-foreground">
            {paid
              ? "Pick it and its whole path opens: every stop, every lab and the timed rehearsal."
              : "That's the only choice you make. From here, every step is laid out for you."}
          </p>
        </div>
        <ExamPicker surface="start" upgraded={paid} />
      </main>
    </div>
  );
}
