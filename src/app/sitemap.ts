import { MetadataRoute } from "next";
import { listObjectivePages } from "@/server/seo/objective-data";
import { listReadinessCheckCerts } from "@/server/seo/readiness-check-data";
import { VS_PAGES, ROUNDUPS } from "@/lib/seo/comparison-pages";
import {
  OBJECTIVE_HUB_CERTS,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_AI_PATH,
  SY0_801_PATH,
  SY0_801_UPDATED_ISO,
} from "@/lib/seo/exam-versions";

const BASE_URL = "https://certbench.dev";

/**
 * The last real content change, never the request time: Google ignores lastmod
 * once it stops matching what changed. Bump a date when that content changes.
 */
const CONTENT_UPDATED = new Date("2026-11-02");
const TERMS_UPDATED = new Date("2026-10-24");
const PRIVACY_UPDATED = new Date("2026-09-13");
const CONTACT_UPDATED = new Date("2026-10-10");
/** The SY0-801 pages, and the version comparison that links them. */
const SY0_801_UPDATED = new Date(SY0_801_UPDATED_ISO);
/** Every A+ page: rewritten for 220-1201/1202, then a practice test per core. */
const A_PLUS_UPDATED = new Date("2026-11-13");

/** Pages worth finding in search. App screens (/path, /login, /register) stay out. */
const STATIC_PATHS = [
  "",
  "/pricing",
  "/security-plus-practice-test",
  "/network-plus-practice-test",
  "/a-plus-practice-test",
  "/a-plus-core-1-practice-test",
  "/a-plus-core-2-practice-test",
  "/security-plus-pbq-examples",
  "/network-plus-pbq-examples",
  "/a-plus-core-1-pbq-examples",
  "/a-plus-core-2-pbq-examples",
  "/tools/port-numbers-quiz",
  "/tools/subnetting-practice",
  "/tools/subnet-calculator",
  "/tools/security-plus-acronyms-quiz",
  ...OBJECTIVE_HUB_CERTS.map((cert) => `/objectives/${cert}`),
  ...ROUNDUPS.map((r) => `/${r.path}`),
  ...VS_PAGES.map((p) => `/compare/${p.slug}`),
  "/help",
];

function entry(path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  const fallback = path.includes("a-plus") ? A_PLUS_UPDATED : CONTENT_UPDATED;
  return { url: `${BASE_URL}${path}`, lastModified: lastModified ?? fallback };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Programmatic pages — fail-safe so a DB hiccup can't break the sitemap.
  const objectivePages = await listObjectivePages()
    .then((pages) => pages.map((p) => entry(`/objectives/${p.cert}/${p.code}`)))
    .catch(() => []);

  const readinessChecks = await listReadinessCheckCerts()
    .then((certs) => certs.map((c) => entry(`/readiness-check/${c.cert}`)))
    .catch(() => []);

  return [
    ...STATIC_PATHS.map((path) => entry(path)),
    ...[SY0_801_PATH, SY0_801_AI_PATH, SECURITY_PLUS_VERSIONS_PATH].map((path) => entry(path, SY0_801_UPDATED)),
    ...readinessChecks,
    ...objectivePages,
    entry("/contact", CONTACT_UPDATED),
    entry("/privacy", PRIVACY_UPDATED),
    entry("/terms", TERMS_UPDATED),
  ];
}
