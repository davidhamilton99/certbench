import type { Metadata } from "next";

const SITE_NAME = "CertBench";
// src/app/opengraph-image.tsx. Next attaches it only to pages that set no
// openGraph of their own, so these pages have to name it.
const SHARE_IMAGE = "/opengraph-image";

/**
 * Title, description, canonical and social tags for one public page. The root
 * layout's openGraph and twitter describe the homepage, and Next keeps them
 * until a page sets its own, so without this every shared link reads as the
 * homepage. `title` is the base title: the layout's template adds " | CertBench"
 * to the <title> tag, and the social title gets the same suffix here. With
 * `absoluteTitle`, `title` is the whole tag and nothing is added to it: a page
 * whose title is built to fit a length (objective-meta.ts) says so.
 */
export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  absoluteTitle?: boolean;
}): Metadata {
  const socialTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
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
