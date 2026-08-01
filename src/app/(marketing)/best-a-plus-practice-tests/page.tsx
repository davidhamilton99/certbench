import { A_PLUS_ROUNDUP } from "@/lib/seo/comparison-pages";
import { RoundupLanding } from "@/components/marketing/RoundupLanding";

export const metadata = {
  title: A_PLUS_ROUNDUP.metaTitle,
  description: A_PLUS_ROUNDUP.metaDescription,
};

export default function APlusRoundupPage() {
  return <RoundupLanding data={A_PLUS_ROUNDUP} />;
}
