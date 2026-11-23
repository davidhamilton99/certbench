import { join } from "node:path";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * The layering rule in eslint.config.mjs that keeps client code away from the
 * server, applied as `npm run lint` applies it. A rule that names its files by
 * a glob is easy to narrow by accident: "src/lib/**" with only ".ts" left every
 * .tsx file in src/lib free to import server code.
 */
const ROOT = process.cwd();

/** One line that imports the server layer, as a client file must not. */
const SERVER_IMPORT = 'import { getPageSession } from "@/server/auth";\nexport const session = getPageSession;\n';
/** One line that imports another part of src/lib, which any layer may. */
const LIB_IMPORT = 'import { READINESS_TARGET } from "@/lib/readiness/band";\nexport const target = READINESS_TARGET;\n';

/** Files that do not exist: ESLint takes the path only to choose the rules that apply to it. */
const CLIENT_FILES = [
  "src/lib/probe.ts",
  "src/lib/probe.tsx",
  "src/lib/og/probe.tsx",
  "src/components/probe.tsx",
  "src/components/path/probe.ts",
];
const SERVER_SIDE_FILE = "src/app/probe.tsx";
/** The two .tsx files that src/lib holds today. */
const LIB_TSX_FILES = ["src/lib/keep-codes.tsx", "src/lib/og/mark.tsx"];

/** The messages of the import rule for a piece of source, as if it were the file at `file`. */
const found = new Map<string, string[]>();

beforeAll(async () => {
  const eslint = new ESLint({ cwd: ROOT });
  const restricted = (messages: { ruleId: string | null; message: string }[]) =>
    messages.filter((m) => m.ruleId === "no-restricted-imports").map((m) => m.message);

  for (const file of [...CLIENT_FILES, SERVER_SIDE_FILE]) {
    const [server] = await eslint.lintText(SERVER_IMPORT, { filePath: join(ROOT, file) });
    found.set(`server:${file}`, restricted(server.messages));
    const [lib] = await eslint.lintText(LIB_IMPORT, { filePath: join(ROOT, file) });
    found.set(`lib:${file}`, restricted(lib.messages));
  }
  for (const result of await eslint.lintFiles(LIB_TSX_FILES.map((file) => join(ROOT, file)))) {
    found.set(`file:${result.filePath}`, restricted(result.messages));
  }
}, 120_000);

describe("the rule that keeps client code away from the server", () => {
  it.each(CLIENT_FILES)("refuses an import of @/server in %s", (file) => {
    const messages = found.get(`server:${file}`) ?? [];
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Client layers must not import @/server");
  });

  it.each(CLIENT_FILES)("allows an import of another part of src/lib in %s", (file) => {
    expect(found.get(`lib:${file}`)).toEqual([]);
  });

  it("does not apply to the app, which reads the server on purpose", () => {
    expect(found.get(`server:${SERVER_SIDE_FILE}`)).toEqual([]);
  });

  it("finds nothing in the .tsx files that src/lib holds today", () => {
    const results = [...found.entries()].filter(([key]) => key.startsWith("file:"));
    expect(results).toHaveLength(LIB_TSX_FILES.length);
    for (const [key, messages] of results) expect(messages, key).toEqual([]);
  });
});
