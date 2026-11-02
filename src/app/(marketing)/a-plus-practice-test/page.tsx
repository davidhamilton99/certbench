import { PRACTICE_TEST_PAGES } from "@/lib/seo/cert-pages";
import { loadPracticeTestData } from "@/server/seo/practice-test-data";
import { PracticeTestLanding } from "@/components/marketing/PracticeTestLanding";
import { listObjectivesForCerts } from "@/server/seo/objective-data";
import { pageMetadata } from "@/lib/seo/metadata";

const page = PRACTICE_TEST_PAGES.find((p) => p.path === "a-plus-practice-test")!;

export const revalidate = 86400;

export const metadata = pageMetadata({
  title: page.metaTitle,
  description: page.metaDescription,
  path: `/${page.path}`,
});

export default async function Page() {
  const [data, objectives] = await Promise.all([
    loadPracticeTestData(page.certSlugs),
    listObjectivesForCerts(page.certSlugs),
  ]);
  return (
    <PracticeTestLanding page={page} data={data} objectives={objectives} />
  );
}
