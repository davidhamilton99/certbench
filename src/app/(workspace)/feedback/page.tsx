import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getProfile } from "@/server/data/profiles";
import { listEnrollments } from "@/server/data/enrollments";
import { listActiveCertifications } from "@/server/data/certifications";
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
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const [profile, enrollments, certifications] = await Promise.all([
    getProfile(db, user.id),
    listEnrollments(db, user.id),
    listActiveCertifications(db),
  ]);

  const certById = new Map(certifications.map((c) => [c.id, c]));
  const options = enrollments.flatMap((e) => {
    const cert = certById.get(e.certificationId);
    return cert ? [{ certId: cert.id, certName: cert.name }] : [];
  });

  return (
    <div className="mx-auto grid w-full max-w-lg gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          How did your exam go?
        </h1>
        <p className="text-sm text-muted-foreground">
          We&apos;d love to hear how it went — and if you passed, your story
          helps the next person decide to start.
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
