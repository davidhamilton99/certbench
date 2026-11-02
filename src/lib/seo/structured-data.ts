const BASE_URL = "https://certbench.dev";

/** BreadcrumbList for pages with a visible breadcrumb; shows as the result's path in search. */
export function breadcrumbList(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  };
}

/** Article for a page of dated facts, so its freshness can be read without guessing. */
export function articleData({
  headline,
  description,
  path,
  published,
  modified,
}: {
  headline: string;
  description: string;
  path: string;
  published: string;
  modified: string;
}): Record<string, unknown> {
  const org = { "@type": "Organization", name: "CertBench", url: BASE_URL };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url: `${BASE_URL}${path}`,
    datePublished: published,
    dateModified: modified,
    author: org,
    publisher: org,
  };
}
