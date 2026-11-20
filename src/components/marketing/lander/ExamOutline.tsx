import { cn } from "@/lib/utils";

export interface OutlineExam {
  name: string;
  examCode: string;
  domains: { number: string; title: string; weight: number }[];
}

/** The domains' shades, running blue into cyan across the exam. */
const shade = (i: number, n: number) =>
  `color-mix(in oklab, var(--primary) ${Math.round(100 - (i / Math.max(1, n - 1)) * 100)}%, var(--signal))`;

const label = (n: string) => n.replace(/\.0$/, "");

/**
 * What the exam covers, drawn to scale: one bar split by each domain's share
 * of the exam, the share set large under its slice. A list with bars on phones,
 * where the slices would be too thin to read.
 */
export function ExamOutline({ exams, className }: { exams: OutlineExam[]; className?: string }) {
  return (
    <div className={cn("grid gap-14", className)}>
      {exams.map((exam) => (
        <div key={exam.examCode} className="grid gap-6">
          {exams.length > 1 && (
            <h3 className="text-left text-sm font-medium">
              {exam.name} <span className="ml-1 font-mono text-xs text-muted-foreground">{exam.examCode}</span>
            </h3>
          )}

          {/* Across, to scale */}
          <ol
            className="hidden gap-x-2 sm:grid"
            style={{ gridTemplateColumns: exam.domains.map((d) => `minmax(0, ${d.weight}fr)`).join(" ") }}
          >
            {exam.domains.map((d, i) => (
              <li key={d.number} className="grid min-w-0 content-start gap-3 text-left">
                <span
                  aria-hidden
                  className="h-2 rounded-full shadow-[0_0_18px_-4px_var(--primary)]"
                  style={{ background: shade(i, exam.domains.length) }}
                />
                <span className="cb-display text-3xl lg:text-[2.6rem]">
                  {d.weight}
                  <span className="text-[0.55em] text-muted-foreground">%</span>
                </span>
                <span className="text-sm leading-snug text-muted-foreground">
                  <span className="mr-1.5 font-mono text-xs text-foreground/70">{label(d.number)}</span>
                  {d.title}
                </span>
              </li>
            ))}
          </ol>

          {/* Down, on phones */}
          <ol className="grid gap-4 sm:hidden">
            {exam.domains.map((d, i) => (
              <li key={d.number} className="grid gap-2 text-left">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-[15px] leading-snug">
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">{label(d.number)}</span>
                    {d.title}
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums">{d.weight}%</span>
                </div>
                <span className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (d.weight / Math.max(...exam.domains.map((x) => x.weight))) * 100)}%`,
                      background: shade(i, exam.domains.length),
                    }}
                  />
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
