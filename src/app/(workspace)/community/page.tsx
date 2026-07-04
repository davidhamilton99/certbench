import Link from "next/link";
import { redirect } from "next/navigation";
import { Play, Search } from "lucide-react";
import { createClient } from "@/server/supabase/server";
import { listPublicSets } from "@/server/data/community";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Community",
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const sets = await listPublicSets(db, q?.trim() || null);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Community</h1>
        <p className="text-sm text-muted-foreground">
          Public study sets shared by other learners
        </p>
      </div>

      <form className="flex max-w-md gap-2" action="/community">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search sets…" />
        <Button type="submit" variant="secondary" size="icon" aria-label="Search">
          <Search />
        </Button>
      </form>

      {sets.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {q ? "No sets match that search." : "No public sets yet — be the first to share one."}
        </p>
      ) : (
        <div className="grid gap-3">
          {sets.map((set) => (
            <Link key={set.id} href={`/community/${set.id}`} className="group">
              <Card className="py-4 transition-colors group-hover:bg-accent/40">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="grid gap-0.5">
                    <span className="font-medium">{set.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {set.questionCount} questions
                      {set.category && <> · {set.category}</>}
                      {set.attemptCount > 0 && <> · played {set.attemptCount}×</>}
                    </span>
                  </div>
                  <Play className="size-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
