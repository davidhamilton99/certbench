# CertBench -- Setup Guide

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- A Supabase project (free tier works)
- (Optional) Stripe account for billing features
- (Optional) Anthropic API key for AI quiz generation

## Local Development

### 1. Clone and Install

```bash
git clone https://github.com/davidhamilton99/certbench.git
cd certbench
npm install
```

### 2. Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL (e.g. `https://xxxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase publishable anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (used for admin operations like account deletion, webhooks) |
| `ANTHROPIC_API_KEY` | No | Anthropic API key for AI quiz generation. Without this, the "Generate Quiz" feature is disabled but everything else works. |
| `STRIPE_SECRET_KEY` | No | Stripe secret key. Without this, all users get free-tier access with no billing. |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret for subscription events |
| `STRIPE_PRO_PRICE_ID` | No | Stripe price ID for the Pro subscription plan |
| `NEXT_PUBLIC_APP_URL` | No | App URL for Stripe redirect URLs. Defaults to `http://localhost:3000` |

For a minimal setup (no AI, no billing), you only need the three Supabase variables.

### 3. Database Setup

CertBench uses Supabase (PostgreSQL). The database schema and seed data are managed through migration files in `supabase/migrations/`.

**Option A: Supabase Dashboard (recommended for first setup)**

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order (001 through 015)
4. The migrations create all tables, indexes, RLS policies, and seed 2,376 questions

**Option B: Supabase CLI**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Seeded Content

After running migrations, the database contains:

- **4 certifications:** Security+ SY0-701, Network+ N10-009, A+ Core 1 (220-1101), A+ Core 2 (220-1102)
- **2,376 multiple-choice questions** distributed across all certifications and domains
- **Domain objectives and sub-objectives** for each certification
- **RLS policies** that protect user data while keeping certification content publicly readable

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript compiler checks |
| `npm test` | Run test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Deployment (Vercel)

1. Push the repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings (same as `.env.local`)
4. Vercel auto-deploys on push to `main`

For a custom domain, configure it in Vercel project settings under Domains.

## Architecture Overview

```
src/
  app/
    (marketing)/     # Public pages: landing, pricing, help, contact, legal
    (auth)/          # Login, register, onboarding, password reset
    (workspace)/     # Protected pages: dashboard, exams, study materials, etc.
    api/             # API routes (exam start/submit, SRS, AI generation, Stripe)
  components/
    auth/            # Auth forms and guards
    marketing/       # Landing page sections
    workspace/       # Dashboard, exam, study material components
    ui/              # Reusable primitives (Button, Card, Input, Badge, etc.)
  lib/
    readiness/       # Readiness score algorithm (domain-weighted, confidence-penalised)
    srs/             # Spaced repetition (modified SM-2)
    session/         # Daily study plan generator
    question-selection/  # Diagnostic and practice exam question selection
    pbq/             # Performance-based question grading
    ai/              # Anthropic Claude API integration
    supabase/        # Supabase client (browser + server)
    stripe/          # Stripe client configuration
  data/
    pbq/             # PBQ scenario definitions (per certification)
    reference/       # Reference table data (ports, protocols, commands, etc.)
```

## Key Concepts

**Readiness Score:** A 0-100 score computed from domain-weighted accuracy, penalised by a confidence factor when sample sizes are low. Marks itself as "preliminary" until enough questions are answered per domain.

**Spaced Repetition (SRS):** Uses a modified SM-2 algorithm. Correct answers increase the review interval; incorrect answers reset it to 1 day. Ease factor (minimum 1.3) adjusts how fast intervals grow. Capped at 30 days for exam prep.

**Session Plan:** The daily study plan examines your performance data and recommends what to study today: SRS reviews, domain drills for weak areas, practice exams on a cadence, and diagnostic if not yet completed.

**Diagnostic vs Practice Exam:** The diagnostic is a one-time 25-question assessment to establish baseline scores. Practice exams can be taken repeatedly: full 90-question exams, 10-question domain drills, or weak-points mode.

## Common Maintenance Tasks

### Adding Questions

Questions are seeded via SQL migrations in `supabase/migrations/`. To add more:

1. Create a new migration file (e.g. `016_seed_more_questions.sql`)
2. Insert into `cert_questions` with the certification_id, domain_id, question_text, options (JSON array of `{text, is_correct}`), correct_index, explanation, and difficulty

### Adding a New Certification

1. Insert into `certifications` table (name, vendor, exam_code, slug)
2. Insert domains into `cert_domains` with exam weights
3. Insert sub-objectives into `cert_sub_objectives`
4. Seed questions into `cert_questions`
5. Add PBQ scenarios in `src/data/pbq/[cert-slug]/`
6. Add reference tables in `src/data/reference/[cert-slug]/`

### Managing Flagged Questions

Navigate to `/admin/flags` (requires admin role). Flagged questions can be reviewed, resolved, or dismissed.
