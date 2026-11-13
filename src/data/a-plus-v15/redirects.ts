// Relative imports only: next.config.ts loads this file, outside the app's
// "@/" alias.
import { codeToSlug } from "../../lib/seo/objective-code";
import { CORE1_V15 } from "./core1";
import { CORE2_V15 } from "./core2";
import type { V15Exam } from "./types";

/** One of next.config.ts's redirects. */
export interface Redirect {
  source: string;
  destination: string;
  permanent: true;
}

/**
 * Each core's practice test, where a page about a topic V15 dropped sends its
 * visitors. (src/lib/seo/cert-pages.ts lists the pages; a test keeps these equal.)
 */
export const A_PLUS_PRACTICE_PAGES: Readonly<Record<string, string>> = {
  [CORE1_V15.slug]: "/a-plus-core-1-practice-test",
  [CORE2_V15.slug]: "/a-plus-core-2-practice-test",
};

function examRedirects(exam: V15Exam): Redirect[] {
  const to = (source: string, destination: string): Redirect => ({ source, destination, permanent: true });
  const practice = A_PLUS_PRACTICE_PAGES[exam.slug];
  return [
    to(`/path/${exam.oldSlug}`, `/path/${exam.slug}`),
    to(`/readiness-check/${exam.oldSlug}`, `/readiness-check/${exam.slug}`),
    to(`/objectives/${exam.oldSlug}`, `/objectives/${exam.slug}`),
    ...Object.entries(exam.objectiveMap).map(([from, code]) =>
      to(
        `/objectives/${exam.oldSlug}/${codeToSlug(from)}`,
        code === null ? practice : `/objectives/${exam.slug}/${codeToSlug(code)}`
      )
    ),
  ];
}

/**
 * Permanent redirects from every 220-1101/1102 URL to its V15 page: the path,
 * the readiness check, and each objective page to the objective its topic
 * moved to. Search results, emails and bookmarks keep working, and Google
 * carries each page's standing over to its successor.
 */
export function aPlusV14Redirects(): Redirect[] {
  return [CORE1_V15, CORE2_V15].flatMap(examRedirects);
}
