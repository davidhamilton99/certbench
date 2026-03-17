import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheatSheets } from "@/components/workspace/CheatSheets";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export const metadata = {
  title: "Review — CertBench",
};

export default async function CheatSheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const certSlug = params.cert;

  if (!certSlug) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
            Review
          </h1>
          <p className="text-[14px] text-text-secondary mt-1">
            Personalised quick-reference notes based on your weakest areas.
          </p>
        </div>
        <Card padding="lg">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[16px] font-semibold text-text-primary">
                No certification selected
              </p>
              <p className="text-[14px] text-text-secondary mt-1">
                Select a certification from the sidebar to view your review notes.
              </p>
            </div>
            <Link href="/add-certification">
              <Button>Add Certification</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Domain Review
        </h1>
        <p className="text-[14px] text-text-secondary mt-1">
          Quick-reference notes sorted by your weakest areas. Review before your exam.
        </p>
      </div>

      <CheatSheets certSlug={certSlug} />
    </div>
  );
}
