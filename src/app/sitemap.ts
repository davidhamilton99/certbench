import { MetadataRoute } from "next";
import { listObjectivePages } from "@/server/seo/objective-data";
import { listReadinessCheckCerts } from "@/server/seo/readiness-check-data";
import { CERT_PAGES_UPDATED_ISO, PBQ_EXAMPLE_PAGES, PRACTICE_TEST_PAGES } from "@/lib/seo/cert-pages";
import { COMPARISON_PAGES_UPDATED_ISO, ROUNDUPS, VS_PAGES } from "@/lib/seo/comparison-pages";
import {
  OBJECTIVE_HUB_CERTS,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
  SY0_801_UPDATED_ISO,
} from "@/lib/seo/exam-versions";
import { ABOUT_PAGES_UPDATED_ISO } from "@/lib/seo/page-dates";

const BASE_URL = "https://certbench.dev";

/**
 * The last real content change, never the request time: Google ignores lastmod
 * once it stops matching what changed. A page whose words live in a copy table
 * takes the date kept beside that table, so its date moves only when its own
 * words do. Change a date in the commit that changes the words, and only then.
 */

/** Pages whose words are in their own files: the home page, pricing, help, the tools, the objective pages and the readiness checks. */
const CONTENT_UPDATED = new Date("2026-11-22");
/** The same day as the "Last updated" line printed on each of these two pages (sitemap.test.ts compares them). */
const TERMS_UPDATED = new Date("2026-11-22");
const PRIVACY_UPDATED = new Date("2026-11-22");
const CONTACT_UPDATED = new Date("2026-11-22");
/** /about and /educators, which print the same day (src/lib/seo/page-dates.ts). */
const ABOUT_UPDATED = new Date(ABOUT_PAGES_UPDATED_ISO);
/** The practice-test pages and the PBQ pages (src/lib/seo/cert-pages.ts). */
const CERT_PAGES_UPDATED = new Date(CERT_PAGES_UPDATED_ISO);
/** The guides and the comparisons (src/lib/seo/comparison-pages.ts). */
const COMPARISON_PAGES_UPDATED = new Date(COMPARISON_PAGES_UPDATED_ISO);
/** The SY0-801 pages, and the version comparison that links them. */
const SY0_801_UPDATED = new Date(SY0_801_UPDATED_ISO);

/**
 * Pages worth finding in search whose words are in their own files. App
 * screens (/path, /login, /register) and /unsubscribe stay out.
 */
const STATIC_PATHS = [
  "",
  "/pricing",
  "/tools/port-numbers-quiz",
  "/tools/subnetting-practice",
  "/tools/subnet-calculator",
  "/tools/security-plus-acronyms-quiz",
  ...OBJECTIVE_HUB_CERTS.map((cert) => `/objectives/${cert}`),
  "/help",
];

function entry(path: string, lastModified: Date): MetadataRoute.Sitemap[number] {
  return { url: `${BASE_URL}${path}`, lastModified };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The pages generated from the database. A failed read leaves them out for
  // this request and never breaks the sitemap.
  const objectivePages = await listObjectivePages()
    .then((pages) => pages.map((p) => entry(`/objectives/${p.cert}/${p.code}`, CONTENT_UPDATED)))
    .catch(() => []);

  const readinessChecks = await listReadinessCheckCerts()
    .then((certs) => certs.map((c) => entry(`/readiness-check/${c.cert}`, CONTENT_UPDATED)))
    .catch(() => []);

  return [
    ...STATIC_PATHS.map((path) => entry(path, CONTENT_UPDATED)),
    ...[...PRACTICE_TEST_PAGES, ...PBQ_EXAMPLE_PAGES].map((page) => entry(`/${page.path}`, CERT_PAGES_UPDATED)),
    ...ROUNDUPS.map((guide) => entry(`/${guide.path}`, COMPARISON_PAGES_UPDATED)),
    ...VS_PAGES.map((page) => entry(`/compare/${page.slug}`, COMPARISON_PAGES_UPDATED)),
    ...[SY0_801_PRACTICE_PATH, SY0_801_PATH, SY0_801_AI_PATH, SECURITY_PLUS_VERSIONS_PATH].map((path) =>
      entry(path, SY0_801_UPDATED)
    ),
    ...readinessChecks,
    ...objectivePages,
    entry("/about", ABOUT_UPDATED),
    entry("/educators", ABOUT_UPDATED),
    entry("/contact", CONTACT_UPDATED),
    entry("/privacy", PRIVACY_UPDATED),
    entry("/terms", TERMS_UPDATED),
  ];
}
