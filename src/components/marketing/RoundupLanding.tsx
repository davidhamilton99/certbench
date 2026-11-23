import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { longDate } from "@/core/path/versions";
import {
  COMPARISON_PAGES_UPDATED_ISO,
  ROUNDUPS,
  type RoundupData,
  type RoundupTool,
} from "@/lib/seo/comparison-pages";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PathCard } from "@/components/marketing/PathCard";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderBlock, LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero, ArticleSection, TickWell } from "@/components/marketing/lander/Article";
import { JsonLd } from "@/components/seo/JsonLd";
import { keepCodes } from "@/lib/keep-codes";
import { PRACTICE_TEST_PAGES } from "@/lib/seo/cert-pages";
import { usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";

/**
 * Whether every step of the guide's study path follows one of CompTIA's
 * objectives. The guide's exams are those of the practice-test page that it
 * leads to. Network+ is set out by CertBench's own topics, so its guide says
 * "topic", and so does a guide whose exams are not known.
 */
function followsOfficialObjectives(data: RoundupData): boolean {
  const certs = PRACTICE_TEST_PAGES.find((page) => page.path === data.practiceTestPath)?.certSlugs ?? [];
  return certs.length > 0 && certs.every(usesOfficialObjectiveNumbers);
}

/** "CompTIA A+" from "best-a-plus-practice-tests". */
function certLabel(path: string): string {
  if (path.includes("a-plus")) return "CompTIA A+";
  if (path.includes("network-plus")) return "CompTIA Network+";
  if (path.includes("security-plus")) return "CompTIA Security+";
  return "CompTIA";
}

/** The guide's study path. A+ has two exams, so its visitors choose one. */
function pathFor(path: string): string {
  if (path.includes("network-plus")) return "/path/network-plus-n10-009";
  if (path.includes("security-plus")) return "/path/security-plus-sy0-701";
  return "/start";
}

/**
 * A product in the guide. `source` is the vendor's own page and `checked` is
 * the day its price was read there. Both are set only for a price that was
 * confirmed at the source, so a date is never printed without a check behind
 * it.
 */
type Tool = RoundupTool;

// On a phone each row of the table stacks: the product, then each fact under
// its own label, which is taken from the column's heading.
const CELL =
  "py-3 pr-6 align-top last:pr-0 max-sm:block max-sm:p-0 max-sm:before:block max-sm:before:text-note max-sm:before:text-muted-foreground max-sm:before:content-[attr(data-label)]";

/** The price, and under it the day it was read on the vendor's page, where it was. */
function Price({ tool }: { tool: Tool }) {
  return (
    <>
      {tool.price}
      {tool.source && tool.checked && (
        <>
          {/* A space in the text itself: read without styles, the price and the note stay two phrases. */}{" "}
          <span className="mt-0.5 block text-note text-muted-foreground">Price checked on {tool.checked}.</span>
        </>
      )}
    </>
  );
}

/** A list of sentences under its own heading, each with a mark that only decorates. */
function Points({ heading, items, lit = false }: { heading: string; items: string[]; lit?: boolean }) {
  return (
    <div>
      <h3 className="text-small font-semibold">{heading}</h3>
      <ul className="mt-3 grid gap-2.5 text-small text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <TickWell lit={lit}>{lit ? <Check strokeWidth={3} /> : <Minus strokeWidth={3} />}</TickWell>
            <span className="min-w-0">{keepCodes(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One product: its price and what it suits, then its strengths and its
 * limitations as two lists, each under its own heading. A reader who cannot
 * see the marks, and a program that reads the text, are told which is which.
 */
function ToolEntry({ tool }: { tool: Tool }) {
  const confirmed = tool.source && tool.checked;
  return (
    <ArticleSection
      className="mt-12 sm:mt-16"
      title={
        confirmed ? (
          <a href={tool.source} target="_blank" rel="noopener noreferrer" className="cb-link">
            {tool.name}
          </a>
        ) : (
          tool.name
        )
      }
    >
      {tool.isSelf && (
        <p className="cb-measure mb-5 text-body text-muted-foreground">
          CertBench publishes this guide, and this is its own product.
        </p>
      )}
      {/* On a phone each label sits close over its own value, with the room between the two facts. */}
      <dl className="grid gap-x-8 gap-y-1 text-small sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:gap-y-3">
        <dt className="text-muted-foreground">Price</dt>
        <dd>
          <Price tool={tool} />
        </dd>
        <dt className="text-muted-foreground max-sm:mt-3">Most suitable for</dt>
        <dd>{keepCodes(tool.bestFor)}</dd>
      </dl>
      <div className="mt-7 grid gap-8 sm:grid-cols-2">
        <Points heading="Strengths" items={tool.strengths} lit />
        <Points heading="Limitations" items={tool.weaknesses} />
      </div>
      {tool.compareSlug && (
        <p className="mt-7 text-small">
          <Link href={`/compare/${tool.compareSlug}`} className="cb-link">
            Read the full comparison of {tool.name} with CertBench
          </Link>
        </p>
      )}
    </ArticleSection>
  );
}

/** Presentational template for the "best {cert} practice tests" guides. */
export function RoundupLanding({ data }: { data: RoundupData }) {
  const others = ROUNDUPS.filter((r) => r.path !== data.path);
  const exam = certLabel(data.path);
  const official = followsOfficialObjectives(data);
  const tools: Tool[] = data.tools;

  // The products as a list, for search and for AI answers. The list is marked
  // as unordered and carries no positions: CertBench publishes the guide and
  // is one of its entries, so the markup must not read as an independent
  // ranking. There are no ratings, because nobody gave one.
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: data.h1,
    description: data.metaDescription,
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: tools.length,
    itemListElement: tools.map((tool) => ({
      "@type": "ListItem",
      name: tool.name,
    })),
  };

  return (
    <LanderPage>
      <JsonLd data={itemList} />
      <ArticleBody>
        <ArticleHero
          title={data.h1}
          // The day the guide's words last changed, kept beside them in the copy table.
          above={
            <p className="text-note text-muted-foreground">
              This guide was last updated on {longDate(COMPARISON_PAGES_UPDATED_ISO)}.
            </p>
          }
        >
          {data.intro.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </ArticleHero>

        {/* The three facts every entry has, side by side, before the detail. */}
        <ArticleSection title="The products in brief" wide>
          <table className="w-full border-collapse text-left text-small max-sm:block">
            <thead className="max-sm:sr-only">
              <tr className="border-y border-foreground/70 text-note text-muted-foreground">
                <th scope="col" className="w-[26%] py-2.5 pr-6 font-medium">
                  Product
                </th>
                <th scope="col" className="w-[34%] py-2.5 pr-6 font-medium">
                  Price
                </th>
                <th scope="col" className="py-2.5 font-medium">
                  Most suitable for
                </th>
              </tr>
            </thead>
            <tbody className="max-sm:block max-sm:border-t max-sm:border-foreground/70">
              {tools.map((tool) => (
                <tr key={tool.name} className="border-b border-border max-sm:grid max-sm:gap-2 max-sm:py-4">
                  <th scope="row" className="py-3 pr-6 align-top font-semibold max-sm:block max-sm:p-0">
                    {tool.name}
                  </th>
                  <td data-label="Price" className={CELL}>
                    <Price tool={tool} />
                  </td>
                  <td data-label="Most suitable for" className={CELL}>
                    {keepCodes(tool.bestFor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ArticleSection>

        {tools.map((tool) => (
          <ToolEntry key={tool.name} tool={tool} />
        ))}
      </ArticleBody>

      <PathCard
        className="mt-20 sm:mt-28"
        kicker={`${exam.replace(/^CompTIA\s+/, "")} study path`}
        title="Try CertBench before you buy anything"
        href={pathFor(data.path)}
        label="Start the free steps"
        context="roundup_page"
        note="You do not need a payment card or an account to start."
      >
        The study path covers every {official ? "exam objective" : "topic"} in short steps, and its readiness
        checkpoint shows where you stand. The first steps are free.
      </PathCard>

      <LanderBlock>
        {others.length > 0 && (
          <RelatedLinks
            title="Guides for other exams"
            links={others.map((r) => ({
              href: `/${r.path}`,
              label: `Best ${certLabel(r.path)} practice tests`,
              note: r.metaDescription,
            }))}
          />
        )}
        <FaqSection faqs={data.faqs} />
      </LanderBlock>
    </LanderPage>
  );
}
