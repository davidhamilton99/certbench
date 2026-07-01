import { defineEndpoint } from "@/server/api/define-endpoint";
import { health } from "@/contracts/health";
import { listActiveCertifications } from "@/server/data/certifications";

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
    };
  },
});
