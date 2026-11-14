-- Facet · patient app: shop, memberships, rewards, check-in
-- Written Sat Nov 14, 2026. Layout follows the disclosed design reference (reference/REFERENCE.md);
-- tables, copy and data are new.
--
-- No payments are processed anywhere. "Buy" and "Join" create a purchase_request the clinic
-- confirms and charges in person; the patient app says so on every such button.

-- ---------------------------------------------------------------------------
-- Clinic-level settings for the patient app
-- ---------------------------------------------------------------------------
alter table public.clinics
  add column if not exists hero_photo_url text,
  add column if not exists welcome_points integer not null default 100 check (welcome_points >= 0),
  add column if not exists visit_points integer not null default 50 check (visit_points >= 0),
  add column if not exists referral_points integer not null default 200 check (referral_points >= 0),
  add column if not exists scan_points integer not null default 25 check (scan_points >= 0),
  add column if not exists points_per_dollar integer not null default 1 check (points_per_dollar >= 0);

-- Treatments get a shop category, duration, photo and a "popular" flag.
create type public.treatment_category as enum ('injectables', 'skin', 'laser', 'body', 'wellness', 'consult');

alter table public.treatments
  add column if not exists category public.treatment_category not null default 'consult',
  add column if not exists duration_min integer check (duration_min is null or duration_min > 0),
  add column if not exists image_url text,
  add column if not exists popular boolean not null default false;

-- ---------------------------------------------------------------------------
-- Shop items that aren't single treatments: packages, retail skincare, gift cards
-- ---------------------------------------------------------------------------
create type public.product_kind as enum ('package', 'skincare', 'gift_card');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  kind public.product_kind not null,
  name text not null,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  member_price_cents integer check (member_price_cents is null or member_price_cents >= 0),
  sessions integer check (sessions is null or sessions > 0),
  treatment_id uuid references public.treatments(id) on delete set null,
  image_url text,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  tagline text,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  perks text[] not null default '{}',
  member_discount_pct integer not null default 0 check (member_discount_pct between 0 and 100),
  monthly_points integer not null default 0 check (monthly_points >= 0),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  image_url text,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Patient side
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists checkin_code text,
  add column if not exists membership_plan_id uuid references public.membership_plans(id) on delete set null,
  add column if not exists member_since timestamptz,
  add column if not exists notifications boolean not null default false;

-- 6-digit code, unique per clinic (shown at the front desk with the QR).
create unique index if not exists leads_clinic_checkin_code_idx on public.leads (clinic_id, checkin_code) where checkin_code is not null;
create index if not exists leads_clinic_phone_idx on public.leads (clinic_id, phone);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  reward_id uuid references public.rewards(id) on delete set null,
  reward_name text not null,
  points_spent integer not null check (points_spent >= 0),
  code text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create type public.purchase_kind as enum ('treatment', 'product', 'membership');
create type public.purchase_status as enum ('requested', 'confirmed', 'cancelled');

-- A patient's "I want this". The clinic confirms and charges in person.
create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  kind public.purchase_kind not null,
  item_id uuid not null,
  item_name text not null,
  price_cents integer,
  status public.purchase_status not null default 'requested',
  note text,
  created_at timestamptz not null default now()
);

create index products_clinic_idx on public.products (clinic_id, kind, active, sort);
create index membership_plans_clinic_idx on public.membership_plans (clinic_id, active, sort);
create index rewards_clinic_idx on public.rewards (clinic_id, active, sort);
create index reward_redemptions_lead_idx on public.reward_redemptions (lead_id, created_at desc);
create index purchase_requests_clinic_idx on public.purchase_requests (clinic_id, created_at desc);
create index purchase_requests_lead_idx on public.purchase_requests (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: same model as the init schema. Staff manage their own clinic's rows;
-- patients never talk to Postgres directly (server routes use the secret key).
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.membership_plans enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.purchase_requests enable row level security;

create policy "staff manage products" on public.products
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));
create policy "staff manage membership plans" on public.membership_plans
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));
create policy "staff manage rewards" on public.rewards
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));
create policy "staff manage redemptions" on public.reward_redemptions
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));
create policy "staff manage purchase requests" on public.purchase_requests
  for all to authenticated
  using (clinic_id in (select public.my_clinic_ids()))
  with check (clinic_id in (select public.my_clinic_ids()));

revoke all on public.products, public.membership_plans, public.rewards, public.reward_redemptions, public.purchase_requests from anon;
grant select, insert, update, delete on public.products, public.membership_plans, public.rewards, public.reward_redemptions, public.purchase_requests to authenticated;

alter publication supabase_realtime add table public.purchase_requests;
