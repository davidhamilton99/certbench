# CertBench

CertBench is an independent study program for the CompTIA Security+, Network+ and A+ exams. It works through each exam topic by topic in short steps, with hands-on labs, a readiness checkpoint and a full-length timed practice exam. It is free to start. The site is [certbench.dev](https://certbench.dev).

There is a study path for each of five exams: Security+ SY0-701, Security+ SY0-801, Network+ N10-009, A+ Core 1 220-1201 and A+ Core 2 220-1202.

CertBench is not affiliated with, endorsed by or sponsored by CompTIA. CompTIA, Security+, Network+ and A+ are trademarks of CompTIA, Inc., and are used here only to identify the exams.

## Stack

- Next.js 16 (App Router, React 19), hosted on Vercel
- Supabase: Postgres with row level security, and Auth (password and Google OAuth)
- Tailwind CSS 4, with a token system in the style of shadcn/ui for the light and dark themes
- Zod 4: typed API contracts that the client and the server share
- Stripe: Pro subscriptions (checkout, the billing portal, and a webhook that keeps each subscription in step)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layering rules and for how a deployment is built and rolled back, [docs/DATABASE.md](docs/DATABASE.md) for the schema contract, and [docs/HOUSE-STYLE.md](docs/HOUSE-STYLE.md) for the words the site uses and the names that the code and the analytics keep.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values (see below)
npm run dev                  # http://localhost:3000
```

These variables are required in `.env.local` for a working app:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The Supabase project (access limited by row level security) |
| `SUPABASE_SERVICE_ROLE_KEY` | The admin client (webhook, rate limiter, account deletion) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `STRIPE_PRO_PRICE_ID` | Billing (use test keys locally) |

`src/env.ts` is the authority: public variables are validated when the app starts and secrets where they are used, so a missing Stripe key never breaks a feature that does not use Stripe.

Note: the Supabase free tier pauses the project after inactivity, which drops its DNS records. If the database is unreachable, resume it from the Supabase dashboard.

## Commands

```bash
npm run dev            # dev server
npm run build          # production build
npm test               # vitest (the behavior locks in src/core, and the contract tests)
npm run lint           # eslint (includes the architecture boundary rules)
npm run typecheck      # tsc --noEmit
npm run db:types       # regenerate src/types/database.gen.ts (needs SUPABASE_ACCESS_TOKEN)
npm run db:types:check # CI drift check against the live schema
```

## Deployment

Pushes to `main` deploy to production through Vercel. Preview deployments run against the **same production database** (row level security confines writes to the acting user), so use dedicated `+test` accounts on previews and test-mode Stripe keys in the Preview environment. New migrations in `supabase/migrations/` must be additive, and they are applied by hand in the Supabase SQL editor.

Every build reads the production database, and a build fails when the database cannot be read. The section [Builds read the production database](docs/ARCHITECTURE.md#builds-read-the-production-database) in docs/ARCHITECTURE.md says what that means during an outage and how to roll back.
