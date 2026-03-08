import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CheatSheets } from "@/components/workspace/CheatSheets";

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
      <div className="flex flex-col gap-4">
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Cheat Sheets
        </h1>
        <p className="text-[15px] text-text-secondary">
          Select a certification from the sidebar to view your personalised
          cheat sheets.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Domain Cheat Sheets
        </h1>
        <p className="text-[15px] text-text-secondary mt-1">
          Personalised study notes based on your weakest areas.
        </p>
      </div>

      <CheatSheets certSlug={certSlug} />
    </div>
  );
}
