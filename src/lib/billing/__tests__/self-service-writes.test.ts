import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Migration 031 (supabase/migrations/031_restrict_self_service_writes.sql)
 * stops a signed-in account from inserting its own subscription row, and lets
 * it update three columns of its own profile and nothing else.
 *
 * Once the owner has run it, the database refuses any other write that the
 * application makes with an account's own session ("permission denied"), and
 * nothing in the code would say so before production does. These tests keep
 * the migration and the code in step:
 *
 *  - a profile column that the application writes must be one the migration
 *    grants, and `role` must never be granted;
 *  - subscription rows are written with the service role only.
 */
const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/031_restrict_self_service_writes.sql";

const WRITES = new Set(["insert", "update", "upsert", "delete"]);

interface TableWrite {
  file: string;
  /** What `.from("<table>")` was called on: `db`, `adminDb`, ... */
  client: string;
  method: string;
  /** The keys of the object that was written. */
  columns: string[];
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(child);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

/** Every `<client>.from("<table>").insert|update|upsert|delete(...)` in the application. */
function writesTo(table: string): TableWrite[] {
  const found: TableWrite[] = [];
  for (const path of sources(join(ROOT, "src"))) {
    const source = readFileSync(path, "utf8");
    if (!source.includes(table)) continue;
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);

    const keys = (node: ts.Node, into: Set<string>) => {
      if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) into.add(node.name.getText());
      ts.forEachChild(node, (child) => keys(child, into));
    };
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        WRITES.has(node.expression.name.text)
      ) {
        // The call the write is made on: `<client>.from("<table>")`.
        const from = node.expression.expression;
        if (
          ts.isCallExpression(from) &&
          ts.isPropertyAccessExpression(from.expression) &&
          from.expression.name.text === "from" &&
          from.arguments.length === 1 &&
          ts.isStringLiteralLike(from.arguments[0]) &&
          from.arguments[0].text === table
        ) {
          const columns = new Set<string>();
          if (node.arguments[0]) keys(node.arguments[0], columns);
          found.push({
            file: relative(ROOT, path).replace(/\\/g, "/"),
            client: from.expression.expression.getText(),
            method: node.expression.name.text,
            columns: [...columns].sort(),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return found;
}

/** The migration's statements, without its comments. */
const statements = readFileSync(join(ROOT, MIGRATION), "utf8")
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith("--"))
  .join(" ")
  .split(";")
  .map((statement) => statement.replace(/\s+/g, " ").trim().toLowerCase())
  .filter(Boolean);

/** The profile columns the migration lets a signed-in account update. */
const granted = (() => {
  const grant = statements.find((s) => s.startsWith("grant update"));
  const columns = grant?.match(/^grant update \(([^)]*)\) on public\.profiles to authenticated$/)?.[1];
  return (columns ?? "").split(",").map((c) => c.trim()).filter(Boolean).sort();
})();

describe("migration 031: what a signed-in account may write", () => {
  it("does exactly four things, in one transaction", () => {
    expect(statements).toEqual([
      "begin",
      'drop policy if exists "users insert own subscription" on public.user_subscriptions',
      "revoke update on public.profiles from authenticated",
      "grant update (display_name, onboarding_completed, updated_at) on public.profiles to authenticated",
      "commit",
    ]);
  });

  it("never lets an account change its own role", () => {
    expect(granted).not.toContain("role");
    // Nor the key of the row, or the dates the database keeps.
    expect(granted).not.toContain("id");
    expect(granted).not.toContain("created_at");
  });

  // If this fails, the application has begun to write a profile column with an
  // account's own session. Grant the column in a new migration (never `role`),
  // or make the write with the service role and list the file here.
  it("grants every profile column that the application writes with an account's session", () => {
    const writes = writesTo("profiles");
    expect(writes.map((w) => `${w.file}: ${w.method}`)).toEqual(["src/server/data/profiles.ts: update"]);
    expect(writes[0].columns).toEqual(granted);
  });

  // If this fails, something new writes subscription rows. That is what decides
  // who has Pro: it must use the service role (createAdminClient), because the
  // migration leaves an account no way to write that table.
  it("leaves subscription rows to the service role", () => {
    const writes = writesTo("user_subscriptions");
    expect([...new Set(writes.map((w) => w.file))].sort()).toEqual([
      "src/app/api/stripe/cert-checkout/route.ts",
      "src/app/api/stripe/checkout/route.ts",
      "src/app/api/stripe/webhook/route.ts",
    ]);
    for (const write of writes) {
      const source = readFileSync(join(ROOT, write.file), "utf8");
      expect(source, `${write.file}: ${write.client} is not the service-role client`).toContain(
        `const ${write.client} = createAdminClient();`
      );
    }
  });
});
