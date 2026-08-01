import { NETWORK_PLUS_ROUNDUP } from "@/lib/seo/comparison-pages";
import { RoundupLanding } from "@/components/marketing/RoundupLanding";

export const metadata = {
  title: NETWORK_PLUS_ROUNDUP.metaTitle,
  description: NETWORK_PLUS_ROUNDUP.metaDescription,
};

export default function NetworkPlusRoundupPage() {
  return <RoundupLanding data={NETWORK_PLUS_ROUNDUP} />;
}
