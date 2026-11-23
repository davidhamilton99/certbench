import { defineEndpoint } from "@/server/api/define-endpoint";
import { submitTestimonial } from "@/contracts/testimonials";
import { insertTestimonial, replaceWithPassStory } from "@/server/data/testimonials";
import { createAdminClient } from "@/server/supabase/admin";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(submitTestimonial, {
  auth: "user",
  rateLimit: { limit: 5, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    try {
      await insertTestimonial(db, user.id, {
        certId: input.certId,
        passed: input.passed,
        quote: input.quote,
        displayName: input.displayName,
      });
    } catch (err) {
      // One row for an account and an exam. A pass story takes the place of
      // the account's own "did not pass" comment, or of its comment still
      // waiting for review, as it does from the post-exam link. The table has
      // no update policy for accounts, so the change is made with the service
      // client, on this account's row only.
      const replaced =
        err instanceof ApiError && err.code === "conflict" && input.passed && input.certId
          ? await replaceWithPassStory(createAdminClient(), user.id, {
              certId: input.certId,
              quote: input.quote,
              displayName: input.displayName,
            })
          : false;
      if (!replaced) throw err;
    }
    return { submitted: true };
  },
});
