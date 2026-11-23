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
  title: "Choose your exam",
  description: "Choose your CompTIA exam to begin its study path.",
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
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-2xl flex-1 content-start gap-10 px-4 pb-20 pt-14 outline-none sm:px-6 sm:pt-24"
      >
        <div className="grid gap-4">
          {paid && <span className="cb-label text-muted-foreground">Your payment has been received.</span>}
          <h1 className="cb-display text-balance text-[2.25rem] sm:text-[3rem]">
            {paid ? "Which exam is your Pro plan for?" : "Which exam are you preparing for?"}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            {paid
              ? "Choose the exam, and its whole study path will open. This includes every step, every hands-on lab and the timed practice exams."
              : "This is the only choice that you need to make. After this, each step is set out for you in order."}
          </p>
        </div>
        <ExamPicker surface="start" upgraded={paid} />
      </main>
    </div>
  );
}
