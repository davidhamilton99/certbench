import { defineConfig } from "@playwright/test";

/**
 * E2E smoke suite. Runs against a local dev server by default; set
 * E2E_BASE_URL (plus VERCEL_AUTOMATION_BYPASS_SECRET for protected previews)
 * to target a deployment.
 *
 * Specs create dedicated accounts (david.nash.hamilton+e2e-*@gmail.com) and
 * global teardown deletes them via the service role.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass":
            process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
        }
      : {},
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
