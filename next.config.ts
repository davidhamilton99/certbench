import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Old-app URLs that no longer exist after the rebuild.
  redirects: async () => [
    { source: "/add-certification", destination: "/profile", permanent: true },
    {
      source: "/study-materials/import",
      destination: "/study-materials/new",
      permanent: true,
    },
    {
      source: "/certifications/:certId",
      destination: "/dashboard",
      permanent: false,
    },
    { source: "/offline", destination: "/", permanent: true },
  ],
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
    {
      // Defense-in-depth headers on every response. Deliberately does NOT
      // set a script/style CSP: the app relies on inline scripts (PostHog
      // init, theme bootstrap, JSON-LD) and third-party origins (Stripe,
      // Supabase, Sentry) that a strict policy would break without nonces.
      // The CSP here is limited to the directives that are safe to enforce
      // globally and add real value — anti-clickjacking, anti-base-tag
      // injection, and blocking plugin/object embeds.
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
        },
        // Legacy equivalent of frame-ancestors for older browsers.
        { key: "X-Frame-Options", value: "DENY" },
        // Stop MIME sniffing (drive-by content-type confusion).
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Don't leak full URLs (which can carry tokens) to other origins.
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        // Deny powerful features the app never uses.
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
        },
        // Force HTTPS for two years, including subdomains (Vercel also sets
        // this on the apex; explicit here so it's part of the codebase).
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ],
};

// Only wrap with Sentry in builds where it's configured. Keeps local/dev
// builds fast and avoids source-map upload warnings when env vars are unset.
const sentryEnabled = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig;
