import Link from "next/link";
import { requireProPage } from "@/server/auth";
import { listMyStudySets } from "@/server/data/study-sets";

export const metadata = {
  title: "Study sets",
};

export default async function StudyMaterialsPage() {
  const { db, user } = await requireProPage();

  const sets = await listMyStudySets(db, user.id);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Study sets</h1>
        <p className="text-small text-muted-foreground">
          These are the study sets in your account. You can practice, edit or share each one.
        </p>
      </div>

      {sets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input p-8 text-small text-muted-foreground">
          You do not have any study sets.
        </p>
      ) : (
        <ul className="glass divide-y divide-border overflow-hidden rounded-lg">
          {sets.map((set) => (
            <li key={set.id}>
              <Link
                href={`/study-materials/${set.id}`}
                className="grid gap-0.5 px-5 py-4 transition-colors hover:bg-tint-hover focus-visible:-outline-offset-2"
              >
                <span className="font-medium">{set.title}</span>
                <span className="text-small text-muted-foreground">
                  {set.questionCount} {set.questionCount === 1 ? "question" : "questions"}
                  {set.category && <>, {set.category}</>}, {set.isPublic ? "public" : "private"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
