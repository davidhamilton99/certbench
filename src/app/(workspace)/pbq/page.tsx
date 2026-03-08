import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PbqScenarios } from "@/components/workspace/PbqScenarios";
import { pbqRegistry } from "@/data/pbq";

export default async function PbqPage({
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
          PBQ Scenarios
        </h1>
        <p className="text-[15px] text-text-secondary">
          Select a certification from the sidebar to access performance-based
          question scenarios.
        </p>
      </div>
    );
  }

  const scenarios = pbqRegistry[certSlug] || [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Performance-Based Questions
        </h1>
        <p className="text-[15px] text-text-secondary mt-1">
          Practice interactive scenarios that mirror the hands-on questions
          found on the actual exam.
        </p>
      </div>

      <PbqScenarios scenarios={scenarios} certSlug={certSlug} />
    </div>
  );
}
