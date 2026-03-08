import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReadinessReport } from "@/components/workspace/ReadinessReport";

export default async function ReadinessReportPage({
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
      <div className="flex flex-col gap-4">
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Readiness Report
        </h1>
        <p className="text-[15px] text-text-secondary">
          Select a certification from the sidebar to view your readiness report.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Exam Readiness Report
        </h1>
        <p className="text-[15px] text-text-secondary mt-1">
          Comprehensive analysis of your exam preparation status.
        </p>
      </div>

      <ReadinessReport certSlug={certSlug} />
    </div>
  );
}
