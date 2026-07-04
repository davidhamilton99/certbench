import { notFound, redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getCertificationBySlug } from "@/server/data/certifications";
import { PracticeExamClient } from "@/components/quiz/PracticeExamClient";
import { examType as examTypeSchema } from "@/contracts/practice-exam";

export const metadata = {
  title: "Practice exam",
};

const HEADINGS = {
  full: { title: "Practice exam", sub: "questions across all domains" },
  weak_points: {
    title: "Weak points review",
    sub: "questions you've missed before",
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
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const parsedType = examTypeSchema.safeParse(type ?? "full");
  const mode = parsedType.success && parsedType.data !== "domain_drill"
    ? parsedType.data
    : "full";

  const cert = await getCertificationBySlug(db, slug);
  if (!cert) notFound();

  const heading = HEADINGS[mode];

  return (
    <div className="grid gap-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight">{heading.title}</h1>
        <p className="text-sm text-muted-foreground">
          {cert.name} · {heading.sub}
        </p>
      </div>
      <PracticeExamClient certId={cert.id} examType={mode} />
    </div>
  );
}
