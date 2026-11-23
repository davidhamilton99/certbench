import { notFound } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { pageProfile } from "@/server/page-reads";
import { listPendingFlags } from "@/server/data/flags";
import { AdminFlagsList } from "@/components/workspace/AdminFlagsList";

export const metadata = {
  title: "Reported questions",
};

export default async function AdminFlagsPage() {
  // The owner's account passes the Pro check; the role is then checked here.
  const { db, user } = await requireProPage();

  const profile = await pageProfile(db, user.id);
  if (profile?.role !== "admin") notFound();

  const flags = await listPendingFlags(db);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Reported questions</h1>
        <p className="text-small text-muted-foreground">
          {flags.length === 1 ? "1 report is" : `${flags.length} reports are`} waiting for review.
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
