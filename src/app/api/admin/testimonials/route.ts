import { revalidatePath } from "next/cache";
import { defineEndpoint } from "@/server/api/define-endpoint";
import { moderateTestimonial } from "@/contracts/testimonials";
import { setTestimonialStatus } from "@/server/data/testimonials";
import { createAdminClient } from "@/server/supabase/admin";

/**
 * Approve or hide a testimonial from the moderation queue.
 *
 * The factory checks the admin role first (auth: "admin"). The change itself
 * is then made with the service client and not with the admin's own session:
 * the table has no update policy for accounts (migration 022), so with the
 * session's client an approval changed no row and still answered as done.
 */
export const POST = defineEndpoint(moderateTestimonial, {
  auth: "admin",
  handler: async ({ input }) => {
    await setTestimonialStatus(createAdminClient(), input.id, input.status);
    // The home page prints the approved testimonials and is otherwise rebuilt
    // on a timer. Rebuilding it now makes an approval, or a removal, show at once.
    revalidatePath("/");
    return { moderated: true };
  },
});
