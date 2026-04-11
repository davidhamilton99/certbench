# CertBench

Certification preparation platform for CompTIA exams. Built to help IT students know exactly what to study and when they are ready for exam day.

Live at [certbench.dev](https://certbench.dev).

## Supported Certifications

- CompTIA Security+ SY0-701
- CompTIA Network+ N10-009
- CompTIA A+ Core 1 (220-1101)
- CompTIA A+ Core 2 (220-1102)

## Features

- **Diagnostic Exam** -- 25-question assessment across all domains to identify strengths and gaps
- **Readiness Score** -- Domain-weighted, confidence-penalised score (0-100) that tells you when you are ready
- **Daily Study Plan** -- Prioritised sessions generated from your performance data
- **Practice Exams** -- Full 90-question exams, 10-question domain drills, and weak-points mode
- **Spaced Repetition (SRS)** -- SM-2 algorithm schedules questions you got wrong for review at optimal intervals
- **Performance-Based Questions** -- Ordering, matching, categorization, simulations, and network topology labs
- **AI Quiz Generation** -- Upload PDF, DOCX, or text and generate quiz questions with Claude
- **Community Study Sets** -- Share and discover study materials created by other users
- **Reference Tables** -- Ports, protocols, OSI model, commands, and more
- **Question Flagging** -- Students can flag questions; admins review and manage flags

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Payments:** Stripe (free tier + pro subscription)
- **AI:** Anthropic Claude API (Sonnet for generation, Haiku for explanations)
- **Styling:** Tailwind CSS 4
- **Deployment:** Vercel
- **CI:** GitHub Actions (lint, typecheck, build, test)
- **Testing:** Vitest

## Quick Start

See [SETUP.md](SETUP.md) for full setup instructions.

```bash
git clone https://github.com/davidhamilton99/certbench.git
cd certbench
npm install
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

## Project Structure

```
src/
  app/           # Next.js App Router (pages, layouts, API routes)
  components/    # React components (auth, marketing, workspace, ui)
  lib/           # Business logic (readiness, SRS, session plan, AI, Supabase)
  constants/     # Configuration constants
  data/          # Seeded content (PBQ scenarios, reference tables)
supabase/
  migrations/    # PostgreSQL schema and seed data
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for coding conventions and development guidelines.

## Content

2,376 multiple-choice questions seeded across all four certifications, plus performance-based questions (ordering, matching, categorization, simulations, topology labs) and 20+ reference tables.

## Legal

CompTIA, Security+, Network+, and A+ are registered trademarks of CompTIA, Inc. CertBench is not affiliated with or endorsed by CompTIA.
