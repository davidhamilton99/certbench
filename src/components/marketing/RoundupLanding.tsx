import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { ROUNDUPS, type RoundupData } from "@/lib/seo/comparison-pages";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PathCard } from "@/components/marketing/PathCard";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBand, ArticleBody, ArticleHero, ArticleTail, TickWell } from "@/components/marketing/lander/Article";
import { JsonLd } from "@/components/seo/JsonLd";
import { cn } from "@/lib/utils";

/** "CompTIA A+" from "best-a-plus-practice-tests". */
function certLabel(path: string): string {
  if (path.includes("a-plus")) return "CompTIA A+";
  if (path.includes("network-plus")) return "CompTIA Network+";
  if (path.includes("security-plus")) return "CompTIA Security+";
  return "CompTIA";
}

/** The roundup's exam path; A+ has two exams, so its visitors pick one. */
function pathFor(path: string): string {
  if (path.includes("network-plus")) return "/path/network-plus-n10-009";
  if (path.includes("security-plus")) return "/path/security-plus-sy0-701";
  return "/start";
}

type Tool = RoundupData["tools"][number];

/** One tool: what it's best for, then its strengths and weaknesses. */
function ToolCard({ tool }: { tool: Tool }) {
  return (
    <article
      className={cn(
        "glass relative isolate overflow-hidden rounded-[1.75rem] p-6 sm:p-8",
        tool.isSelf && "border-primary/45 shadow-[0_30px_80px_-44px_var(--primary)]"
      )}
    >
      {tool.isSelf && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-1/2 -z-10 h-full [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]"
        />
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h2 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{tool.name}</h2>
        <span className="rounded-full bg-foreground/[0.06] px-3 py-1 text-[13px] text-muted-foreground">
          {tool.price}
        </span>
      </div>
      {tool.isSelf && (
        <p className="mt-2.5 inline-flex rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">
          Our product — bias disclosed
        </p>
      )}
      <p className="mt-3 text-[15px] leading-relaxed">
        <span className="text-muted-foreground">Best for: </span>
        {tool.bestFor}
      </p>
      <ul className="mt-5 grid gap-2.5 text-[15px] leading-relaxed">
        {tool.strengths.map((s) => (
          <li key={s} className="flex items-start gap-3">
            <TickWell lit>
              <Check strokeWidth={3} />
            </TickWell>
            {s}
          </li>
        ))}
        {tool.weaknesses.map((w) => (
          <li key={w} className="flex items-start gap-3 text-muted-foreground">
            <TickWell>
              <Minus strokeWidth={3} />
            </TickWell>
            {w}
          </li>
        ))}
      </ul>
      {tool.compareSlug && (
        <Link
          href={`/compare/${tool.compareSlug}`}
          className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          Full CertBench comparison
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </article>
  );
}

/** Presentational template for the "best {cert} practice tests" roundups. */
export function RoundupLanding({ data }: { data: RoundupData }) {
  const others = ROUNDUPS.filter((r) => r.path !== data.path);
  const exam = certLabel(data.path);

  // ItemList structured data so search and generative engines read this as a
  // genuine roundup of tools. No fabricated ratings — just the ranked list.
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: data.metaTitle,
    description: data.metaDescription,
    itemListElement: data.tools.map((tool, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: tool.name,
    })),
  };

  return (
    <LanderPage>
      <JsonLd data={itemList} />
      <ArticleBody>
        <ArticleHero eyebrow={`${exam} · Compared`} title={data.h1}>
          {data.intro.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </ArticleHero>

        <section className="mt-12 grid gap-4 sm:mt-16 sm:gap-5">
          {data.tools.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </section>
      </ArticleBody>

      <ArticleBand>
        <PathCard
          kicker={`Your ${exam.replace(/^CompTIA\s+/, "")} path`}
          title="Try it before you buy anything"
          href={pathFor(data.path)}
          label="Start the free stops"
          context="roundup_page"
          note="No card, no account needed to start."
        >
          The guided path walks every exam objective in short stops, and its readiness checkpoint shows where you stand.
          The first stops are free.
        </PathCard>
      </ArticleBand>

      <ArticleTail>
        {others.length > 0 && (
          <RelatedLinks
            title="Studying for a different exam?"
            links={others.map((r) => ({
              href: `/${r.path}`,
              label: `Best ${certLabel(r.path)} practice tests`,
              note: r.metaDescription,
            }))}
          />
        )}
        <FaqSection faqs={data.faqs} />
      </ArticleTail>
    </LanderPage>
  );
}
