import type { Metadata } from "next";

const SITE_NAME = "CertBench";
// src/app/opengraph-image.tsx. Next attaches it only to pages that set no
// openGraph of their own, so these pages have to name it.
const SHARE_IMAGE = "/opengraph-image";

/**
 * Title, description, canonical and social tags for one public page. The root
 * layout's openGraph and twitter describe the homepage, and Next keeps them
 * until a page sets its own, so without this every shared link reads as the
 * homepage. `title` is the base title: the layout's template adds " — CertBench"
 * to the <title> tag, and the social title gets the same suffix here.
 */
export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  const socialTitle = `${title} — ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [SHARE_IMAGE] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
