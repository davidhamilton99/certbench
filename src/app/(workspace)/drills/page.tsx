import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { listEnrollments } from "@/server/data/enrollments";
import { DrillsTabs } from "@/components/workspace/DrillsTabs";

export const metadata = {
  title: "Drills",
};

export default async function DrillsPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const enrollments = await listEnrollments(db, user.id);
  if (enrollments.length === 0) redirect("/onboarding");

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drills</h1>
        <p className="text-sm text-muted-foreground">
          Rapid-fire skill builders — speed comes from repetition, and these
          never run out of questions.
        </p>
      </div>
      <DrillsTabs />
    </div>
  );
}
