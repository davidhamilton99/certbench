# CertBench

Adaptive exam prep for CompTIA certifications — live at [certbench.dev](https://certbench.dev).

CertBench builds a personalised daily study plan from your actual performance: a
confidence-penalised readiness score, adaptive practice exams, SM-2 spaced
repetition, hands-on PBQ simulations, and AI-generated study sets from your own
notes.

**Certifications:** Security+ SY0-701 · Network+ N10-009 · A+ Core 1 220-1101 · A+ Core 2 220-1102

## Stack

- **Next.js 16** (App Router, React 19) on **Vercel**
- **Supabase** — Postgres (RLS everywhere) + Auth (password & Google OAuth)
- **Tailwind CSS v4** with a shadcn-style token system (light + dark)
- **Zod v4** — end-to-end typed API contracts shared client/server
- **Anthropic API** — AI question generation with a two-pass quality review
- **Stripe** — Pro subscriptions (checkout, portal, webhook sync)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the layering rules and
[docs/DATABASE.md](docs/DATABASE.md) for the schema contract.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Required in `.env.local` for a working app:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (RLS-scoped access) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client (webhook, rate limiter, account deletion) |
| `ANTHROPIC_API_KEY` | AI question generation (503s cleanly if absent) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRO_PRICE_ID` | Billing (use TEST keys locally) |

`src/env.ts` is the authority: public vars are validated at boot, secrets at
point of use — a missing Stripe key never breaks non-Stripe features.

Note: the Supabase free tier pauses the project after inactivity, which drops
its DNS records. If the DB is unreachable, resume it from the Supabase
dashboard.

## Commands

```bash
npm run dev            # dev server
npm run build          # production build
npm test               # vitest (core behavioural locks + contract tests)
npm run lint           # eslint (includes architecture-boundary rules)
npm run typecheck      # tsc --noEmit
npm run db:types       # regenerate src/types/database.gen.ts (needs SUPABASE_ACCESS_TOKEN)
npm run db:types:check # CI drift check against the live schema
```

## Deployment

Pushes to `main` deploy to production via Vercel. Preview deployments run
against the **same production database** (RLS confines writes to the acting
user) — use dedicated `+test` accounts on previews and TEST-mode Stripe keys in
the Preview environment. New migrations in `supabase/migrations/` must be
additive and are applied manually via the Supabase SQL editor.
