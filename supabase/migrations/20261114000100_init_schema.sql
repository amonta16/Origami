-- Facet · initial schema
-- Created Sat Nov 14, 2026 at the CPVC AI Hackathon. Applied through the Supabase MCP connector.
--
-- Access model:
--   * Clinic staff (authenticated users in clinic_members) read/write only their clinic's rows.
--   * Patients and clinic owners in the funnel never talk to Postgres directly: all public
--     inserts go through Next.js server routes using the secret key (which bypasses RLS).
--   * Anonymous role has no grants on these tables.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'staff');
create type public.lead_status as enum ('new', 'contacted', 'booked', 'visited', 'lost');
create type public.visit_status as enum ('requested', 'booked', 'done', 'cancelled');
create type public.message_channel as enum ('sms', 'email', 'call_note');
create type public.owner_lead_stage as enum ('new', 'contacted', 'call_booked', 'founding', 'live', 'lost');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  logo_url text,
  brand_color text check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$'),
  phone text,
  address text,
  website text,
  booking_url text,
  is_sample boolean not null default false,
  is_preview boolean not null default false,
  first_visit_credit_cents integer,
  referral_credit_cents integer,
  created_at timestamptz not null default now()
);

create table public.clinic_members (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  member_price_cents integer check (member_price_cents is null or member_price_cents >= 0),
  concerns text[] not null default '{}',
  zones text[] not null default '{}',
  result_days integer check (result_days is null or result_days > 0),
  booking_url text,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  age integer check (age is null or age >= 18),
  answers jsonb not null default '{}'::jsonb,
  source text,
  utm jsonb not null default '{}'::jsonb,
  status public.lead_status not null default 'new',
  referral_code text unique,
  referred_by uuid references public.leads(id) on delete set null,
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  photo_path text,
  landmarks jsonb,
  quality jsonb,
  results jsonb,
  sims jsonb not null default '{}'::jsonb,
  liked_treatment_id uuid references public.treatments(id) on delete set null,
  keep_photo boolean not null default false,
  delete_after timestamptz not null default (now() + interval '72 hours'),
  created_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  treatment_id uuid references public.treatments(id) on delete set null,
  status public.visit_status not null default 'requested',
  preferred text,
  requested_at timestamptz not null default now(),
  visit_at timestamptz,
  next_due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel public.message_channel not null default 'sms',
  body text not null,
  ai_drafted boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Clinic owners who came through the "your scanner in 60 seconds" funnel.
create table public.owner_leads (
  id uuid primary key default gen_random_uuid(),
  spa_name text not null,
  website text,
  clinic_id uuid references public.clinics(id) on delete set null,
  contact_name text,
  role text,
  email text,
  phone text,
  best_time text,
  founding_clinic boolean not null default false,
  stage public.owner_lead_stage not null default 'new',
  notes text,
  created_at timestamptz not null default now()
);

-- Product analytics. Names: scan_started, mesh_locked, scan_done, sim_viewed, booked,
-- owner_scanner_built, owner_lead_submitted, ...
create table public.events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index treatments_clinic_idx on public.treatments (clinic_id, active, sort);
create index leads_clinic_created_idx on public.leads (clinic_id, created_at desc);
create index leads_clinic_status_idx on public.leads (clinic_id, status);
create index scans_clinic_created_idx on public.scans (clinic_id, created_at desc);
create index scans_lead_idx on public.scans (lead_id);
create index scans_delete_after_idx on public.scans (delete_after) where photo_path is not null;
create index visits_clinic_due_idx on public.visits (clinic_id, next_due_at);
create index visits_lead_idx on public.visits (lead_id);
create index messages_lead_idx on public.messages (lead_id, created_at desc);
create index points_lead_idx on public.points_ledger (lead_id);
create index owner_leads_created_idx on public.owner_leads (created_at desc);
create index events_clinic_name_idx on public.events (clinic_id, name, created_at desc);
create index events_created_idx on public.events (created_at desc);
create index clinic_members_user_idx on public.clinic_members (user_id);

-- ---------------------------------------------------------------------------
-- Helper: which clinics does the current user belong to?
-- security definer so the policy check doesn't recurse into clinic_members RLS.
-- ---------------------------------------------------------------------------
create or replace function public.my_clinic_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from public.clinic_members where user_id = auth.uid();
$$;

revoke all on function public.my_clinic_ids() from public;
grant execute on function public.my_clinic_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.treatments enable row level security;
alter table public.leads enable row level security;
alter table public.scans enable row level security;
alter table public.visits enable row level security;
alter table public.messages enable row level security;
alter table public.points_ledger enable row level security;
alter table public.owner_leads enable row level security;
alter table public.events enable row level security;

-- Staff can read and update their own clinic. Creating clinics happens server-side.
create policy "staff read own clinic" on public.clinics
  for select to authenticated
  using (id in (select public.my_clinic_ids()));
create policy "staff update own clinic" on public.clinics
  for update to authenticated
  using (id in (select public.my_clinic_ids()))
  with check (id in (select public.my_clinic_ids()));

create policy "staff read own memberships" on public.clinic_members
  for select to authenticated
  using (user_id = auth.uid() or clinic_id in (select public.my_clinic_ids()));

create policy "staff manage treatments" on public.treatments
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));

create policy "staff manage leads" on public.leads
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));

create policy "staff read scans" on public.scans
  for select to authenticated
  using (clinic_id in (select public.my_clinic_ids()));
create policy "staff update scans" on public.scans
  for update to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));

create policy "staff manage visits" on public.visits
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));

create policy "staff manage messages" on public.messages
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));

create policy "staff manage points" on public.points_ledger
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));

create policy "staff read events" on public.events
  for select to authenticated
  using (clinic_id in (select public.my_clinic_ids()));

-- owner_leads: no policies for authenticated/anon. Only the service role (admin page) reads them.

-- Lock down anon entirely; authenticated gets table access filtered by the policies above.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.owner_leads from authenticated;
revoke insert, delete on public.clinics from authenticated;
revoke insert, update, delete on public.clinic_members from authenticated;
revoke insert, delete on public.scans from authenticated;
revoke insert, update, delete on public.events from authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for selfies. Signed URLs only; writes via server routes.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scans', 'scans', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Staff may read photos stored under their clinic's folder: scans/<clinic_id>/<scan_id>.jpg
create policy "staff read own clinic scan photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] in (select public.my_clinic_ids()::text)
  );

-- ---------------------------------------------------------------------------
-- Realtime for the dashboard activity feed
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.scans;
alter publication supabase_realtime add table public.visits;
