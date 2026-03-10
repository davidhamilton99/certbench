-- ============================================================
-- CertBench — Subscriptions & Usage Tracking
-- ============================================================

-- User subscription status (synced from Stripe via webhooks)
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index idx_subscriptions_user on user_subscriptions(user_id);
create index idx_subscriptions_stripe_customer on user_subscriptions(stripe_customer_id);

-- Track AI generation usage per user per month
create table public.ai_generation_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  month text not null, -- e.g. '2026-03'
  generation_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create index idx_ai_usage_user_month on ai_generation_usage(user_id, month);

-- RLS policies
alter table user_subscriptions enable row level security;
create policy "Users read own subscription" on user_subscriptions
  for select using (auth.uid() = user_id);
create policy "Users insert own subscription" on user_subscriptions
  for insert with check (auth.uid() = user_id);

alter table ai_generation_usage enable row level security;
create policy "Users read own usage" on ai_generation_usage
  for select using (auth.uid() = user_id);

-- Updated_at triggers
create trigger set_updated_at before update on user_subscriptions
  for each row execute procedure update_updated_at();

create trigger set_updated_at before update on ai_generation_usage
  for each row execute procedure update_updated_at();
