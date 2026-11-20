import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { ROUNDUPS, VS_PAGES } from "@/lib/seo/comparison-pages";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PathCard } from "@/components/marketing/PathCard";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderPage } from "@/components/marketing/lander/Lander";
import {
  ArticleBand,
  ArticleBody,
  ArticleHero,
  ArticleSection,
  ArticleTail,
  TickWell,
} from "@/components/marketing/lander/Article";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

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
  return pageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/compare/${page.slug}`,
  });
}

/** One side of the verdict: when to pick that tool. */
function Verdict({ title, items, ours = false }: { title: string; items: string[]; ours?: boolean }) {
  return (
    <div
      className={cn(
        "glass relative isolate overflow-hidden rounded-[1.75rem] p-6 sm:p-7",
        ours && "border-primary/45 shadow-[0_30px_80px_-44px_var(--primary)]"
      )}
    >
      {ours && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-1/2 -z-10 h-full [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)]"
        />
      )}
      <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      <ul className="mt-4 grid gap-3 text-[15px] leading-relaxed text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <TickWell lit={ours}>
              <Check strokeWidth={3} />
            </TickWell>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// On phones each row stacks: the feature, then each tool's answer under its name.
const CELL =
  "px-6 py-4 align-top max-sm:block max-sm:p-0 max-sm:before:mb-0.5 max-sm:before:block max-sm:before:text-[11px] max-sm:before:font-medium max-sm:before:uppercase max-sm:before:tracking-[0.14em] max-sm:before:text-muted-foreground/80 max-sm:before:content-[attr(data-label)]";

export default async function VsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = VS_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();

  const guide = ROUNDUPS.find((r) => r.path === "best-security-plus-practice-tests");

  return (
    <LanderPage>
      <ArticleBody>
        <ArticleHero eyebrow="Comparison" title={page.h1}>
          {page.intro.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </ArticleHero>

        {/* The verdict, both directions */}
        <section className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2">
          <Verdict title={`Choose ${page.competitorName} if`} items={page.chooseThem} />
          <Verdict title="Choose CertBench if" items={page.chooseUs} ours />
        </section>

        <ArticleSection title="Side by side">
          <div className="glass overflow-hidden rounded-[1.75rem]">
            <table className="w-full text-left text-[15px] leading-relaxed max-sm:block">
              <thead className="max-sm:sr-only">
                <tr className="border-b border-foreground/[0.08]">
                  <th scope="col" className="w-[24%] px-6 py-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Feature
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    CertBench
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    {page.competitorName}
                  </th>
                </tr>
              </thead>
              <tbody className="max-sm:block">
                {page.rows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-foreground/[0.06] last:border-0 max-sm:grid max-sm:gap-3 max-sm:px-5 max-sm:py-5"
                  >
                    <th scope="row" className="px-6 py-4 align-top font-medium max-sm:block max-sm:p-0 max-sm:text-base">
                      {row.feature}
                    </th>
                    <td data-label="CertBench" className={cn(CELL, "text-muted-foreground")}>
                      {row.certbench}
                    </td>
                    <td data-label={page.competitorName} className={cn(CELL, "text-muted-foreground")}>
                      {row.competitor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Competitor details and prices are approximate as of mid-2026 — always check their site for current offers.
          </p>
        </ArticleSection>
      </ArticleBody>

      <ArticleBand>
        <PathCard
          kicker="Your exam path"
          title="The fastest way to decide"
          href="/start"
          label="Start my exam path"
          context="compare_page"
        >
          Start the guided path for your exam. The first stops are free, and the readiness checkpoint shows where you
          stand.
        </PathCard>
      </ArticleBand>

      <ArticleTail>
        <RelatedLinks
          title="Other comparisons"
          links={[
            ...VS_PAGES.filter((p) => p.slug !== page.slug).map((p) => ({
              href: `/compare/${p.slug}`,
              label: `CertBench vs ${p.competitorName}`,
              note: p.metaDescription,
            })),
            ...(guide
              ? [
                  {
                    href: `/${guide.path}`,
                    label: "The full 2026 Security+ guide",
                    note: "Every practice test worth a look, side by side, CertBench included",
                  },
                ]
              : []),
          ]}
        />
        <FaqSection faqs={page.faqs} />
      </ArticleTail>
    </LanderPage>
  );
}
