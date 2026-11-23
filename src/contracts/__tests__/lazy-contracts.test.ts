import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as client from "../client";
import type { EndpointContract } from "../common";
import { isLazyContract, warmContracts, type LazyContract } from "../lazy";

/**
 * A lazy contract writes an endpoint's path and method a second time, apart
 * from the contract that owns them. This holds every pair to its contract, so
 * the two cannot drift.
 */
describe("lazy contracts", () => {
  const entries = Object.entries(client);

  it("names the endpoints public pages call", () => {
    expect(entries.length).toBeGreaterThanOrEqual(20);
    for (const [, value] of entries) expect(isLazyContract(value)).toBe(true);
  });

  it("names the endpoints that a shared study set and the exam story call", () => {
    expect(Object.keys(client)).toEqual(
      expect.arrayContaining([
        "saveSetProgress",
        "clearSetProgress",
        "recordCommunityAttempt",
        "toggleBookmark",
        "reportCommunitySet",
        "submitStory",
      ])
    );
  });

  it.each(entries)("%s has the path and method of its contract", async (name, lazy) => {
    const full = await lazy.load();
    expect(full, name).toBeTruthy();
    expect(lazy.path).toBe(full.path);
    expect(lazy.method).toBe(full.method);
    expect(typeof full.output.parse).toBe("function");
  });
});

/**
 * /share/[setId] and /story are public pages outside the public frame, reached
 * from a link someone was sent, often on a phone. Their client components
 * call endpoints, and a contract imported as a value brings the whole schema
 * library into the page's first load. So each of them names its endpoints
 * through ../client, and nothing it imports statically reaches the library.
 *
 * This walks the static imports of each component as the bundler does: an
 * `import type` and a specifier marked `type` are erased, and a dynamic
 * `import()` is a separate file fetched later, so neither is followed.
 */
describe("the client components of the shared study set and the exam story", () => {
  const ROOT = process.cwd();
  const SCHEMA_LIBRARY = /^zod(\/|$)/;
  const COMPONENTS = [
    "src/components/quiz/StudySetPlayer.tsx",
    "src/components/workspace/CommunitySetActions.tsx",
    "src/components/story/StoryForm.tsx",
  ];

  const isFile = (path: string) => existsSync(path) && statSync(path).isFile();

  /** The source file a specifier names, or null for a package. */
  function fileFor(from: string, specifier: string): string | null {
    const base = specifier.startsWith("@/")
      ? join(ROOT, "src", specifier.slice(2))
      : specifier.startsWith(".")
        ? resolve(dirname(from), specifier)
        : null;
    if (!base) return null;
    const found = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.js`,
      `${base}.mjs`,
      join(base, "index.ts"),
      join(base, "index.tsx"),
    ].find(isFile);
    if (!found) throw new Error(`${specifier}, imported by ${from}, was not found`);
    return found;
  }

  /** The modules a file imports for their values, as the specifiers it wrote. */
  function valueImports(file: string, source = readFileSync(file, "utf8")): string[] {
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const specifiers: string[] = [];
    for (const statement of parsed.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const clause = statement.importClause;
        const named = clause?.namedBindings;
        const typesOnly =
          !!clause &&
          (clause.isTypeOnly ||
            (!clause.name && !!named && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every((e) => e.isTypeOnly)));
        if (!typesOnly) specifiers.push(statement.moduleSpecifier.text);
      } else if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        !statement.isTypeOnly
      ) {
        specifiers.push(statement.moduleSpecifier.text);
      }
    }
    return specifiers;
  }

  const shown = (file: string) => relative(ROOT, file).replace(/\\/g, "/");

  /** Every place the schema library is reached from a component, as "file imports zod, by way of ...". */
  function schemaLibraryReached(component: string): string[] {
    const start = join(ROOT, component);
    const via = new Map<string, string | null>([[start, null]]);
    const queue = [start];
    const hits: string[] = [];
    while (queue.length > 0) {
      const file = queue.pop() as string;
      for (const specifier of valueImports(file)) {
        if (SCHEMA_LIBRARY.test(specifier)) {
          const chain = [shown(file)];
          for (let at = via.get(file); at; at = via.get(at)) chain.push(shown(at));
          hits.push(`${chain[0]} imports ${specifier}, by way of ${chain.slice(1).join(", then ") || "nothing: it is the component itself"}`);
          continue;
        }
        const next = fileFor(file, specifier);
        if (next && !via.has(next)) {
          via.set(next, file);
          queue.push(next);
        }
      }
    }
    return hits;
  }

  it("the check sees a value import, and looks past a type import and a dynamic one", () => {
    const text = [
      'import { api } from "@/lib/api-client";',
      'import type { StudyQuestion } from "@/contracts/study-sets";',
      'import { type ApiErrorCode } from "@/contracts/errors";',
      'import { saveSetProgress, type StudyQuestion as Q } from "@/contracts/study-sets";',
      'import * as community from "@/contracts/community";',
      'import "./side-effect";',
      'export { submitStory } from "@/contracts/story";',
      'export type { EndpointContract } from "@/contracts/common";',
      'const later = () => import("@/contracts/path");',
    ].join("\n");
    expect(valueImports(join(ROOT, "src", "made-up.tsx"), text)).toEqual([
      "@/lib/api-client",
      "@/contracts/study-sets",
      "@/contracts/community",
      "./side-effect",
      "@/contracts/story",
    ]);
  });

  it("the check finds the schema library behind a contract that is imported as a value", () => {
    // The contract modules themselves import it: this is what the components must not reach.
    expect(schemaLibraryReached("src/contracts/study-sets.ts").length).toBeGreaterThan(0);
    expect(schemaLibraryReached("src/contracts/community.ts")[0]).toContain("src/contracts/community.ts imports zod");
    expect(schemaLibraryReached("src/contracts/story.ts")[0]).toContain("src/contracts/story.ts imports zod");
    // The file that names the endpoints for a page reaches it only through import(), which is fetched later.
    expect(schemaLibraryReached("src/contracts/client.ts")).toEqual([]);
  });

  it.each(COMPONENTS)("%s reaches no schema library in its first load", (component) => {
    expect(schemaLibraryReached(component)).toEqual([]);
  });
});

describe("warmContracts", () => {
  /** A lazy contract whose fetch is watched. */
  const watched = (load: () => Promise<EndpointContract>): LazyContract => ({ path: "/api/thing", method: "POST", load });

  it("fetches each endpoint's schemas in the background", () => {
    const loads = [
      vi.fn((): Promise<EndpointContract> => client.getPathProgress.load()),
      vi.fn((): Promise<EndpointContract> => client.savePathProgress.load()),
    ];
    warmContracts(loads.map(watched));
    for (const load of loads) expect(load).toHaveBeenCalledOnce();
  });

  it("leaves a failed fetch for the first real call, without an unhandled rejection", async () => {
    const load = vi.fn(async (): Promise<EndpointContract> => {
      throw new Error("Failed to fetch dynamically imported module");
    });
    expect(() => warmContracts([watched(load)])).not.toThrow();
    // The rejection is consumed inside: give it a turn to surface if it were not.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(load).toHaveBeenCalledOnce();
  });
});
