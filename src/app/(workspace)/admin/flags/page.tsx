import { notFound, redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getProfile } from "@/server/data/profiles";
import { listPendingFlags } from "@/server/data/flags";
import { AdminFlagsList } from "@/components/workspace/AdminFlagsList";

export const metadata = {
  title: "Flag queue",
};

export default async function AdminFlagsPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(db, user.id);
  if (profile?.role !== "admin") notFound();

  const flags = await listPendingFlags(db);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Flagged questions</h1>
        <p className="text-sm text-muted-foreground">
          {flags.length} pending report{flags.length === 1 ? "" : "s"}
        </p>
      </div>
      <AdminFlagsList
        flags={flags.map((f) => ({
          id: f.id,
          reason: f.reason,
          createdAt: f.createdAt,
          questionText: f.questionText,
        }))}
      />
    </div>
  );
}
