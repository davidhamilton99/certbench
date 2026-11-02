import { NETWORK_PLUS_ROUNDUP } from "@/lib/seo/comparison-pages";
import { RoundupLanding } from "@/components/marketing/RoundupLanding";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: NETWORK_PLUS_ROUNDUP.metaTitle,
  description: NETWORK_PLUS_ROUNDUP.metaDescription,
  path: `/${NETWORK_PLUS_ROUNDUP.path}`,
});

export default function NetworkPlusRoundupPage() {
  return <RoundupLanding data={NETWORK_PLUS_ROUNDUP} />;
}
