# Architecture

Rebuilt from scratch in 2026-07 on the `rebuild` branch. The production
database was preserved as the immutable contract; every line of application
code is new or a deliberate behaviour-preserving port.

## Layering

```
src/
  app/         Routes only — thin pages and route handlers, no business logic
  core/        PURE domain logic: no React, no Next, no Supabase, no IO
  contracts/   Zod schemas shared client+server — the typed API contract
  server/      "server-only": endpoint factory, auth guards, repositories,
               services, Supabase clients, rate limiter, Stripe, email
  components/  ui/ primitives (shadcn-style) + domain components
  data/        Static content: reference tables, PBQ scenarios
  lib/         Isomorphic utils: typed api-client, cn, supabase browser client
```

Boundaries are enforced by ESLint `no-restricted-imports` rules in
`eslint.config.mjs`:

- `core` imports nothing from server/app/components/lib, and no React/Next/Supabase
- `contracts` may import only zod and core types
- client layers (`components`, `lib`) may never import `@/server`

## The API contract system

Every endpoint is described once, in `src/contracts/*`:

```ts
export const startDiagnostic = {
  path: "/api/diagnostic/start",
  method: "POST",
  input: z.object({ certId: z.uuid() }),
  output: z.object({ ... }),
} as const satisfies EndpointContract;
```

The route handler wraps it with `defineEndpoint(contract, { auth, rateLimit,
handler })` (`src/server/api/define-endpoint.ts`), which runs the pipeline:
**auth gate → rate limit → input parse (400) → handler → output drift check
(dev only) → JSON**. Errors are always the uniform envelope
`{ error: { code, message } }` with codes mapped to HTTP status.

Client components call `api(contract, input)` from `src/lib/api-client.ts` —
the return type is inferred from the contract and the response is
runtime-validated. There is no manual casting anywhere.

**One documented exception** is a plain route handler: the Stripe webhook
(raw-body signature verification).

## Data fetching

Exactly two idioms:

1. **Reads:** Server Components call repository functions in `src/server/data/*`
   directly (no HTTP hop). Repositories are the only place `.from("table")`
   appears; they take the RLS-scoped client and return domain types.
2. **Writes/streams:** client components use the typed `api()` client, then
   `router.refresh()`.

Three Supabase clients exist (`src/server/supabase/`): browser (auth UI only),
server (cookie-bound, RLS-scoped — the default), and admin (service role —
confined to the webhook, rate limiter, admin actions, and account deletion).

## Behaviour-locked algorithms (`src/core/`)

These wrote the historical data in `question_performance` and
`readiness_snapshots`; their outputs must not change for the same inputs. Each
is covered by tests ported verbatim from the previous app:

- **Readiness** (`core/readiness`) — domain-weighted, confidence-penalised
  score; `min(1, attempted/15)` confidence factor; deliberately does NOT
  normalise by studied weight (partial coverage must not inflate the score).
- **SRS** (`core/srs`) — modified SM-2: 1d → 6d → interval×ease, capped at
  30d; ease 2.5 default, −0.2 per miss, floor 1.3.
- **Question selection** (`core/question-selection`) — diagnostic proportional
  to domain weights; practice bucketing (unseen → incorrect → correct) with
  soft difficulty targeting; weak-points = previously-missed only.
- **Session planner** (`core/session-plan`) — gates everything behind the
  diagnostic, then orders blocks: due SRS, weakest domain, exam-urgency
  blocks, weak points, cadenced full exam, unseen content.
- **PBQ grading** (`core/pbq`) — partial credit per item/field; pre-configured
  topology devices penalise being touched.
- **The write path** (`server/services/submit-exam.ts`) — SRS-aware
  performance upsert + readiness snapshot, ported line-for-line.

## The quiz engine

One pure reducer (`core/quiz-engine/machine.ts`) drives every quiz surface via
`QuizConfig` (grading timing, flagging, review screen). Option order is a
seeded Fisher–Yates permutation (seed travels with the persisted snapshot), so
resumed attempts render identically on any device. Server-graded attempts
persist their snapshot (including the selected question ids) to
`progress_state` on the attempt row, and for these attempts the database is
the single source of truth. Other parts of the app do keep state in the
browser's localStorage: the study path's copy of its progress on the device
(`src/components/path/local-path.ts`), a practice exam in progress
(`src/components/path/rehearsal-run.ts`), the drills and Recall. Renderers are
fully controlled components; grading never depends on display order.

Surfaces: diagnostic + practice exams (server-graded at submit, answers never
sent to the client mid-attempt), SRS (server-graded per card), study sets and
community (client-graded immediate feedback via `core/study-materials/grade`).

## Security notes

- All user tables are RLS-protected; the anon key is safe to expose.
- Exam questions are served without `correct_index`/`explanation` until the
  attempt is submitted.
- The rate limiter is a Postgres fixed-window function (`check_rate_limit`,
  migration 020) called via the service role; it fails open so a limiter
  outage can't take the product down.
- `src/env.ts` validates public vars at boot and secrets at point of use.

## Builds read the production database

`next build` reads the production database, with the public key, to make the
pages it prerenders: the home page, `/educators`, the public practice exam
pages, the objective pages, the readiness checks, the five study path pages
and the sitemap. Preview builds, and the build step of
`.github/workflows/ci.yml`, read the same database.

A read that fails is not hidden: it throws, and the build stops (see the
comments in `src/server/path/inventory.ts`, `src/server/path/bank.ts` and
`src/app/sitemap.ts`). Vercel assigns the production domain to a deployment
only after its build has succeeded, so while the database cannot be read
nothing new can be deployed, and the deployment that is live stays live. Once
a page is live, a rebuild on its timer that fails leaves the last good copy in
place, and Next.js tries again on a later request.

To replace a faulty live deployment with an earlier one:

1. In the Vercel dashboard, open the project and choose Instant Rollback on its
   Production Deployment tile, or in the menu of an earlier production
   deployment in the Deployments list. From the command line, run
   `vercel rollback <deployment-url-or-id>`. On the Hobby plan, only the
   previous production deployment can be chosen. The deployment rolled back to
   keeps the environment variables it was built with.
2. After a rollback, Vercel stops assigning the production domain to new
   deployments, so a push to `main` does not go live. When a corrected
   deployment is ready, promote it (the Manage button on the Production
   Deployment tile, or `vercel promote <deployment-url-or-id>`); this turns
   the automatic assignment back on.

If a build failed because the database could not be read, make the database
reachable again first (a paused Supabase project is resumed from the Supabase
dashboard), and then deploy again.
