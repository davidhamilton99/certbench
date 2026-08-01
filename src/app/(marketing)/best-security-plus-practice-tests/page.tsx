import { ROUNDUP } from "@/lib/seo/comparison-pages";
import { RoundupLanding } from "@/components/marketing/RoundupLanding";

export const metadata = {
  title: ROUNDUP.metaTitle,
  description: ROUNDUP.metaDescription,
};

export default function RoundupPage() {
  return <RoundupLanding data={ROUNDUP} />;
}
