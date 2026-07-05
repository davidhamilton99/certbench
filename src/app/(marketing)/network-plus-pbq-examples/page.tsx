import { PBQ_EXAMPLE_PAGES } from "@/lib/seo/cert-pages";
import { PbqExampleLanding } from "@/components/marketing/PbqExampleLanding";

const page = PBQ_EXAMPLE_PAGES.find(
  (p) => p.path === "network-plus-pbq-examples"
)!;

export const metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
};

export default function Page() {
  return <PbqExampleLanding page={page} />;
}
