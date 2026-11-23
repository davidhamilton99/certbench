import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
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
      email: "support@certbench.dev",
      description:
        "An independent study program for the CompTIA Security+, Network+ and A+ exams. The study path works through each exam topic by topic, in short, interactive steps, with a readiness checkpoint, hands-on labs and a full-length practice exam.",
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

// Fonts are self-hosted (src/app/fonts: the Latin subset of each family, SIL
// Open Font License). Fetching them from Google at build time made production
// builds fail whenever Google served its newer font URL format, which Next's
// Turbopack font loader can't parse.
//
// IBM Plex Sans is everything you read or press (one variable file: weight
// 100–700, width 85–100). STIX Two Text is the headings. Plex Mono is for
// ports, addresses and commands; most screens have none, so it loads when a
// page first uses it instead of being preloaded everywhere.
const plexSans = localFont({
  src: "./fonts/ibm-plex-sans-latin.woff2",
  weight: "100 700",
  variable: "--font-plex-sans",
  display: "swap",
});

const stix = localFont({
  src: "./fonts/stix-two-text-latin.woff2",
  weight: "400 700",
  variable: "--font-stix",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  adjustFontFallback: false,
});

// The browser's own bar takes the navy of the band at the top of every page,
// so on a phone the page begins at the very edge of the screen. No
// `viewport-fit: cover`: nothing here is drawn under a notch, and without it
// the browser keeps the page clear of one by itself.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0c2a55" },
    { media: "(prefers-color-scheme: dark)", color: "#0c2140" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "CertBench | Study program for CompTIA Security+, Network+ and A+",
    template: "%s | CertBench",
  },
  description:
    "CertBench is a study program for CompTIA Security+, Network+ and A+. It works through your exam topic by topic in short steps, with hands-on labs, a readiness checkpoint and a full-length timed practice exam. It is free to start.",
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
    title: "CertBench | Study program for CompTIA Security+, Network+ and A+",
    description:
      "The study path works through your exam topic by topic, in short, interactive steps, with a readiness checkpoint that shows where you stand.",
    url: "https://certbench.dev",
    siteName: "CertBench",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CertBench | Study program for CompTIA Security+, Network+ and A+",
    description:
      "The study path works through your exam topic by topic, in short, interactive steps, with a readiness checkpoint that shows where you stand.",
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
      className={`${plexSans.variable} ${stix.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* The first stop for a keyboard or a screen reader. Every page's main
            region carries this id (src/lib/seo/__tests__/main-landmark.test.ts). */}
        <a href="#main-content" className="cb-skip">
          Skip to main content
        </a>
        <JsonLd data={SITE_JSONLD} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
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
            count in-app navigation too, not just full page loads; heatmaps,
            dead clicks (clicks that change nothing) and web vitals are on.
            The links in an email carry a token for one person (to unsubscribe,
            or to send in a story): before an event leaves the browser, that
            token is taken out of the page address it records. */}
        {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
          <Script id="posthog-init" strategy="afterInteractive">
            {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}',{api_host:'/ingest',ui_host:'https://us.posthog.com',person_profiles:'identified_only',capture_pageview:'history_change',capture_heatmaps:true,capture_dead_clicks:true,capture_performance:{web_vitals:true},session_recording:{sampleRate:1},before_send:function(e){try{var p=e&&e.properties;if(p){var ks=['$current_url','$referrer','$initial_current_url'];for(var i=0;i<ks.length;i++){var v=p[ks[i]];if(typeof v==='string'&&(v.indexOf('/unsubscribe')>-1||v.indexOf('/story')>-1)){var u=new URL(v,location.origin);if(u.searchParams.has('token'))u.searchParams.set('token','redacted');if(u.searchParams.has('t'))u.searchParams.set('t','redacted');p[ks[i]]=u.toString()}}}}catch(x){}return e},loaded:function(ph){ph.startSessionRecording(true)}})`}
          </Script>
        )}
      </body>
    </html>
  );
}
