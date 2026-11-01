import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { JsonLd } from "@/components/seo/JsonLd";
import "./globals.css";

// Sitewide entity graph — helps search + generative engines recognise
// "CertBench" as a brand they can name and cite, not just a set of pages.
const SITE_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://certbench.dev/#org",
      name: "CertBench",
      url: "https://certbench.dev",
      logo: "https://certbench.dev/icon-512.png",
      description:
        "Guided CompTIA exam prep — every exam objective as a path of short, interactive stops, with a readiness checkpoint, for Security+, Network+, and A+.",
    },
    {
      "@type": "WebSite",
      "@id": "https://certbench.dev/#website",
      name: "CertBench",
      url: "https://certbench.dev",
      publisher: { "@id": "https://certbench.dev/#org" },
    },
  ],
};

// Fonts are self-hosted (src/app/fonts: the Latin subset of each family's
// variable font, SIL Open Font License). Fetching them from Google at build
// time made production builds fail whenever Google served its newer font URL
// format, which Next's Turbopack font loader can't parse.
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  weight: "400 600",
  variable: "--font-jetbrains-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  adjustFontFallback: false,
});

// Display face for CertBench 2.0 — a characterful grotesque used for headline
// and instrument moments, paired with Inter for body and JetBrains Mono for data.
const bricolage = localFont({
  src: "./fonts/bricolage-grotesque-latin.woff2",
  weight: "500 700",
  variable: "--font-bricolage",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "CertBench — Pass your CompTIA exam one short step at a time",
    template: "%s — CertBench",
  },
  description:
    "Pick your CompTIA exam and CertBench guides you through every objective in short, interactive stops, with a readiness checkpoint that shows where you stand. Security+, Network+, and A+.",
  keywords: [
    "CompTIA Security+",
    "CompTIA Network+",
    "CompTIA A+",
    "certification prep",
    "practice exams",
    "spaced repetition",
    "study plan",
    "IT certification",
  ],
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "CertBench — Pass your CompTIA exam one short step at a time",
    description:
      "Every exam objective as a path of short, interactive stops, with a readiness checkpoint that shows where you stand.",
    url: "https://certbench.dev",
    siteName: "CertBench",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CertBench — Pass your CompTIA exam one short step at a time",
    description:
      "Every exam objective as a path of short, interactive stops, with a readiness checkpoint that shows where you stand.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL("https://certbench.dev"),
  // Self-referencing canonical per route ("./" resolves against the current
  // path). Declares certbench.dev authoritative even when the same content is
  // served from certbench.vercel.app.
  alternates: {
    canonical: "./",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <body>
        <JsonLd data={SITE_JSONLD} />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        {/* The previous app registered a service worker (/sw.js). Unregister it
            so stale caches can never serve the old UI after cutover. */}
        <Script id="sw-unregister" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations()
              .then((rs) => rs.forEach((r) => r.unregister()))
              .catch(() => {});
          }`}
        </Script>
        {/* PostHog loads once, through our /ingest proxy (next.config), and
            records every session: 100% sampling here overrides the project
            setting, and starting on load skips any flag or trigger. Pageviews
            count in-app navigation too, not just full page loads; heatmaps
            and dead clicks (clicks that change nothing) are on. */}
        {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
          <Script id="posthog-init" strategy="afterInteractive">
            {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}',{api_host:'/ingest',ui_host:'https://us.posthog.com',person_profiles:'identified_only',capture_pageview:'history_change',capture_heatmaps:true,capture_dead_clicks:true,session_recording:{sampleRate:1},loaded:function(ph){ph.startSessionRecording(true)}})`}
          </Script>
        )}
      </body>
    </html>
  );
}
