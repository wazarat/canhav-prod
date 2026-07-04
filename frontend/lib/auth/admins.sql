-- Admin allowlist for the CanHav /admin panel (Supabase).
-- Run once in the Supabase SQL editor. Grant access by inserting a row;
-- revoke by deleting it — no redeploy needed. Membership is checked
-- server-side with the service-role key (see lib/auth/admin.ts), so RLS
-- can stay locked down to nothing (no client ever reads this table).

create table if not exists public.admins (
  email     text primary key,
  role      text,
  added_at  timestamptz not null default now()
);

alter table public.admins enable row level security;
-- No policies => no anon/auth client access. Only the service role (used by
-- requireAdmin) can read it. That's intentional.

-- Seed your first admin:
-- insert into public.admins (email, role) values ('you@example.com', 'owner');
