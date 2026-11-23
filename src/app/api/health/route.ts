import { defineEndpoint } from "@/server/api/define-endpoint";
import { health } from "@/contracts/health";
import { settingFlags } from "@/server/api/settings";
import { listActiveCertifications } from "@/server/data/certifications";

/**
 * The health check: the sign-in check, the rate limit and a database read all
 * ran, and which settings this deployment has. The settings are answered as
 * true or false only, so that a missing key (no email, no daily job, no
 * payment confirmation) can be seen from outside without showing any value.
 */
export const GET = defineEndpoint(health, {
  auth: "public",
  rateLimit: { limit: 30, windowSeconds: 60 },
  handler: async ({ db, user }) => {
    const certifications = await listActiveCertifications(db);
    return {
      ok: true,
      time: new Date().toISOString(),
      certifications: certifications.length,
      authenticated: user !== null,
      settings: settingFlags(),
    };
  },
});
