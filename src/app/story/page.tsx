import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { StoryForm } from "@/components/story/StoryForm";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { verifyStoryToken } from "@/server/story/story-token";
import { createAdminClient } from "@/server/supabase/admin";
import { getCertification } from "@/server/data/certifications";
import { getProfile } from "@/server/data/profiles";
import { shareName } from "@/server/share/readiness-token";
import { isPathCert } from "@/core/path/types";

// No `dynamic = "force-dynamic"` here: the page reads `searchParams`, so it is
// already drawn for each request and is never stored ahead of time.

export const metadata: Metadata = {
  title: "How did your exam go?",
  robots: { index: false, follow: false },
};

/**
 * Where the post-exam email lands. The signed link says who it was sent to,
 * so there is no sign-in in the way.
 */
export default async function StoryPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; r?: string }>;
}) {
  const { t = "", r } = await searchParams;
  const claim = verifyStoryToken(t);

  let body: React.ReactNode;
  if (!claim) {
    body = (
      <div className="grid justify-items-center gap-5 text-center">
        <h1 className="cb-title">This link has expired.</h1>
        <p className="cb-measure-xs text-lede text-muted-foreground">
          Please sign in. Your study path is where you left it.
        </p>
        <Button asChild size="lg">
          <Link href="/start">
            Go to the study path
            <LinkArrow />
          </Link>
        </Button>
      </div>
    );
  } else {
    const admin = createAdminClient();
    const [cert, profile] = await Promise.all([
      getCertification(admin, claim.certId).catch(() => null),
      getProfile(admin, claim.userId).catch(() => null),
    ]);
    body = (
      <StoryForm
        token={t}
        certName={cert?.name ?? "Your exam"}
        pathHref={cert && isPathCert(cert.slug) ? `/path/${cert.slug}` : "/start"}
        defaultName={shareName(profile?.displayName ?? "")}
        preset={r === "pass" ? true : r === "fail" ? false : null}
      />
    );
  }

  return (
    <div className="relative isolate flex min-h-svh flex-col items-center overflow-hidden aurora-bg px-5 text-foreground">
      {/* The wordmark is the page's header. The page's one main region follows
          it, and the "Skip to main content" link leads there. */}
      <header className="mt-8">
        <Logo />
      </header>
      <main id="main-content" tabIndex={-1} className="w-full max-w-xl flex-1 pb-20 pt-14 outline-none sm:pt-20">
        {body}
      </main>
    </div>
  );
}
