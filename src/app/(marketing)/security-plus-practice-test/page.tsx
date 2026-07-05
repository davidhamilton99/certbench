import { PRACTICE_TEST_PAGES } from "@/lib/seo/cert-pages";
import { loadPracticeTestData } from "@/server/seo/practice-test-data";
import { PracticeTestLanding } from "@/components/marketing/PracticeTestLanding";

const page = PRACTICE_TEST_PAGES.find(
  (p) => p.path === "security-plus-practice-test"
)!;

export const revalidate = 86400; // daily — question samples are stable

export const metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
};

export default async function Page() {
  const data = await loadPracticeTestData(page.certSlugs);
  return <PracticeTestLanding page={page} data={data} />;
}
