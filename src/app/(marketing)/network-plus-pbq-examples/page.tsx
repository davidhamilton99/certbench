import { PBQ_EXAMPLE_PAGES } from "@/lib/seo/cert-pages";
import { PbqExampleLanding } from "@/components/marketing/PbqExampleLanding";
import { pageMetadata } from "@/lib/seo/metadata";

const page = PBQ_EXAMPLE_PAGES.find(
  (p) => p.path === "network-plus-pbq-examples"
)!;

export const metadata = pageMetadata({
  title: page.metaTitle,
  description: page.metaDescription,
  path: `/${page.path}`,
});

export default function Page() {
  return <PbqExampleLanding page={page} />;
}
