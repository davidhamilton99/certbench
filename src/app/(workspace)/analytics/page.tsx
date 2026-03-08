import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PerformanceTimeline } from "@/components/workspace/PerformanceTimeline";

export default async function AnalyticsPage({
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
          Analytics
        </h1>
        <p className="text-[15px] text-text-secondary">
          Select a certification from the sidebar to view your performance
          analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Performance Analytics
        </h1>
        <p className="text-[15px] text-text-secondary mt-1">
          Track your readiness score and domain progress over time.
        </p>
      </div>

      <PerformanceTimeline certSlug={certSlug} />
    </div>
  );
}
