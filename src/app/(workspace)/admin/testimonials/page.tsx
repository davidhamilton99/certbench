import { notFound } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { createAdminClient } from "@/server/supabase/admin";
import { getProfile } from "@/server/data/profiles";
import { listPendingTestimonials } from "@/server/data/testimonials";
import { AdminTestimonialsList } from "@/components/workspace/AdminTestimonialsList";

export const metadata = {
  title: "Testimonials for review",
};

export default async function AdminTestimonialsPage() {
  // The owner's account passes the Pro check; the role is then checked here.
  const { db, user } = await requireProPage();

  const profile = await getProfile(db, user.id);
  if (profile?.role !== "admin") notFound();

  // Only after the role check: the queue is read with the service client,
  // because an account may read approved stories and its own, and no others
  // (migration 022). Read with the signed-in client, the queue was always empty.
  const pending = await listPendingTestimonials(createAdminClient());

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Testimonials for review</h1>
        <p className="text-small text-muted-foreground">
          {pending.length === 1 ? "1 testimonial is" : `${pending.length} testimonials are`} waiting for review.
        </p>
      </div>
      <AdminTestimonialsList
        items={pending.map((t) => ({
          id: t.id,
          quote: t.quote,
          displayName: t.displayName,
          certName: t.certName,
        }))}
      />
    </div>
  );
}
