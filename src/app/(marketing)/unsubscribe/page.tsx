import type { Metadata } from "next";
import Link from "next/link";
import { LanderPage } from "@/components/marketing/lander/Lander";
import { ArticleBody, ArticleHero } from "@/components/marketing/lander/Article";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/errors/user-message";
import {
  UNSUBSCRIBE_API_PATH,
  isUnsubscribeToken,
  parseUnsubscribeScope,
  type UnsubscribeScope,
} from "@/server/email/unsubscribe";

/**
 * Where the unsubscribe link in an email leads. Opening this page changes
 * nothing: it says what will stop and has one button, and the button sends the
 * POST that makes the change (src/app/api/email/unsubscribe/route.ts). The
 * form is plain HTML, so it works in a mail app's built-in browser and without
 * scripts, and the answer is this page again with `status` set.
 */

type Query = Record<string, string | string[] | undefined>;

type View =
  | { kind: "ask"; scope: UnsubscribeScope; token: string; failed: boolean }
  | { kind: "done"; scope: UnsubscribeScope }
  | { kind: "invalid" };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function viewOf(query: Query): View {
  const scope = parseUnsubscribeScope(first(query.scope));
  const status = first(query.status);
  const token = first(query.token);
  if (status === "done") return { kind: "done", scope };
  if (status === "invalid" || !isUnsubscribeToken(token)) return { kind: "invalid" };
  return { kind: "ask", scope, token, failed: status === "failed" };
}

/** What each kind of link stops, in the words the page and its title use. */
const COPY: Record<"account" | "lead" | "daily", { title: string; stops: string; keeps: string | null; done: string }> = {
  account: {
    title: "Unsubscribe from study emails",
    stops:
      "If you unsubscribe, CertBench will stop sending you study emails: the reminders in the two weeks before your exam date, the reminder to continue your study path, the result of your readiness checkpoint, and the question about how your exam went.",
    keeps:
      "Emails that you request, such as a password reset, will still be sent. Your account and your progress are not affected.",
    done: "You will no longer receive study emails from CertBench.",
  },
  lead: {
    title: "Unsubscribe from the study plan email",
    stops: "If you unsubscribe, CertBench will not send this study plan email to your address again.",
    keeps: null,
    done: "You will no longer receive this study plan email from CertBench.",
  },
  daily: {
    title: "Unsubscribe from the daily study reminder",
    stops: "If you unsubscribe, CertBench will not send you the daily study reminder.",
    keeps: "Your other study emails, such as the reminders before your exam date, are not affected.",
    done: "You will no longer receive the daily study reminder from CertBench.",
  },
};

const copyFor = (scope: UnsubscribeScope) => COPY[scope ?? "account"];

const DONE_TITLE = "You have been unsubscribed.";
const INVALID_TITLE = "This unsubscribe link is not valid.";
const FAILED = "You could not be unsubscribed. Please try again.";

/** A heading that is a sentence keeps its full stop on the page and loses it in the browser tab. */
const tabTitle = (heading: string) => heading.replace(/\.$/, "");

function titleOf(view: View): string {
  if (view.kind === "done") return tabTitle(DONE_TITLE);
  if (view.kind === "invalid") return tabTitle(INVALID_TITLE);
  // After a failed attempt the tab says so first: it is what a screen reader announces.
  return view.failed ? "You could not be unsubscribed" : copyFor(view.scope).title;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }): Promise<Metadata> {
  return {
    title: titleOf(viewOf(await searchParams)),
    // The address carries a personal token: the page is kept out of search.
    robots: { index: false, follow: false },
  };
}

function SupportLink() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="cb-link">
      {SUPPORT_EMAIL}
    </a>
  );
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Query> }) {
  const view = viewOf(await searchParams);

  if (view.kind === "invalid") {
    return (
      <LanderPage>
        <ArticleBody>
          <ArticleHero title={INVALID_TITLE}>
            <p>
              Please use the link in the most recent email that CertBench sent you. If the problem continues, write to{" "}
              <SupportLink />.
            </p>
          </ArticleHero>
        </ArticleBody>
      </LanderPage>
    );
  }

  const copy = copyFor(view.scope);

  if (view.kind === "done") {
    return (
      <LanderPage>
        <ArticleBody>
          <ArticleHero title={DONE_TITLE}>
            <p>{copy.done}</p>
            <p>
              <Link href="/" className="cb-link">
                Return to the home page
              </Link>
            </p>
          </ArticleHero>
        </ArticleBody>
      </LanderPage>
    );
  }

  const action = new URLSearchParams({ token: view.token });
  if (view.scope) action.set("scope", view.scope);

  return (
    <LanderPage>
      <ArticleBody>
        <ArticleHero title={copy.title}>
          <p>{copy.stops}</p>
          {copy.keeps && <p>{copy.keeps}</p>}
          <p>Nothing changes until you press the button.</p>
        </ArticleHero>

        {view.failed && (
          <p role="alert" className="cb-measure mt-6 text-body font-medium text-destructive">
            {FAILED} If the problem continues, write to <SupportLink />.
          </p>
        )}

        <form method="post" action={`${UNSUBSCRIBE_API_PATH}?${action}`} className="mt-8">
          {/* Tells the handler to answer with this page and not with JSON. */}
          <input type="hidden" name="from" value="page" />
          <Button type="submit" size="lg">
            Unsubscribe
          </Button>
        </form>
      </ArticleBody>
    </LanderPage>
  );
}
