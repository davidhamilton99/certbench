import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { VS_PAGES } from "@/lib/seo/comparison-pages";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { Button } from "@/components/ui/button";

export const dynamicParams = false;

export function generateStaticParams() {
  return VS_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = VS_PAGES.find((p) => p.slug === slug);
  if (!page) return {};
  return { title: page.metaTitle, description: page.metaDescription };
}

export default async function VsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = VS_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.h1}
        </h1>
        <div className="mt-4 grid gap-3 text-muted-foreground">
          {page.intro.map((p) => (
            <p key={p.slice(0, 32)} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* The verdict, both directions */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold">
              Choose {page.competitorName} if
            </h2>
            <ul className="mt-3 grid gap-2.5 text-sm leading-relaxed text-muted-foreground">
              {page.chooseThem.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-1 size-3.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-primary/40 bg-card p-5">
            <h2 className="text-sm font-semibold">Choose CertBench if</h2>
            <ul className="mt-3 grid gap-2.5 text-sm leading-relaxed text-muted-foreground">
              {page.chooseUs.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-1 size-3.5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Feature table */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Side by side
          </h2>
          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-2.5 font-medium">Feature</th>
                  <th className="px-4 py-2.5 font-medium">CertBench</th>
                  <th className="px-4 py-2.5 font-medium">
                    {page.competitorName}
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((row) => (
                  <tr key={row.feature} className="border-b align-top last:border-0">
                    <td className="px-4 py-2.5 font-medium">{row.feature}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.certbench}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.competitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Competitor details and prices are approximate as of mid-2026 —
            always check their site for current offers.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            The fastest way to decide
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Take the free 25-question diagnostic — twenty minutes, no card —
            and see the readiness score and daily plan on your own results.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/register">
              Take the free diagnostic
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Comparing more options?{" "}
            <Link
              href="/best-security-plus-practice-tests"
              className="text-primary underline underline-offset-4"
            >
              See the full 2026 guide
            </Link>
            .
          </p>
        </section>

        <FaqSection faqs={page.faqs} />
      </main>
      <Footer />
    </div>
  );
}
