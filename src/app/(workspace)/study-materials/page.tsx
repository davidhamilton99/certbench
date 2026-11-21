import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe, Lock } from "lucide-react";
import { createClient } from "@/server/supabase/server";
import { listMyStudySets } from "@/server/data/study-sets";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Study sets",
};

export default async function StudyMaterialsPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const sets = await listMyStudySets(db, user.id);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Study sets</h1>
        <p className="text-sm text-muted-foreground">
          The sets you’ve made. Practise, edit or share them.
        </p>
      </div>

      {sets.length === 0 ? (
        <div className="grid gap-4 rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">You don’t have any study sets.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sets.map((set) => (
            <Link key={set.id} href={`/study-materials/${set.id}`} className="group">
              <Card className="py-4 transition-colors group-hover:bg-accent/40">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="grid gap-0.5">
                    <span className="font-medium">{set.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {set.questionCount} question
                      {set.questionCount === 1 ? "" : "s"}
                      {set.category && <> · {set.category}</>}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {set.isPublic ? (
                      <>
                        <Globe className="size-3.5" /> public
                      </>
                    ) : (
                      <>
                        <Lock className="size-3.5" /> private
                      </>
                    )}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
