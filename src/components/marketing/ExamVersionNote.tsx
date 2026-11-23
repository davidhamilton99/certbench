import Link from "next/link";
import type { ReactNode } from "react";
import {
  A_PLUS_CORE1_CERT,
  A_PLUS_CORE2_CERT,
  COMPTIA_URLS,
  EXAM_FACTS_CHECKED,
  SECURITY_PLUS_CERT,
  SECURITY_PLUS_VERSIONS_PATH,
  SY0_801_CERT,
  SY0_801_PATH,
  SY0_801_PRACTICE_PATH,
} from "@/lib/seo/exam-versions";
import { cn } from "@/lib/utils";

/** One of CompTIA's own pages, where the reader can check what the note says. */
function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="cb-link">
      {children}
    </a>
  );
}

/**
 * Says which exam version the questions on this page were written to, and what
 * CompTIA has changed since. Renders nothing for an exam with nothing to flag.
 *
 * Every date in the note has its source beside it: the Security+ note names
 * CompTIA's two Security+ pages and the day they were last read, as the A+
 * notes name the A+ pages.
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
          These questions are written to SY0-701 (Security+ V7).
        </strong>{" "}
        SY0-701 stays open until June 11, 2027 in English. Its replacement,{" "}
        <Link href={SY0_801_PATH} className="cb-link">
          SY0-801
        </Link>
        , is the version that CompTIA now recommends, and CertBench explains{" "}
        <Link href={SECURITY_PLUS_VERSIONS_PATH} className="cb-link">
          which version to take
        </Link>
        . SY0-801 has{" "}
        <Link href={`/path/${SY0_801_CERT}`} className="cb-link">
          its own study path
        </Link>{" "}
        and a{" "}
        <Link href={SY0_801_PRACTICE_PATH} className="cb-link">
          free practice test
        </Link>
        . These dates are from CompTIA&apos;s{" "}
        <Source href={COMPTIA_URLS.securityV7}>Security+ V7 page</Source> and{" "}
        <Source href={COMPTIA_URLS.securityV8}>Security+ V8 page</Source>, and were last checked on{" "}
        {EXAM_FACTS_CHECKED}.
      </>
    );
  } else if (core1 && core2) {
    note = (
      <>
        <strong className="font-medium text-foreground">
          These questions are written to 220-1201 and 220-1202, the current A+ exams.
        </strong>{" "}
        CompTIA launched them on March 25, 2025 and retired 220-1101 and 220-1102 on September 25, 2025. CompTIA
        describes them on its <Source href={COMPTIA_URLS.aPlusCore1}>Core 1 exam page</Source> and{" "}
        <Source href={COMPTIA_URLS.aPlusCore2}>Core 2 exam page</Source>.
      </>
    );
  } else if (core1) {
    note = (
      <>
        <strong className="font-medium text-foreground">
          These questions are written to 220-1201, the current A+ Core 1 exam.
        </strong>{" "}
        It replaced 220-1101, which <Source href={COMPTIA_URLS.aPlusCore1}>CompTIA</Source> retired on September 25,
        2025.
      </>
    );
  } else if (core2) {
    note = (
      <>
        <strong className="font-medium text-foreground">
          These questions are written to 220-1202, the current A+ Core 2 exam.
        </strong>{" "}
        It replaced 220-1102, which <Source href={COMPTIA_URLS.aPlusCore2}>CompTIA</Source> retired on September 25,
        2025.
      </>
    );
  }

  if (!note) return null;
  return (
    // A notice: the rule down its left edge is kept for this one meaning, and
    // the corners on that edge are square so the rule is straight. The box
    // carries the colour and the paragraph its size: a size and a colour
    // passed through one cn() call can lose the size.
    <div
      className={cn(
        "cb-measure rounded-r-lg border-l-2 border-primary bg-muted px-4 py-3 text-left text-muted-foreground sm:px-5",
        className
      )}
    >
      <p className="text-small">{note}</p>
    </div>
  );
}
