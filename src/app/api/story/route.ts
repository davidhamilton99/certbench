import { defineEndpoint } from "@/server/api/define-endpoint";
import { submitStory } from "@/contracts/story";
import { ApiError } from "@/contracts/common";
import { verifyStoryToken } from "@/server/story/story-token";
import { insertTestimonial } from "@/server/data/testimonials";
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
      throw new ApiError("validation_failed", "Tell us a little more: a sentence or two.");
    }
    if (quote.length >= MIN_STORY) {
      await insertTestimonial(createAdminClient(), claim.userId, {
        certId: claim.certId,
        passed: input.passed,
        quote,
        displayName: input.displayName,
      });
    }
    await captureServerEvent(claim.userId, "story_submitted", {
      passed: input.passed,
      with_story: quote.length >= MIN_STORY,
    });
    return { submitted: true };
  },
});
