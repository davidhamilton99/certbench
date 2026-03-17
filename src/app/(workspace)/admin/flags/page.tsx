import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminFlagsList } from "@/components/workspace/AdminFlagsList";

export const metadata = {
  title: "Question Flags — CertBench Admin",
};

export default async function AdminFlagsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight">
          Question Flags
        </h1>
        <p className="text-[14px] text-text-secondary mt-1">
          User-reported issues with certification questions.
        </p>
      </div>

      <AdminFlagsList />
    </div>
  );
}
