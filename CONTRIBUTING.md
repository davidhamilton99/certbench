# Contributing to CertBench

## Development Environment

```bash
npm install
cp .env.example .env.local
# Fill in Supabase credentials
npm run dev
```

## Code Standards

### TypeScript

- Strict mode is enabled. Do not use `any` unless absolutely necessary.
- Use `unknown` and narrow types explicitly.
- Zod is used for runtime validation at API boundaries.

### Styling

CertBench follows a **Bloomberg terminal aesthetic**:

- White background, near-black text (`text-text-primary`)
- `#2563eb` blue for primary CTAs only -- not for decoration
- No gamification: no XP, streaks, fire emojis, level badges
- No purple, gradients, or glassmorphism
- Fonts: Instrument Sans for display text, IBM Plex Mono for data/numbers
- Use Tailwind utility classes. No custom CSS files.

### Components

- Components live in `src/components/` grouped by domain: `auth/`, `marketing/`, `workspace/`, `ui/`
- Reusable primitives (`Button`, `Card`, `Input`, `Badge`, etc.) go in `ui/`
- Use `"use client"` only when the component needs browser APIs or React state
- Keep server components as the default

### API Routes

- All routes are in `src/app/api/`
- Wrap handlers with `withErrorHandler` from `@/lib/api/errors` for consistent error handling
- Validate input with Zod schemas using `safeParse()`
- Check authentication first, return 401 if missing
- Use proper HTTP status codes (400, 401, 403, 404, 409, 429, 500)
- Apply rate limiting to expensive operations (AI calls, community actions)

### Database

- All schema changes go through numbered migration files in `supabase/migrations/`
- Row Level Security (RLS) is enforced on all tables
- Certification content is publicly readable; user data is owner-only
- User study materials and certification questions are completely separate -- no foreign keys between them

## Testing

Tests use [Vitest](https://vitest.dev/) and live alongside source files in `__tests__/` directories.

```bash
npm test          # Run all tests
npm run test:watch  # Watch mode
```

Test the core algorithms directly (readiness score, SRS, question selection, PBQ grading). These are pure functions with no database dependencies.

## CI/CD

GitHub Actions runs on every push to `main` and every pull request:

1. Install dependencies
2. ESLint
3. TypeScript type checking
4. Production build
5. Test suite

All checks must pass before merging.

## Commit Messages

Write concise commit messages that describe the "why" rather than the "what". Examples:

- `Fix diagnostic restart failing when abandoned attempt exists`
- `Add rate limiting to community report endpoint`
- `Improve readiness score accuracy for low sample sizes`

## Architecture Decisions

- **Cert questions vs user study materials are separate.** Different tables, no foreign keys. This is intentional -- cert content is admin-managed and public; study materials are user-generated and personal.
- **Readiness score is confidence-penalised.** Scoring 100% on 3 questions does not mean you are ready. The confidence factor scales with sample size.
- **SRS intervals are capped at 30 days.** This is exam prep, not lifetime learning. Students need frequent review.
- **AI features are optional.** The app works fully without an Anthropic API key. AI generation is metered (3 free/month, unlimited on Pro).
