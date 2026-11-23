import Link from "next/link";
import { DIAGNOSTIC_QUESTION_COUNT } from "@/core/constants";
import { Button } from "@/components/ui/button";

/**
 * The study plan before the diagnostic has been taken: what the diagnostic is,
 * one action to start it, and what the plan shows afterwards. It stands where
 * an empty readiness score would otherwise be.
 *
 * It says only what the page behind it does: the plan for each day is built
 * from the result (src/core/session-plan/compute-plan.ts).
 */
export function DiagnosticGate({
  certName,
  examCode,
  href,
}: {
  certName: string;
  examCode: string;
  href: string;
}) {
  return (
    // On the same left edge as the study path's card above it, not centred under it.
    <div className="grid w-full max-w-xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Study plan for {certName}</h1>
        <p className="text-small text-muted-foreground">
          This is your plan for exam <span className="font-mono text-xs">{examCode}</span>. It begins with a
          diagnostic.
        </p>
      </div>

      <section aria-labelledby="diagnostic-start" className="glass grid gap-4 rounded-lg p-5 sm:p-8">
        <h2 id="diagnostic-start" className="cb-statement">
          Begin with the diagnostic.
        </h2>
        <p className="cb-measure text-small text-muted-foreground">
          The diagnostic has {DIAGNOSTIC_QUESTION_COUNT} questions from every domain of {certName} and takes about 20
          minutes. You can stop and resume at any time. Your study plan is built from the result.
        </p>
        <Button asChild size="lg" className="justify-self-start">
          <Link href={href}>Start the diagnostic</Link>
        </Button>
      </section>

      <section aria-labelledby="diagnostic-after" className="grid gap-2">
        <h2 id="diagnostic-after" className="text-base font-semibold">
          After the diagnostic
        </h2>
        <ul className="cb-measure grid list-disc gap-1.5 pl-5 text-small text-muted-foreground marker:text-muted-foreground">
          <li>Your readiness score is shown, with a score for each domain.</li>
          <li>Each day, the most useful work is set out for you in order.</li>
          <li>You practice the domains in which you make mistakes, and not those that you already know.</li>
        </ul>
      </section>
    </div>
  );
}
