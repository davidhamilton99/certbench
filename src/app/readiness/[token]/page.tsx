import Link from "next/link";
import type { Metadata } from "next";
import { verifyShare } from "@/server/share/readiness-token";
import { CARD, readinessBand, truncate } from "@/lib/share/card";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const payload = verifyShare(token);
  // One person's shared score: for the people they send it to, not for search.
  const robots = { index: false, follow: true };
  if (!payload) {
    return {
      title: "Exam readiness",
      description: "Measure your CompTIA exam readiness on CertBench.",
      robots,
    };
  }
  const score = Math.round(payload.s);
  const title = `${payload.n} is ${score}% ready for ${payload.c}`;
  const description = `This readiness score was measured on CertBench. You can measure your own ${payload.c} readiness in about 20 minutes.`;
  // The colocated opengraph-image is injected automatically; twitter card set
  // so X uses the large image too.
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    robots,
  };
}

export default async function ReadinessSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = verifyShare(token);

  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      {/* The page's one main region, where the "Skip to main content" link leads. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 py-12 outline-none sm:px-6 sm:py-16"
      >
        {payload ? (
          <ReadinessCard payload={payload} />
        ) : (
          <p className="cb-measure-xs text-center text-body text-muted-foreground">
            This readiness card is not available, but you can measure your own in about 20 minutes.
          </p>
        )}

        <section className="mt-10 grid w-full justify-items-center gap-4 text-center">
          <h1 className="cb-title">How ready are you?</h1>
          <p className="cb-measure-xs text-body text-muted-foreground">
            CertBench covers every objective of your CompTIA exam in short steps, and a readiness checkpoint then
            shows where you stand.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/start">
              Start the study path for your exam
              <LinkArrow />
            </Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/**
 * The shared score, as the link's preview image shows it. It is drawn in the
 * fixed paper and ink of that image (`CARD`), not in the theme's colours, so
 * the page shows the same card in the light theme and in the dark one. Every
 * bar repeats a figure that is printed beside it, so the bars are hidden from
 * a screen reader.
 */
function ReadinessCard({
  payload,
}: {
  payload: NonNullable<ReturnType<typeof verifyShare>>;
}) {
  const score = Math.max(0, Math.min(100, Math.round(payload.s)));
  const band = readinessBand(score);
  const domains = payload.d.slice(0, 5);

  return (
    <div
      className="w-full overflow-hidden rounded-lg"
      style={{ background: CARD.bg, border: `1px solid ${CARD.border}` }}
    >
      <div className="flex flex-col gap-8 p-6 sm:flex-row sm:p-10">
        {/* Score */}
        <div className="flex flex-col sm:w-1/2">
          <p className="cb-display flex items-baseline text-[5.5rem]" style={{ color: band.color }}>
            {score}
            <span className="text-[2.5rem]">%</span>
          </p>
          <p className="mt-2 text-lede font-medium" style={{ color: band.color }}>
            {band.label}
            {payload.p === 1 ? " (preliminary)" : ""}
          </p>
          <p className="mt-4 text-lede font-semibold" style={{ color: CARD.text }}>
            {truncate(payload.c, 40)}
          </p>
          <p className="mt-1 text-small" style={{ color: CARD.muted }}>
            {truncate(payload.n, 28)}, {payload.x}
          </p>
          <div aria-hidden className="mt-6 h-2.5 w-full overflow-hidden rounded-xs" style={{ background: CARD.track }}>
            <div className="h-full" style={{ width: `${score}%`, background: band.color }} />
          </div>
        </div>

        {/* Domain breakdown */}
        {domains.length > 0 && (
          <div
            className="flex flex-1 flex-col gap-3.5 rounded-md p-6"
            style={{ background: CARD.panel, border: `1px solid ${CARD.border}` }}
          >
            <p id="readiness-domains" className="cb-label" style={{ color: CARD.muted }}>
              Domain breakdown
            </p>
            <ul aria-labelledby="readiness-domains" className="grid gap-3.5">
              {domains.map(([label, dScore], i) => {
                const s = Math.max(0, Math.min(100, Math.round(dScore)));
                return (
                  <li key={i} className="grid gap-1.5">
                    {/* The name has the row's whole width and wraps: it is never cut short,
                        because it says which domain the bar under it belongs to. */}
                    <span className="flex items-baseline justify-between gap-3 text-small" style={{ color: CARD.sub }}>
                      <span className="min-w-0">{label}</span>
                      <span className="shrink-0">{s}%</span>
                    </span>
                    <span
                      aria-hidden
                      className="block h-1.5 w-full overflow-hidden rounded-xs"
                      style={{ background: CARD.track }}
                    >
                      <span className="block h-full" style={{ width: `${s}%`, background: readinessBand(s).color }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
