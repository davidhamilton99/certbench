import Link from "next/link";
import { requireProPage } from "@/server/auth";
import { listPublicSets } from "@/server/data/community";
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
  const { db } = await requireProPage();

  const query = q?.trim() || null;
  const sets = await listPublicSets(db, query);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Community</h1>
        <p className="text-small text-muted-foreground">
          These are the study sets that other members have made public.
        </p>
      </div>

      <form role="search" className="grid max-w-md gap-1.5" action="/community">
        <label htmlFor="community-search" className="text-small font-medium">
          Search the study sets
        </label>
        <div className="flex gap-2">
          <Input id="community-search" name="q" type="search" defaultValue={q ?? ""} />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </div>
      </form>

      {sets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input p-8 text-small text-muted-foreground">
          {query ? "No study sets match that search." : "No study sets have been made public yet."}
        </p>
      ) : (
        <ul className="glass divide-y divide-border overflow-hidden rounded-lg">
          {sets.map((set) => (
            <li key={set.id}>
              <Link
                href={`/community/${set.id}`}
                className="grid gap-0.5 px-5 py-4 transition-colors hover:bg-tint-hover focus-visible:-outline-offset-2"
              >
                <span className="font-medium">{set.title}</span>
                <span className="text-small text-muted-foreground">
                  {set.questionCount} {set.questionCount === 1 ? "question" : "questions"}
                  {set.category && <>, {set.category}</>}
                  {set.attemptCount > 0 && (
                    <>
                      , opened {set.attemptCount} {set.attemptCount === 1 ? "time" : "times"}
                    </>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
