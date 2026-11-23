import { requireProPage } from "@/server/auth";
import { pageCertifications, pageEnrollments, pageProfile } from "@/server/page-reads";
import { FeedbackClient } from "@/components/workspace/FeedbackClient";

export const metadata = {
  title: "How did your exam go?",
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const { r } = await searchParams;
  const { db, user } = await requireProPage();

  const [profile, enrollments, certifications] = await Promise.all([
    pageProfile(db, user.id),
    pageEnrollments(db, user.id),
    pageCertifications(db),
  ]);

  const certById = new Map(certifications.map((c) => [c.id, c]));
  const options = enrollments.flatMap((e) => {
    const cert = certById.get(e.certificationId);
    return cert ? [{ certId: cert.id, certName: cert.name }] : [];
  });

  return (
    <div className="mx-auto grid w-full max-w-lg gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">How did your exam go?</h1>
        <p className="text-small text-muted-foreground">
          If you passed, you can write a few sentences about how you prepared, which may help another candidate
          decide to begin.
        </p>
      </div>
      <FeedbackClient
        options={options}
        defaultDisplayName={profile?.displayName ?? ""}
        initialPassed={r === "pass" ? true : r === "fail" ? false : null}
      />
    </div>
  );
}
