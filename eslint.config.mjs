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
    files: ["src/components/**/*.{ts,tsx}", "src/lib/**/*.ts"],
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
]);

export default eslintConfig;
