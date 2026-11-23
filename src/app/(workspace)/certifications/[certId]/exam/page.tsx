import { notFound, redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { getCertificationBySlug } from "@/server/data/certifications";
import { canAccessCert } from "@/server/data/enrollments";
import { PracticeExamClient } from "@/components/quiz/PracticeExamClient";
import { examType as examTypeSchema } from "@/contracts/practice-exam";

export const metadata = {
  title: "Practice exam",
};

/** The page's title and the sentence under it, for each kind of set. */
const HEADINGS = {
  full: {
    title: "Practice exam",
    sub: (certName: string) => `The questions cover every domain of ${certName}.`,
  },
  weak_points: {
    title: "Weak points review",
    sub: (certName: string) => `These are ${certName} questions that you have answered incorrectly before.`,
  },
} as const;

export default async function PracticeExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ certId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ certId: slug }, { type }] = await Promise.all([params, searchParams]);
  const { db, user } = await requireProPage();

  const parsedType = examTypeSchema.safeParse(type ?? "full");
  const mode = parsedType.success && parsedType.data !== "domain_drill"
    ? parsedType.data
    : "full";

  const cert = await getCertificationBySlug(db, slug);
  if (!cert) notFound();
  if (!(await canAccessCert(db, user.id, cert.id))) {
    redirect(`/upgrade?reason=cert-locked&cert=${slug}`);
  }

  const heading = HEADINGS[mode];

  return (
    <div className="grid gap-6">
      <div className="mx-auto grid w-full max-w-2xl gap-1.5">
        <h1 className="cb-subsection">{heading.title}</h1>
        <p className="text-small text-muted-foreground">{heading.sub(cert.name)}</p>
      </div>
      <PracticeExamClient certId={cert.id} examType={mode} />
    </div>
  );
}
