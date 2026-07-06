-- Pass stories collected after a user's exam date, moderated, then shown on
-- the marketing pages. The single highest-converting signal in this niche.
-- Additive only.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  certification_id uuid references public.certifications(id) on delete set null,
  passed boolean not null,
  quote text not null check (char_length(quote) between 10 and 600),
  display_name text not null check (char_length(display_name) between 1 and 60),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

-- Anyone (incl. anon) can read APPROVED testimonials — public marketing display.
create policy "Anyone reads approved testimonials"
  on public.testimonials
  for select
  using (status = 'approved');

-- A user can read their own submission at any status (form shows "submitted").
create policy "Users read own testimonial"
  on public.testimonials
  for select
  using (auth.uid() = user_id);

-- A user may insert only their own row, and only as 'pending' — this blocks
-- self-approval even if the endpoint were bypassed. Moderation happens via
-- the service-role admin client, which bypasses RLS.
create policy "Users submit own pending testimonial"
  on public.testimonials
  for insert
  with check (auth.uid() = user_id and status = 'pending');

-- One story per user per cert.
create unique index if not exists idx_testimonials_user_cert
  on public.testimonials (user_id, certification_id);

-- For the public "latest approved" query.
create index if not exists idx_testimonials_approved
  on public.testimonials (status, created_at desc);
