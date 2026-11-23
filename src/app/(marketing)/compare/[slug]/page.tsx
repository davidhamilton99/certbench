import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { longDate } from "@/core/path/versions";
import { COMPARISON_PAGES_UPDATED_ISO, ROUNDUPS, VS_PAGES } from "@/lib/seo/comparison-pages";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PathCard } from "@/components/marketing/PathCard";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderBlock, LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero, ArticleSection, TickWell } from "@/components/marketing/lander/Article";
import { pageMetadata } from "@/lib/seo/metadata";
import { keepCodes } from "@/lib/keep-codes";

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

/** One side of the verdict: when to choose that product. A ruled list, with CertBench's own side marked in ink. */
function Verdict({ title, items, ours = false }: { title: string; items: string[]; ours?: boolean }) {
  return (
    <div className="border-t border-foreground/80 pt-5">
      <h2 className="cb-subsection">{title}</h2>
      <ul className="mt-5 grid gap-3 text-small text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <TickWell lit={ours}>
              <Check strokeWidth={3} />
            </TickWell>
            <span className="min-w-0">{keepCodes(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// On a phone each row stacks: the feature, then each product's answer under its name.
const CELL =
  "py-3.5 pr-6 align-top text-muted-foreground last:pr-0 max-sm:block max-sm:p-0 max-sm:before:mb-0.5 max-sm:before:block max-sm:before:text-note max-sm:before:font-medium max-sm:before:text-muted-foreground max-sm:before:content-[attr(data-label)]";

export default async function VsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = VS_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();

  const guide = ROUNDUPS.find((r) => r.path === "best-security-plus-practice-tests");
  // Only a price can be read at the vendor's source (the facts file holds prices and nothing else), so
  // every other entry in the competitor's column is said to be CertBench's own assessment.
  const priceRead = Boolean(page.priceSource && page.priceChecked);
  const attribution = `The ${page.competitorName} column is CertBench's own assessment${
    priceRead ? ", except for the price, which CertBench read on the vendor's own page" : ""
  }.`;

  return (
    <LanderPage>
      <ArticleBody>
        <ArticleHero
          eyebrow="Comparison"
          title={page.h1}
          // The day the comparison's words last changed, kept beside them in the copy table.
          above={
            <p className="text-note text-muted-foreground">
              This comparison was last updated on {longDate(COMPARISON_PAGES_UPDATED_ISO)}.
            </p>
          }
        >
          {page.intro.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </ArticleHero>

        {/* The verdict, in both directions. */}
        <section className="mt-12 grid gap-10 sm:mt-16 sm:grid-cols-2">
          <Verdict title={`Choose ${page.competitorName} if`} items={page.chooseThem} />
          <Verdict title="Choose CertBench if" items={page.chooseUs} ours />
        </section>

        <ArticleSection title="Side by side" wide>
          <table className="w-full border-collapse text-left text-small max-sm:block">
            {/* The table's name says whose words the competitor's column holds, before any row is read. */}
            <caption className="pb-4 text-left text-note text-muted-foreground max-sm:block">{attribution}</caption>
            <thead className="max-sm:sr-only">
              <tr className="border-y border-foreground/70 text-note text-muted-foreground">
                <th scope="col" className="w-[22%] py-2.5 pr-6 font-medium">
                  Feature
                </th>
                <th scope="col" className="w-[39%] py-2.5 pr-6 font-medium">
                  CertBench
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  {page.competitorName}
                </th>
              </tr>
            </thead>
            <tbody className="max-sm:block max-sm:border-t max-sm:border-foreground/70">
              {page.rows.map((row) => (
                <tr key={row.feature} className="border-b border-border max-sm:grid max-sm:gap-3 max-sm:py-5">
                  <th scope="row" className="py-3.5 pr-6 align-top font-semibold max-sm:block max-sm:p-0 max-sm:text-body">
                    {row.feature}
                  </th>
                  <td data-label="CertBench" className={CELL}>
                    {keepCodes(row.certbench)}
                  </td>
                  <td data-label={page.competitorName} className={CELL}>
                    {keepCodes(row.competitor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* A date is printed only for a price that was read at its source on that day. */}
          <p className="cb-measure-xs mt-4 text-note text-muted-foreground">
            {page.priceSource && page.priceChecked && (
              <>
                CertBench read the price of {page.competitorName} on{" "}
                <a href={page.priceSource} target="_blank" rel="noopener noreferrer" className="cb-link">
                  the vendor&apos;s own page
                </a>{" "}
                on {page.priceChecked}.{" "}
              </>
            )}
            The details and prices of other products change. Please check the vendor&apos;s own site for its current
            offer.
          </p>
        </ArticleSection>
      </ArticleBody>

      <PathCard
        className="mt-20 sm:mt-28"
        title="The fastest way to decide"
        href="/start"
        label="Choose your exam"
        context="compare_page"
      >
        Choose your exam to start its study path. The first steps are free, and the readiness checkpoint shows where
        you stand.
      </PathCard>

      <LanderBlock>
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
                    label: "The 2026 guide to Security+ practice tests",
                    note: "Security+ practice tests side by side, with CertBench among them",
                  },
                ]
              : []),
          ]}
        />
        <FaqSection faqs={page.faqs} />
      </LanderBlock>
    </LanderPage>
  );
}
