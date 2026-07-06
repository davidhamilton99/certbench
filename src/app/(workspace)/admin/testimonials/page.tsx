import { notFound, redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getProfile } from "@/server/data/profiles";
import { listPendingTestimonials } from "@/server/data/testimonials";
import { AdminTestimonialsList } from "@/components/workspace/AdminTestimonialsList";

export const metadata = {
  title: "Testimonial queue",
};

export default async function AdminTestimonialsPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(db, user.id);
  if (profile?.role !== "admin") notFound();

  const pending = await listPendingTestimonials(db);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Testimonials</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} pending review
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
