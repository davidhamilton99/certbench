import { defineEndpoint } from "@/server/api/define-endpoint";
import { submitStory } from "@/contracts/story";
import { ApiError } from "@/contracts/common";
import { verifyStoryToken } from "@/server/story/story-token";
import { insertTestimonial, replaceWithPassStory } from "@/server/data/testimonials";
import { createAdminClient } from "@/server/supabase/admin";
import { captureServerEvent } from "@/server/analytics";

/** Shortest story the testimonials table accepts. */
const MIN_STORY = 10;

/**
 * A post-exam story from the email's signed link. The token, not a session,
 * says whose it is, so the row is written with the service role; it still
 * lands as pending and goes through the admin's approval like any other.
 */
export const POST = defineEndpoint(submitStory, {
  auth: "public",
  rateLimit: { limit: 10, windowSeconds: 3600 },
  handler: async ({ input }) => {
    const claim = verifyStoryToken(input.token);
    if (!claim) throw new ApiError("unauthorized", "This link has expired.");

    const quote = input.quote.trim();
    if (input.passed && quote.length < MIN_STORY) {
      throw new ApiError("validation_failed", `Please write at least ${MIN_STORY} characters.`);
    }
    if (quote.length >= MIN_STORY) {
      const db = createAdminClient();
      try {
        await insertTestimonial(db, claim.userId, {
          certId: claim.certId,
          passed: input.passed,
          quote,
          displayName: input.displayName,
        });
      } catch (err) {
        // One row for an account and an exam. A pass story takes the place of
        // a "did not pass" comment, or of a comment still waiting for review;
        // otherwise the conflict stands.
        const replaced =
          err instanceof ApiError && err.code === "conflict" && input.passed
            ? await replaceWithPassStory(db, claim.userId, { certId: claim.certId, quote, displayName: input.displayName })
            : false;
        if (!replaced) throw err;
      }
    }
    await captureServerEvent(claim.userId, "story_submitted", {
      passed: input.passed,
      with_story: quote.length >= MIN_STORY,
    });
    return { submitted: true };
  },
});
