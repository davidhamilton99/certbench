import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { N10_009_BANK_COUNTS } from "../bank";
import { N10_009_LIVE_FIXES } from "../live-fixes";
import { N10_009_MIGRATION_FILE, buildN10009Migration, expectedCounts, type N10009MigrationInput } from "../migration-sql";
import { N10_009_NEW_QUESTIONS } from "../new-questions";

const input: N10009MigrationInput = {
  slug: "network-plus-n10-009",
  examCode: "N10-009",
  before: N10_009_BANK_COUNTS,
  newQuestions: N10_009_NEW_QUESTIONS,
  liveFixes: N10_009_LIVE_FIXES,
};
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const sql = buildN10009Migration(input);
const after = 617 + N10_009_NEW_QUESTIONS.length;

describe("the migration that adds the new Network+ questions", () => {
  it("is the file in supabase/migrations, built from these questions and not edited by hand", () => {
    const file = readFileSync(join(process.cwd(), "supabase", "migrations", N10_009_MIGRATION_FILE), "utf8");
    expect(file.replace(/\r\n/g, "\n")).toBe(sql);
  });

  it("runs in one transaction that checks the bank before it adds anything and again before it commits", () => {
    const begin = sql.indexOf("\nbegin;\n");
    const before = sql.indexOf("<> 617 then");
    const insert = sql.indexOf("insert into cert_questions");
    const afterCheck = sql.indexOf(`<> ${after} then`);
    const commit = sql.lastIndexOf("\ncommit;\n");
    expect(begin).toBeGreaterThan(0);
    expect(before).toBeGreaterThan(begin);
    expect(insert).toBeGreaterThan(before);
    expect(afterCheck).toBeGreaterThan(insert);
    expect(commit).toBeGreaterThan(afterCheck);
  });

  it("adds every new question once, on its topic, with its options marked and its answer's index", () => {
    const rows = sql.match(/^ {2}\('\d\.\d', '/gm) ?? [];
    expect(rows).toHaveLength(N10_009_NEW_QUESTIONS.length);
    for (const q of N10_009_NEW_QUESTIONS) {
      const options = JSON.stringify(q.options.map((text, i) => ({ text, is_correct: i === q.answer }))).replace(/'/g, "''");
      expect(sql, q.key).toContain(`('${q.topic}', '${q.question.replace(/'/g, "''")}', '${options}', ${q.answer}, `);
    }
  });

  it("expects every topic to hold its live questions plus its new ones", () => {
    const counts = expectedCounts(input);
    expect(Object.values(counts).reduce((s, n) => s + n, 0)).toBe(after);
    for (const [topic, n] of Object.entries(counts)) {
      expect(n, topic).toBe(N10_009_BANK_COUNTS[topic] + N10_009_NEW_QUESTIONS.filter((q) => q.topic === topic).length);
      expect(sql, topic).toContain(`('${topic}', ${n})`);
    }
  });

  it("doubles every quote, so no question can end its string early", () => {
    const [q] = N10_009_NEW_QUESTIONS;
    const quoted = buildN10009Migration({ ...input, newQuestions: [{ ...q, question: "Which device's port is it?" }] });
    expect(quoted).toContain("'Which device''s port is it?'");
  });

  it("refuses a question on a topic the bank does not hold", () => {
    const [first] = N10_009_NEW_QUESTIONS;
    expect(() => buildN10009Migration({ ...input, newQuestions: [{ ...first, topic: "6.1" }] })).toThrow(/6\.1/);
  });

  it("corrects each live question only while it still reads as it did, and checks the correction before it commits", () => {
    const insert = sql.indexOf("insert into cert_questions");
    const afterCheck = sql.indexOf(`<> ${after} then`);
    for (const f of N10_009_LIVE_FIXES) {
      // Before anything changes: the live text, exactly as the correction was written against.
      const guard = sql.indexOf(`where id = '${f.id}' and certification_id = exam and is_active`);
      expect(guard, f.id).toBeGreaterThan(0);
      expect(guard, f.id).toBeLessThan(insert);
      expect(sql.slice(guard, guard + 4000), f.id).toContain(`and question_text = ${q(f.was.question)}`);
      // The correction itself.
      const update = sql.indexOf(`update cert_questions set`, guard);
      expect(sql.slice(update, sql.indexOf(`where id = '${f.id}';`, update)), f.id).toContain(`explanation = ${q(f.explanation)}`);
      if (f.question) expect(sql, f.id).toContain(`question_text = ${q(f.question)}`);
      if (f.options) expect(sql, f.id).toContain(`correct_index = ${f.answer}`);
      // After it: the new text is in place.
      expect(sql.lastIndexOf(`where id = '${f.id}' and is_active`), f.id).toBeGreaterThan(afterCheck);
    }
  });

  it("refuses a correction whose options have no answer, or whose answer has no options", () => {
    const [fix] = N10_009_LIVE_FIXES;
    const options = ["One", "Two", "Three", "Four"] as const;
    expect(() => buildN10009Migration({ ...input, liveFixes: [{ ...fix, options, answer: undefined }] })).toThrow(/answer/);
    expect(() => buildN10009Migration({ ...input, liveFixes: [{ ...fix, options: undefined, answer: 1 }] })).toThrow(/options/);
  });
});
