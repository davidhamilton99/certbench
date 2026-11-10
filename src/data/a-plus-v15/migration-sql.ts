import type { QuestionFix, V15Exam } from "./types";

/** A question written for V15, in the shape the new-question data files use. */
export interface V15NewQuestion {
  key: string;
  objective: string;
  difficulty: 1 | 2 | 3;
  question: string;
  options: readonly [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface V15MigrationInput {
  exam: V15Exam;
  /** Every question in the 220-1101/1102 bank this was built from: id → old objective code. */
  bank: readonly (readonly [string, string])[];
  newQuestions: readonly V15NewQuestion[];
}

const str = (s: string) => `'${s.replace(/'/g, "''")}'`;
const optionsJson = (options: readonly string[], answer: number) =>
  str(JSON.stringify(options.map((text, i) => ({ text, is_correct: i === answer }))));

function fixSql(id: string, fix: QuestionFix): string {
  const set: string[] = [];
  if (fix.question) set.push(`question_text = ${str(fix.question)}`);
  if (fix.options) {
    if (fix.answer === undefined) throw new Error(`${id}: new options need their answer`);
    set.push(`options = ${optionsJson(fix.options, fix.answer)}::jsonb`);
  } else if (fix.answer !== undefined) {
    // Same options, new answer: move the is_correct flag.
    set.push(
      `options = (select jsonb_agg(jsonb_set(e.elem, '{is_correct}', to_jsonb(e.ord - 1 = ${fix.answer})) order by e.ord) from jsonb_array_elements(options) with ordinality as e(elem, ord))`
    );
  }
  if (fix.answer !== undefined) set.push(`correct_index = ${fix.answer}`);
  set.push(`explanation = ${str(fix.explanation)}`, `updated_at = now()`);
  return `update cert_questions set\n  ${set.join(",\n  ")}\nwhere id = ${str(id)};`;
}

/** How many of the old bank's questions stay active on V15. */
export function activeAfterMigration(exam: V15Exam, bank: V15MigrationInput["bank"]): number {
  return bank.filter(([id, code]) => !(id in exam.retired) && (exam.overrides[id]?.to ?? exam.objectiveMap[code]) != null).length;
}

function examSql({ exam, bank, newQuestions }: V15MigrationInput): string {
  const cert = `(select id from certifications where slug = ${str(exam.oldSlug)})`;
  const ids = (list: string[]) => list.map((id) => `  ${str(id)}`).join(",\n");
  const overrides = Object.entries(exam.overrides);
  const retired = Object.keys(exam.retired);
  const listed = [...new Set([...overrides.map(([id]) => id), ...retired, ...Object.keys(exam.fixes)])];
  const expectedActive = activeAfterMigration(exam, bank) + newQuestions.length;
  const out: string[] = [];

  out.push(`-- ${exam.oldExamCode} to ${exam.examCode} ${"-".repeat(56)}`);
  out.push(`do $$
begin
  if (select count(*) from cert_questions where certification_id = ${cert}) <> ${bank.length} then
    raise exception '${exam.oldExamCode}: expected the ${bank.length}-question bank this migration was built from';
  end if;
  if (select count(*) from cert_questions where certification_id = ${cert} and id in (
${ids(listed)}
  )) <> ${listed.length} then
    raise exception '${exam.oldExamCode}: a question named in the V15 decisions is missing';
  end if;
end $$;`);

  out.push(`-- Domain weights, from CompTIA's ${exam.examCode} exam page.
update cert_domains d
set exam_weight = v.weight
from (values
${exam.domains.map((d) => `  (${str(d.number)}, ${d.weight})`).join(",\n")}
) as v(domain_number, weight)
where d.certification_id = ${cert} and d.domain_number = v.domain_number;`);

  out.push(`-- The ${exam.oldExamCode} objectives step aside, so V15's can take their codes.
update cert_sub_objectives s
set code = 'v14-' || s.code
from cert_domains d
where s.domain_id = d.id and d.certification_id = ${cert};`);

  out.push(`-- The ${exam.examCode} objectives, in our own words.
insert into cert_sub_objectives (domain_id, code, title, sort_order)
select d.id, v.code, v.title, v.sort_order
from (values
${exam.domains
  .flatMap((d) => d.objectives.map((o, i) => `  (${str(d.number)}, ${str(o.code)}, ${str(o.title)}, ${i + 1})`))
  .join(",\n")}
) as v(domain_number, code, title, sort_order)
join cert_domains d on d.domain_number = v.domain_number and d.certification_id = ${cert};`);

  const mapped = Object.entries(exam.objectiveMap).filter((e): e is [string, string] => e[1] !== null);
  out.push(`-- Every question follows its objective to V15 (domain and objective).
update cert_questions q
set sub_objective_id = n.id, domain_id = n.domain_id, updated_at = now()
from (values
${mapped.map(([from, to]) => `  (${str(from)}, ${str(to)})`).join(",\n")}
) as m(old_code, new_code)
join cert_sub_objectives o on o.code = 'v14-' || m.old_code
join cert_domains od on od.id = o.domain_id and od.certification_id = ${cert}
join cert_sub_objectives n on n.code = m.new_code
join cert_domains nd on nd.id = n.domain_id and nd.certification_id = ${cert}
where q.sub_objective_id = o.id;`);

  if (overrides.length) {
    out.push(`-- Except these, whose subject belongs to another V15 objective.
update cert_questions q
set sub_objective_id = n.id, domain_id = n.domain_id, updated_at = now()
from (values
${overrides.map(([id, o]) => `  (${str(id)}, ${str(o.to)})`).join(",\n")}
) as v(id, code)
join cert_sub_objectives n on n.code = v.code
join cert_domains nd on nd.id = n.domain_id and nd.certification_id = ${cert}
where q.id = v.id::uuid;`);
  }

  if (retired.length) {
    out.push(`-- Topics ${exam.examCode} doesn't test: inactive, never deleted. Reasons in src/data/a-plus-v15.
update cert_questions set is_active = false, updated_at = now()
where id in (
${ids(retired)}
);`);
  }

  out.push(`-- Questions whose whole objective left the exam: inactive, with no objective.
update cert_questions q
set is_active = false, sub_objective_id = null, updated_at = now()
from cert_sub_objectives s
join cert_domains d on d.id = s.domain_id and d.certification_id = ${cert}
where q.sub_objective_id = s.id and s.code like 'v14-%';`);

  for (const [id, fix] of Object.entries(exam.fixes)) out.push(`-- Correction.\n${fixSql(id, fix)}`);

  if (newQuestions.length) {
    out.push(`-- New questions for what ${exam.examCode} added.
insert into cert_questions (certification_id, domain_id, sub_objective_id, question_text, options, correct_index, explanation, difficulty, is_active, is_diagnostic_eligible)
select ${cert}, n.domain_id, n.id, v.question_text, v.options::jsonb, v.correct_index, v.explanation, v.difficulty, true, true
from (values
${newQuestions
  .map((q) => `  (${str(q.objective)}, ${str(q.question)}, ${optionsJson(q.options, q.answer)}, ${q.answer}, ${str(q.explanation)}, ${q.difficulty})`)
  .join(",\n")}
) as v(code, question_text, options, correct_index, explanation, difficulty)
join cert_sub_objectives n on n.code = v.code
join cert_domains d on d.id = n.domain_id and d.certification_id = ${cert};`);
  }

  out.push(`-- The ${exam.oldExamCode} objectives, now unused.
delete from cert_sub_objectives s
using cert_domains d
where s.domain_id = d.id and d.certification_id = ${cert} and s.code like 'v14-%';`);

  out.push(`do $$
begin
  if exists (select 1 from cert_questions where certification_id = ${cert} and is_active and sub_objective_id is null) then
    raise exception '${exam.examCode}: an active question has no objective';
  end if;
  if (select count(*) from cert_questions where certification_id = ${cert} and is_active) <> ${expectedActive} then
    raise exception '${exam.examCode}: expected ${expectedActive} active questions';
  end if;
end $$;`);

  out.push(`-- The exam itself: enrollments, Pro and history stay on the same row.
update certifications
set slug = ${str(exam.slug)}, exam_code = ${str(exam.examCode)}, passing_score = ${exam.passingScore}
where slug = ${str(exam.oldSlug)};`);

  return out.join("\n\n");
}

/**
 * The SQL that moves the A+ bank onto V15, in one transaction. Generated from
 * src/data/a-plus-v15 by scripts/a-plus-v15/build-migration.ts.
 */
export function buildAPlusV15Migration(inputs: readonly V15MigrationInput[]): string {
  const slugs = (pick: (e: V15Exam) => string) => inputs.map((i) => str(pick(i.exam))).join(", ");
  return [
    `-- Rebuild A+ on the current exams (${inputs.map((i) => i.exam.examCode).join(" and ")}).
-- Generated by scripts/a-plus-v15/build-migration.ts from src/data/a-plus-v15:
-- edit those and regenerate; don't edit this file.
--
-- The certification and domain rows stay (enrollments, Pro and attempts keep
-- pointing at them). Questions are re-tagged to V15's objectives; ones on
-- topics V15 doesn't test become inactive, and none is deleted.`,
    `begin;`,
    ...inputs.map(examSql),
    `-- Saved paths may use the V15 slugs. Rows still on the old ones are moved,
-- answers re-keyed, by scripts/a-plus-v15/migrate-path-progress.ts.
alter table path_progress drop constraint if exists path_progress_cert_slug_check;
alter table path_progress add constraint path_progress_cert_slug_check check (cert_slug in (
  'security-plus-sy0-701', 'network-plus-n10-009',
  ${slugs((e) => e.oldSlug)},
  ${slugs((e) => e.slug)}
));`,
    `commit;`,
    ``,
  ].join("\n\n");
}
