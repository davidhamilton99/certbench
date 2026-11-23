import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees and one-off maintenance scripts:
    ".claude/**",
    "scripts/**",
    // Working papers, which git ignores as well (see .gitignore):
    "reviews/**",
  ]),

  // ── Architecture layering rules ──────────────────────────────────────
  // core: pure domain logic. No React, no IO, no server/app/component code.
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/app/*", "@/components/*", "@/lib/*"],
              message:
                "src/core must stay pure — no server, app, component, or lib imports.",
            },
            {
              group: ["react", "react-dom", "next", "next/*", "@supabase/*"],
              message: "src/core must not depend on React, Next.js, or Supabase.",
            },
          ],
        },
      ],
    },
  },
  // contracts: Zod schemas shared client+server. Only zod + core types.
  {
    files: ["src/contracts/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "@/app/*", "@/components/*", "@/lib/*"],
              message:
                "src/contracts is shared client+server — only zod and @/core types allowed.",
            },
          ],
        },
      ],
    },
  },
  // client code must never touch the server layer directly.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*"],
              message:
                "Client layers must not import @/server — call an API contract or receive data via props.",
            },
          ],
        },
      ],
    },
  },
  // server: the database, the secrets and the answer keys. The app and the
  // components depend on it; it never depends on them, not even for a type.
  // A shape that both sides need (what a loader hands to a component) lives
  // in src/core, where each side imports it.
  {
    files: ["src/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/*", "@/app/*"],
              message:
                "src/server must not import from components or the app, types included. Put a shape that both sides need in src/core.",
            },
            {
              // The same two layers reached by a relative path.
              regex: "^(?:\\.\\./)+(?:components|app)/",
              message:
                "src/server must not import from components or the app, types included. Put a shape that both sides need in src/core.",
            },
          ],
        },
      ],
    },
  },
  // data: authored content (questions, labs, titles). It may use src/core and
  // other data. From any other layer it may take a type and nothing else, so
  // that content never pulls a component, a page or server code in with it.
  {
    files: ["src/data/**/*.{ts,tsx}"],
    // A test checks content against the layers that use it, so it may import them.
    ignores: ["src/data/**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*", "!@/core", "!@/core/**", "!@/data", "!@/data/**"],
              allowTypeImports: true,
              message: "src/data may import only @/core, @/data and types.",
            },
            {
              // The other layers reached by a relative path.
              regex: "^(?:\\.\\./)+(?:server|app|components|lib|contracts)/",
              allowTypeImports: true,
              message: "src/data may import only @/core, @/data and types.",
            },
          ],
        },
      ],
    },
  },
  // Four data files took a function from src/lib before the rule above
  // existed: the recall decks use the recall engine (@/lib/recall/recall-deck)
  // and the A+ redirects use codeToSlug (lib/seo/objective-code). Both belong
  // in src/core. Until they move, the rule is off for these files only, so
  // that it holds for every other one. Remove a line when its import has moved.
  {
    files: [
      "src/data/a-plus-v15/redirects.ts",
      "src/data/recall/index.ts",
      "src/data/recall/a-plus-core1-220-1201.ts",
      "src/data/recall/network-plus-n10-009.ts",
    ],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
