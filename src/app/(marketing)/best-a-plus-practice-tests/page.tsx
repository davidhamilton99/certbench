import { A_PLUS_ROUNDUP } from "@/lib/seo/comparison-pages";
import { RoundupLanding } from "@/components/marketing/RoundupLanding";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: A_PLUS_ROUNDUP.metaTitle,
  description: A_PLUS_ROUNDUP.metaDescription,
  path: `/${A_PLUS_ROUNDUP.path}`,
});

export default function APlusRoundupPage() {
  return <RoundupLanding data={A_PLUS_ROUNDUP} />;
}
