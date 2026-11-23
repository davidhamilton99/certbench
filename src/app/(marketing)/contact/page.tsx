import Link from "next/link";
import type { ReactNode } from "react";
import { ArticleBody, ArticleHero } from "@/components/marketing/lander/Article";
import { LanderPage } from "@/components/marketing/lander/Lander";
import { COLUMN } from "@/components/marketing/lander/layout";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "How to contact CertBench by email, how quickly to expect a reply, and what to include when you report a problem or an incorrect question.",
  path: "/contact",
});

/**
 * One subject: its name at the left, and what there is to say about it at the
 * width of its measure. Set as the rows of the other reading pages are, with
 * the name as a heading, so the page can be read by its headings.
 */
function Topic({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1.5 border-b border-border py-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-8">
      <h2 className="text-body font-semibold">{title}</h2>
      <div className="cb-measure grid gap-3 text-body text-muted-foreground">{children}</div>
    </section>
  );
}

export default function ContactPage() {
  return (
    // The page is set like every reading page: on the page's one left edge,
    // inside the public frame, which draws the header and the footer.
    <LanderPage className="pb-16 sm:pb-24">
      <ArticleBody>
        <ArticleHero title="Contact CertBench">
          <p>You can reach CertBench by email. Every message is read and answered.</p>
        </ArticleHero>

        <div className={cn(COLUMN, "mt-12 border-t border-foreground/80 sm:mt-16")}>
          <Topic title="Email">
            <p>
              <a href="mailto:support@certbench.dev" className="cb-link">
                support@certbench.dev
              </a>
            </p>
            <p>
              Email is the best way to report a problem, to send feedback, or to ask a question about your account.
            </p>
          </Topic>

          <Topic title="Response time">
            <p>
              CertBench aims to reply to every message within 24 hours. If a problem is preventing you from studying,
              please say so in the subject line so that it can be dealt with first.
            </p>
          </Topic>

          <Topic title="Reporting a problem">
            <p>Please include the following information, so that the problem can be corrected quickly.</p>
            <ol className="grid list-decimal gap-1.5 pl-5">
              <li>What you were doing when the problem occurred.</li>
              <li>What you expected to happen.</li>
              <li>What happened instead.</li>
              <li>A screenshot, if you are able to provide one.</li>
            </ol>
            <p>Please also name the certification that you are studying and the browser that you are using.</p>
          </Topic>

          <Topic title="Reporting an incorrect question">
            <p>
              Reports of this kind are the most valuable feedback that CertBench receives. If you believe that a
              question has the wrong answer or a misleading explanation, please send the text of the question, or a
              screenshot, together with your reasoning. CertBench aims to review each report within 24 hours, and the
              question is corrected where the report is right.
            </p>
          </Topic>

          <Topic title="Colleges and training providers">
            <p>
              If you teach a CompTIA course and would like to use CertBench with a class, please read the{" "}
              <Link href="/educators" className="cb-link">
                information for educators
              </Link>
              , or write to the address above.
            </p>
          </Topic>

          <p className="cb-measure pt-6 text-body text-muted-foreground">
            Answers to common questions are in the{" "}
            <Link href="/help" className="cb-link">
              Help center
            </Link>
            .
          </p>
        </div>
      </ArticleBody>
    </LanderPage>
  );
}
