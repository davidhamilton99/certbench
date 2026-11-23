import { cn } from "@/lib/utils";

export interface OutlineExam {
  name: string;
  examCode: string;
  domains: { number: string; title: string; weight: number }[];
}

const label = (n: string) => n.replace(/\.0$/, "");

/**
 * What the exam covers, as a plain table: each domain, and its share of the
 * exam as a figure in a narrow column at the right. One table for each exam;
 * two exams stand side by side where there is room.
 *
 * There are no bars. A bar drawn against the largest domain made 28% look
 * like the whole exam, and the figure already says it.
 */
export function ExamOutline({ exams, className }: { exams: OutlineExam[]; className?: string }) {
  return (
    <div className={cn("grid gap-10", exams.length > 1 ? "lg:grid-cols-2" : "max-w-3xl", className)}>
      {exams.map((exam) => (
        <table key={exam.examCode} className="w-full border-collapse self-start text-left text-small">
          <caption className={cn("pb-2 text-left font-semibold", exams.length === 1 && "sr-only")}>
            {exam.name} <span className="ml-1 font-mono text-note font-normal text-muted-foreground">{exam.examCode}</span>
          </caption>
          <thead>
            <tr className="border-y border-foreground/70 text-note text-muted-foreground">
              <th scope="col" className="py-2.5 pr-4 font-medium">
                Domain
              </th>
              {/* As narrow as its heading: the figures line up under it. */}
              <th scope="col" className="w-px whitespace-nowrap py-2.5 text-right font-medium">
                Share of the exam
              </th>
            </tr>
          </thead>
          <tbody>
            {exam.domains.map((d) => (
              <tr key={d.number} className="border-b border-border">
                <th scope="row" className="py-3 pr-4 font-normal">
                  {/* A real space after the number, so the row is read as two words and not as "1General". */}
                  <span className="mr-1 font-mono text-note text-muted-foreground">{label(d.number)}</span> {d.title}
                </th>
                <td className="py-3 text-right">{d.weight}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}
