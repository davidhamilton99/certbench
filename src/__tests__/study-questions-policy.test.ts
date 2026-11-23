import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Migration 035 (supabase/migrations/035_study_questions_policy.sql, written
 * and not run) lets an account write questions only into a study set of its
 * own. Until it is run, the policy of migration 001 checks only the row's own
 * user_id, so any account can put a question into another member's set, and a
 * public set shows it to everyone.
 *
 * Once the owner has run it, the database refuses any other write. These tests
 * keep the migration as it was reviewed, and fail if the application begins to
 * write study questions somewhere new, which would have to be checked against
 * the policy first.
 */
const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase/migrations");
const FILE = "035_study_questions_policy.sql";

const lines = (file: string) => readFileSync(join(MIGRATIONS, file), "utf8").split(/\r?\n/);

/** A migration's statements, without its comments. */
const statements = (file: string) =>
  lines(file)
    .filter((line) => !line.trim().startsWith("--"))
    .join(" ")
    .split(";")
    .map((statement) => statement.replace(/\s+/g, " ").trim().toLowerCase())
    .filter(Boolean);

/** The study set check that both halves of the new policy must hold. */
const OWN_SET =
  "auth.uid() = user_id and exists ( select 1 from public.user_study_sets s where s.id = user_study_questions.study_set_id and s.user_id = auth.uid() )";

describe("migration 035: study questions go only into the writer's own set", () => {
  it("replaces the one policy, in one transaction, with the set's owner checked on read and on write", () => {
    expect(statements(FILE)).toEqual([
      "begin",
      'drop policy if exists "users manage own study questions" on public.user_study_questions',
      `create policy "users manage own study questions" on public.user_study_questions for all using ( ${OWN_SET} ) with check ( ${OWN_SET} )`,
      "commit",
    ]);
  });

  it("is headed by the read-only query of the policies, before any statement", () => {
    const text = lines(FILE);
    const query = text.findIndex((line) => line.includes("from pg_policies"));
    const firstStatement = text.findIndex((line) => line.trim().toLowerCase() === "begin;");
    expect(query).toBeGreaterThan(-1);
    expect(text[query].trim().startsWith("--")).toBe(true);
    expect(query).toBeLessThan(firstStatement);
  });

  it("replaces the policy that migration 001 made, which checked only the row's user_id", () => {
    const made = statements("001_complete_schema.sql").find((s) =>
      s.startsWith('create policy "users manage own study questions"')
    );
    expect(made).toBe('create policy "users manage own study questions" on user_study_questions for all using (auth.uid() = user_id)');
  });

  it("leaves the counters of a study set alone: they are a separate decision", () => {
    for (const statement of statements(FILE)) {
      expect(statement).not.toMatch(/user_study_sets\b(?! s where)/);
      expect(statement).not.toMatch(/increment_attempt_count|update_bookmark_count|grant|revoke/);
    }
  });

  // If this fails, a file has begun to use the study questions table. Before
  // migration 035 is run, check that every write it makes goes into a set that
  // the signed-in account owns, or the database will refuse it.
  it("finds the study questions table used by the study sets data module only", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") walk(path);
        } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
          if (readFileSync(path, "utf8").includes("user_study_questions")) {
            files.push(relative(ROOT, path).replace(/\\/g, "/"));
          }
        }
      }
    };
    walk(join(ROOT, "src"));
    expect(files.sort()).toEqual(["src/server/data/study-sets.ts", "src/types/database.gen.ts"]);
  });
});
