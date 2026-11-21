import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { StoryForm } from "@/components/story/StoryForm";
import { Button } from "@/components/ui/button";
import { verifyStoryToken } from "@/server/story/story-token";
import { createAdminClient } from "@/server/supabase/admin";
import { getCertification } from "@/server/data/certifications";
import { getProfile } from "@/server/data/profiles";
import { shareName } from "@/server/share/readiness-token";
import { isPathCert } from "@/core/path/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How did your exam go?",
  robots: { index: false, follow: false },
};

/**
 * Where the post-exam email lands. The signed link says who it was sent to,
 * so there's no sign-in in the way.
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
        <h1 className="cb-display text-balance text-[2.35rem] sm:text-5xl">This link has expired.</h1>
        <p className="max-w-md text-balance text-lg text-muted-foreground">
          Sign in and your path is where you left it.
        </p>
        <Button asChild size="lg">
          <Link href="/start">
            Go to my path
            <ArrowRight />
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
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[34rem] w-[64rem] max-w-[200vw] -translate-x-1/2 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_17%,transparent),transparent)]"
      />
      <Logo className="mt-8" />
      <main className="w-full max-w-xl flex-1 pb-20 pt-14 sm:pt-20">{body}</main>
    </div>
  );
}
