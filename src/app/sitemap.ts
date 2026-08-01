import { MetadataRoute } from "next";
import { listObjectivePages } from "@/server/seo/objective-data";
import { listReadinessCheckCerts } from "@/server/seo/readiness-check-data";
import { VS_PAGES, ROUNDUPS } from "@/lib/seo/comparison-pages";

const BASE_URL = "https://certbench.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Programmatic pages — fail-safe so a DB hiccup can't break the sitemap.
  const objectivePages: MetadataRoute.Sitemap = await listObjectivePages()
    .then((pages) =>
      pages.map((p) => ({
        url: `${BASE_URL}/objectives/${p.cert}/${p.code}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }))
    )
    .catch(() => []);

  const readinessChecks: MetadataRoute.Sitemap = await listReadinessCheckCerts()
    .then((certs) =>
      certs.map((c) => ({
        url: `${BASE_URL}/readiness-check/${c.cert}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      }))
    )
    .catch(() => []);

  return [
    ...readinessChecks,
    ...objectivePages,
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/security-plus-practice-test`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/network-plus-practice-test`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/a-plus-practice-test`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/security-plus-pbq-examples`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/network-plus-pbq-examples`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tools/port-numbers-quiz`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tools/subnetting-practice`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...ROUNDUPS.map((r) => ({
      url: `${BASE_URL}/${r.path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...VS_PAGES.map((p) => ({
      url: `${BASE_URL}/compare/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${BASE_URL}/help`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
