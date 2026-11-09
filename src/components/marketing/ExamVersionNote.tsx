import Link from "next/link";
import type { ReactNode } from "react";
import {
  A_PLUS_CORE1_CERT,
  A_PLUS_CORE2_CERT,
  MESSER_COMPARISON_URLS,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_PATH,
} from "@/lib/seo/exam-versions";
import { cn } from "@/lib/utils";

const LINK = "underline underline-offset-4 hover:text-foreground";

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
    </a>
  );
}

/**
 * Says which exam version the questions on this page were written to, and what
 * CompTIA has changed since. Renders nothing for an exam with nothing to flag.
 */
export function ExamVersionNote({
  certSlugs,
  className,
}: {
  certSlugs: string[];
  className?: string;
}) {
  const core1 = certSlugs.includes(A_PLUS_CORE1_CERT);
  const core2 = certSlugs.includes(A_PLUS_CORE2_CERT);

  let note: ReactNode = null;
  if (certSlugs.includes(SECURITY_PLUS_CERT)) {
    note = (
      <>
        <strong className="font-medium text-foreground">
          Written to SY0-701, the current Security+ exam.
        </strong>{" "}
        It stays open until June 11, 2027 in English. CompTIA lists its replacement,{" "}
        <Link href={SY0_801_PATH} className={LINK}>
          SY0-801
        </Link>
        , as launching on or around November 17, 2026.{" "}
        <Link href={SECURITY_PLUS_VERSIONS_PATH} className={LINK}>
          Which one should you take?
        </Link>
      </>
    );
  } else if (core1 && core2) {
    note = (
      <>
        <strong className="font-medium text-foreground">
          Written to 220-1101 and 220-1102, which CompTIA retired on September 25, 2025.
        </strong>{" "}
        Today&apos;s exams are 220-1201 and 220-1202. Most topics carry over: Professor
        Messer counts about 87% of{" "}
        <Source href={MESSER_COMPARISON_URLS.core1}>Core 1</Source> and 80% of{" "}
        <Source href={MESSER_COMPARISON_URLS.core2}>Core 2</Source> as unchanged. We
        haven&apos;t added the new topics yet.
      </>
    );
  } else if (core1) {
    note = (
      <>
        <strong className="font-medium text-foreground">
          Written to 220-1101, which CompTIA retired on September 25, 2025.
        </strong>{" "}
        Today&apos;s Core 1 exam is 220-1201. Most topics carry over:{" "}
        <Source href={MESSER_COMPARISON_URLS.core1}>Professor Messer counts about 87%</Source>{" "}
        as unchanged. We haven&apos;t added the new topics yet.
      </>
    );
  } else if (core2) {
    note = (
      <>
        <strong className="font-medium text-foreground">
          Written to 220-1102, which CompTIA retired on September 25, 2025.
        </strong>{" "}
        Today&apos;s Core 2 exam is 220-1202. Most topics carry over:{" "}
        <Source href={MESSER_COMPARISON_URLS.core2}>Professor Messer counts about 80%</Source>{" "}
        as unchanged. We haven&apos;t added the new topics yet.
      </>
    );
  }

  if (!note) return null;
  return (
    <p
      className={cn(
        "rounded-lg border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground",
        className
      )}
    >
      {note}
    </p>
  );
}
