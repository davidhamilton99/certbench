import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { verifyShare } from "@/server/share/readiness-token";
import { CARD, readinessBand, truncate } from "@/lib/share/card";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const payload = verifyShare(token);
  if (!payload) {
    return {
      title: "Exam readiness — CertBench",
      description: "Get your free CompTIA exam readiness score on CertBench.",
    };
  }
  const score = Math.round(payload.s);
  const title = `${payload.n} is ${score}% ready for ${payload.c}`;
  const description = `Readiness measured on CertBench. Get your own free ${payload.c} readiness score in about 20 minutes.`;
  // The colocated opengraph-image is injected automatically; twitter card set
  // so X uses the large image too.
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
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
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-12 sm:py-16">
        {payload ? (
          <ReadinessCard payload={payload} />
        ) : (
          <p className="text-center text-muted-foreground">
            This readiness card isn&apos;t available — but you can measure your
            own in about 20 minutes.
          </p>
        )}

        <section className="mt-10 grid w-full justify-items-center gap-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            How ready are you?
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            CertBench measures your CompTIA exam readiness with a 25-question
            diagnostic, then builds a daily plan from your weak spots. Free — no
            credit card.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/register">
              Get your readiness score
              <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}

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
      className="w-full overflow-hidden rounded-2xl"
      style={{ background: CARD.bg, border: `1px solid ${CARD.border}` }}
    >
      <div className="flex flex-col gap-8 p-8 sm:flex-row sm:p-10">
        {/* Score */}
        <div className="flex flex-col sm:w-1/2">
          <div
            className="flex items-baseline font-semibold leading-none"
            style={{ color: band.color, fontSize: 88, letterSpacing: -2 }}
          >
            {score}
            <span style={{ fontSize: 40 }}>%</span>
          </div>
          <div className="mt-2 text-lg font-medium" style={{ color: band.color }}>
            {band.label}
            {payload.p === 1 ? " · preliminary" : ""}
          </div>
          <div className="mt-4 text-lg font-semibold" style={{ color: CARD.text }}>
            {truncate(payload.c, 40)}
          </div>
          <div className="mt-1 text-sm" style={{ color: CARD.muted }}>
            {truncate(payload.n, 28)} · {payload.x}
          </div>
          <div
            className="mt-6 h-2.5 w-full overflow-hidden rounded-full"
            style={{ background: CARD.track }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${score}%`, background: band.color }}
            />
          </div>
        </div>

        {/* Domain breakdown */}
        {domains.length > 0 && (
          <div
            className="flex flex-1 flex-col gap-3.5 rounded-xl p-6"
            style={{ background: CARD.panel, border: `1px solid ${CARD.border}` }}
          >
            <div
              className="text-xs font-semibold"
              style={{ color: CARD.muted, letterSpacing: 2 }}
            >
              DOMAIN BREAKDOWN
            </div>
            {domains.map(([label, dScore], i) => {
              const s = Math.max(0, Math.min(100, Math.round(dScore)));
              return (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="flex-1 truncate text-sm"
                    style={{ color: "#C7CBD1" }}
                  >
                    {label}
                  </span>
                  <span
                    className="h-1.5 w-24 overflow-hidden rounded-full sm:w-28"
                    style={{ background: CARD.track }}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${s}%`, background: readinessBand(s).color }}
                    />
                  </span>
                  <span
                    className="w-10 text-right font-mono text-xs"
                    style={{ color: CARD.sub }}
                  >
                    {s}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
