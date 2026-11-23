import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/server/auth";
import { listEnrollments } from "@/server/data/enrollments";
import { listActiveCertifications } from "@/server/data/certifications";
import { isPathCert } from "@/core/path/types";
import { ExamPicker } from "@/components/path/ExamPicker";
import { pageMetadata } from "@/lib/seo/metadata";
import { START_COLUMN, StartHeader, StartLead } from "./lead";

export const metadata: Metadata = pageMetadata({
  title: "Choose your exam",
  description: "Choose your CompTIA exam to begin its study path.",
  path: "/start",
  noindex: true,
});

/**
 * Where "Start for free" leads, and where a signed-in account without Pro
 * lands. Someone already enrolled in an exam goes straight to that study path,
 * unless they came here to change exam (`?pick=1`). Paying from anywhere but a
 * study path lands here too (`?upgraded=1`), and goes on to their study path,
 * which opens with what Pro opened.
 *
 * This page has no loading.tsx, and must not be given one. It is every
 * member's home, and for a member it answers with `redirect()`. With a loading
 * file beside it the server sends its first bytes, with status 200, before the
 * page has decided, so on a full page load the redirect can no longer be an
 * HTTP redirect: the member is sent a page that says it is loading and is then
 * moved on by a script. Without one, the server answers a member with the
 * redirect itself, and a visitor with the list of exams in the page's own HTML.
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
      <StartHeader />
      <main id="main-content" tabIndex={-1} className={START_COLUMN}>
        <StartLead paid={paid} />
        <ExamPicker surface="start" upgraded={paid} />
      </main>
    </div>
  );
}
