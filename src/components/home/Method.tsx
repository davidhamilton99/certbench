import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { PathLabInfo, PathStructure } from "@/core/path/types";
import { HANDS_ON } from "@/core/path/labs";
import { ScoreBar, ScoreLevel } from "@/components/instrument/ScoreLevel";
import { labMeta } from "@/components/path/lab-types";
import { keepCodes } from "@/lib/keep-codes";
import { READINESS_TARGET, bandFor } from "@/lib/readiness/band";
import { cn } from "@/lib/utils";

const label = (n: string) => n.replace(/\.0$/, "");

/**
 * Where an objective stands, in the words the course outline itself prints
 * (src/components/path/ExamMap.tsx). The example shows the first objectives
 * of a domain in these states, in this order, and "Not started" after them.
 */
const OUTLINE_EXAMPLE = [
  { status: "Complete", className: "text-success" },
  { status: "To review", className: "text-warning-ink" },
  { status: "Next", className: "font-medium text-primary" },
] as const;
const NOT_STARTED = { status: "Not started", className: "text-muted-foreground" } as const;

/**
 * How studying on CertBench goes, in the order it happens. Each part is said
 * in full sentences and shown with the thing itself, drawn as the product
 * draws it and in the product's own words: a domain of the course outline,
 * the exam's labs by name, and a results report. Every figure says what it is
 * before its content, and nothing in a figure moves.
 */
export function Method({
  structure,
  steps,
  minutes,
  sample,
  freeLabs,
  questions,
  examMinutes,
  examHref,
  labsHref,
}: {
  structure: PathStructure;
  /** Steps in the whole path, and rough minutes a step takes. */
  steps: number;
  minutes: number;
  /** Example figures for the results report: overall, an earlier one, and each domain's. */
  sample: { score: number; from: number; domains: number[] };
  /** Hands-on labs anyone can use. */
  freeLabs: number;
  /** The practice exam's length. */
  questions: number;
  examMinutes: number;
  examHref: string;
  labsHref: string;
}) {
  // The counts below are this exam version's, so the code is printed with the name.
  // Wherever it is printed in a sentence, the code stays whole: on a narrow
  // screen a line may otherwise break at its hyphen ("SY0-" and then "701").
  const exam = `${structure.examName} ${structure.examCode}`;
  const examText = keepCodes(exam);
  const first = structure.domains[0];
  const objectives = structure.domains.reduce((n, d) => n + d.objectives.length, 0);
  const outline = first.objectives.map((o, k) => ({ ...o, ...(OUTLINE_EXAMPLE[k] ?? NOT_STARTED) }));
  const complete = outline.filter((o) => o.status === "Complete").length;
  const library = structure.library ?? [];
  const labs = [...library.filter((l) => HANDS_ON.has(l.type)), ...library.filter((l) => !HANDS_ON.has(l.type))].slice(0, 5);
  const band = bandFor(sample.score);

  return (
    <div className="grid gap-16 sm:gap-24">
      <Part
        title="Study one objective at a time."
        body={
          <>
            The study path takes the {objectives} {examText} objectives in CompTIA&apos;s order. Each objective is one
            short step of about {minutes} minutes, with quick questions first and then a question in the wording of
            the real exam. A question that you answer incorrectly is repeated at the start of a later step until you
            answer it correctly.
          </>
        }
        link={{ href: "/start", label: "Start the study path" }}
        note={`The ${exam} study path has ${steps} steps, from the first question to a full practice exam.`}
      >
        <Figure
          caption={`An example from the ${exam} course outline. The first objective is complete, the second has a question to review, and the third is next.`}
        >
          {/* The outline's own head and rows: nothing is cut short, and a long line wraps. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-foreground/70 px-4 py-3">
            <p className="min-w-0 text-small font-semibold leading-snug">
              Domain {label(first.number)}: {first.title}
            </p>
            <p className="text-note text-muted-foreground">
              {first.weight}% of the exam. {complete} of {outline.length} complete.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {outline.map((o) => (
              <li
                key={o.code}
                className={cn("flex items-baseline gap-3 px-4 py-2.5", o.status === "Next" && "bg-tint-selected")}
              >
                {/*
                  Read aloud or as text, a row is what the outline's own row is: "1.1 Security controls,
                  Complete". The space and the comma between its parts are never drawn.
                */}
                <span className="w-8 shrink-0 font-mono text-note text-muted-foreground">{o.code}</span>{" "}
                <span className={cn("min-w-0 flex-1 text-small leading-snug", o.status === "Next" && "font-semibold")}>
                  {o.title}
                </span>
                <span className="sr-only">, </span>
                {/* The size and the colour are joined as plain text: `cn` reads `text-note` as a colour and would drop it. */}
                <span className={`inline-flex shrink-0 items-baseline gap-1 text-note ${o.className}`}>
                  {o.status === "Complete" && (
                    <Check className="size-3.5 translate-y-0.5" strokeWidth={2.5} aria-hidden />
                  )}
                  {o.status}
                  {o.status === "Next" && <span className="sr-only"> step</span>}
                </span>
              </li>
            ))}
          </ul>
        </Figure>
      </Part>

      {labs.length > 0 && (
        <Part
          title="Practice in the hands-on labs."
          body={
            <>
              Performance-based questions are the hands-on tasks in the real exam, such as setting firewall rules,
              reading logs or correcting a network. CertBench has {library.length} hands-on labs for {examText} in which
              you practice tasks of this kind. You complete them in your browser, and they are marked with partial
              credit.
            </>
          }
          link={{ href: labsHref, label: `Try the free ${structure.examName} labs` }}
          note={`Of the ${library.length} ${exam} labs, ${Math.min(freeLabs, library.length)} are free, and the first three do not require an account.`}
        >
          <Figure caption={`These are ${labs.length} of the ${library.length} ${exam} labs.`}>
            <ul className="divide-y divide-border">
              {labs.map((l) => (
                <LabRow key={l.id} lab={l} />
              ))}
            </ul>
          </Figure>
        </Part>
      )}

      <Part
        title="Take a full-length practice exam."
        body={
          <>
            The practice exam has {questions} questions and a time limit of {examMinutes} minutes. The questions are
            drawn from each domain in proportion to its weight in the real exam. Answers are not shown until the end,
            and an unanswered question is counted as incorrect, as it is in the real exam. The report gives the
            percentage that you answered correctly, for the whole exam and for each domain, against a readiness
            target of {READINESS_TARGET}%.
          </>
        }
        link={{ href: examHref, label: "Take the free practice exam" }}
        note="CompTIA does not publish how its scale of 100 to 900 is calculated, so CertBench does not estimate a scaled score."
      >
        <Figure caption="A sample report with example figures, for a second practice exam compared with the first.">
          <div className="grid gap-5 p-4 sm:p-5">
            {/* An example is printed and left still: the count belongs to a learner's own result. */}
            <ScoreLevel score={sample.score} from={sample.from} band={band} caption="Sample practice exam result" still />
            <ul className="grid gap-3 border-t border-border pt-4">
              {structure.domains.map((d, k) => {
                const pct = sample.domains[k] ?? 0;
                const b = bandFor(pct);
                return (
                  <li key={d.number} className="grid gap-1.5">
                    <span className="flex items-baseline justify-between gap-3 text-note">
                      {/* Read aloud or as text, the row is "Domain 1: General Security Concepts 88%". */}
                      <span className="min-w-0">
                        <span className="sr-only">Domain </span>
                        <span className="mr-1.5 font-mono text-muted-foreground">{label(d.number)}</span>
                        <span className="sr-only">: </span>
                        {d.title}
                      </span>{" "}
                      <span className="shrink-0" style={{ color: b.ink }}>
                        {pct}%
                      </span>
                    </span>
                    <ScoreBar value={pct} color={b.accent} />
                  </li>
                );
              })}
            </ul>
          </div>
        </Figure>
      </Part>
    </div>
  );
}

/** A lab as the lab list names it: its title, then its kind and its length. A long title wraps. */
function LabRow({ lab }: { lab: PathLabInfo }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3">
      <span className="min-w-0 text-small leading-snug">{lab.title}</span>{" "}
      <span className="text-note text-muted-foreground">{labMeta(lab)}</span>
    </li>
  );
}

/**
 * One part of the method: what you do, in a few sentences, beside the thing
 * itself. Every part is set the same way round, in two equal columns, so the
 * three headings share the page's left edge and the three figures one axis.
 */
function Part({
  title,
  body,
  link,
  note,
  children,
}: {
  title: string;
  body: ReactNode;
  link: { href: string; label: string };
  /** A fact set under the link. */
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-16">
      <div className="grid content-start gap-4">
        <h3 className="cb-subsection">{title}</h3>
        <p className="cb-measure text-body text-muted-foreground">{body}</p>
        <div className="grid gap-2 pt-1">
          <Link href={link.href} className="cb-link cb-tap w-fit font-semibold">
            {link.label}
          </Link>
          {note && <p className="cb-measure-sm text-small text-muted-foreground">{keepCodes(note)}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * A figure: the product's own piece on a sheet of paper. The caption comes
 * first, so a reader (or a program that lifts the passage) is told that this
 * is an example before reading a figure in it.
 */
function Figure({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="grid gap-2.5">
      <figcaption className="cb-measure-xs text-note text-muted-foreground">{keepCodes(caption)}</figcaption>
      <div className="glass overflow-hidden rounded-lg">{children}</div>
    </figure>
  );
}
