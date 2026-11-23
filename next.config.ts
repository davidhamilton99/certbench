import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { aPlusV14Redirects } from "./src/data/a-plus-v15/redirects";

const nextConfig: NextConfig = {
  // Do not name the framework in a response header.
  poweredByHeader: false,
  // No page uses next/image, so the image optimizer endpoint (/_next/image)
  // is switched off. `unoptimized` does this where Next.js serves the
  // endpoint itself: `next start` answers 404. Vercel's build adapter for
  // Next.js 16 does not read `unoptimized` and keeps Vercel's own optimizer
  // on, so the empty list of local patterns also leaves that optimizer no
  // file in public/ to resize. (Next.js adds its static media folders to the
  // list, which hold only fonts and the favicon. No remote host is allowed.)
  images: { unoptimized: true, localPatterns: [] },
  // PostHog through our own domain, so ad blockers that block posthog.com
  // don't silently drop a visitor's events and session recording. Library,
  // recorder and remote config come from the assets host; the rest is the API.
  rewrites: async () => [
    { source: "/ingest/static/:path*", destination: "https://us-assets.i.posthog.com/static/:path*" },
    { source: "/ingest/array/:path*", destination: "https://us-assets.i.posthog.com/array/:path*" },
    { source: "/ingest/:path*", destination: "https://us.i.posthog.com/:path*" },
  ],
  // PostHog's API paths end in "/" (/e/, /s/, /flags/); Next's own
  // trailing-slash redirect would bounce them. src/proxy.ts redirects
  // trailing slashes for every other URL instead, so pages keep one URL.
  skipTrailingSlashRedirect: true,
  // Old-app URLs that no longer exist after the rebuild.
  redirects: async () => [
    { source: "/add-certification", destination: "/profile", permanent: true },
    {
      source: "/study-materials/import",
      destination: "/study-materials",
      permanent: true,
    },
    // The set maker (AI generation with it) was retired in Nov 2026; sets made with it stay.
    { source: "/study-materials/new", destination: "/study-materials", permanent: false },
    {
      source: "/certifications/:certId",
      destination: "/dashboard",
      permanent: false,
    },
    { source: "/offline", destination: "/", permanent: true },
    // A+ moved to 220-1201/1202: its old pages go to their V15 successors.
    ...aPlusV14Redirects(),
  ],
  headers: async () => [
    {
      // Fonts aren't pages, but Google fetches them while rendering and lists
      // them as "Crawled - currently not indexed", where they fail every
      // validation of that issue. noindex takes them out of it; Google still
      // uses them to render.
      source: "/_next/static/media/:font([^/]+\\.woff2)",
      headers: [{ key: "X-Robots-Tag", value: "noindex" }],
    },
    {
      // Defense-in-depth headers on every response. Deliberately does NOT
      // set a script/style CSP: the app relies on inline scripts (PostHog
      // init, theme bootstrap, JSON-LD) and third-party origins (Stripe,
      // Supabase, Sentry) that a strict policy would break without nonces.
      // The CSP here is limited to the directives that are safe to enforce
      // globally and add real value: anti-clickjacking, anti-base-tag
      // injection, blocking plugin/object embeds, and forms that may only be
      // sent to this site.
      //
      // form-action 'self' is safe because nothing here leaves the site by
      // posting a form. Google sign-in and the Stripe checkout and billing
      // portal are plain navigations (window.location), and they come back
      // with a GET. The two forms that a browser submits itself (the
      // unsubscribe page and the community search) go to this site and are
      // answered from it. A form that posts to another origin, or whose
      // answer redirects to one, would be blocked: use a navigation instead.
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
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
    })
  : nextConfig;
