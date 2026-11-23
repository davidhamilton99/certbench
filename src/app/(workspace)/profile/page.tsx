import { redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { pageCertifications, pageEnrollments, pageProfile } from "@/server/page-reads";
import {
  ProfileSettings,
  type AvailableCert,
  type ProfileEnrollment,
} from "@/components/workspace/ProfileSettings";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const { db, user } = await requireProPage();

  const [profile, enrollments, certifications] = await Promise.all([
    pageProfile(db, user.id),
    pageEnrollments(db, user.id),
    pageCertifications(db),
  ]);
  if (!profile) redirect("/onboarding");

  const certById = new Map(certifications.map((c) => [c.id, c]));
  const rows: ProfileEnrollment[] = enrollments.flatMap((e) => {
    const cert = certById.get(e.certificationId);
    return cert
      ? [
          {
            certId: cert.id,
            certName: cert.name,
            examCode: cert.examCode,
            examDate: e.examDate,
          },
        ]
      : [];
  });

  const enrolledIds = new Set(enrollments.map((e) => e.certificationId));
  const availableCerts: AvailableCert[] = certifications
    .filter((c) => !enrolledIds.has(c.id))
    .map((c) => ({ certId: c.id, certName: c.name, examCode: c.examCode }));

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <h1 className="cb-subsection">Profile</h1>
      <ProfileSettings
        initialDisplayName={profile.displayName}
        email={user.email ?? ""}
        enrollments={rows}
        availableCerts={availableCerts}
      />
    </div>
  );
}
