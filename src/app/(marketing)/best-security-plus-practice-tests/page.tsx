import { ROUNDUP } from "@/lib/seo/comparison-pages";
import { RoundupLanding } from "@/components/marketing/RoundupLanding";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: ROUNDUP.metaTitle,
  description: ROUNDUP.metaDescription,
  path: `/${ROUNDUP.path}`,
});

export default function RoundupPage() {
  return <RoundupLanding data={ROUNDUP} />;
}
