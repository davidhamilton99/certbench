import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getUserPlan } from "@/server/services/subscription";
import { CreateSetClient } from "@/components/workspace/CreateSetClient";

export const metadata = {
  title: "New study set",
};

export default async function NewStudySetPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const plan = await getUserPlan(db, user.id);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New study set</h1>
        <p className="text-sm text-muted-foreground">
          Generate questions with AI, import from any chatbot, or write them by hand
        </p>
      </div>
      <CreateSetClient
        plan={plan.plan}
        generationsUsed={plan.generationsUsed}
        generationsLimit={plan.generationsLimit}
      />
    </div>
  );
}
