-- Facet · owner funnel: what the "build my app" pipeline learns about a spa.
-- Preview clinics are created with is_preview = true and labeled "Preview" in the app.

alter table public.clinics
  add column if not exists about text,
  add column if not exists city text,
  add column if not exists source_url text,
  add column if not exists built_at timestamptz;

-- Example plans/rewards created for a preview are flagged so the app can say
-- "Example. You set these when you go live."
alter table public.membership_plans add column if not exists is_example boolean not null default false;
alter table public.rewards add column if not exists is_example boolean not null default false;

create index if not exists clinics_preview_idx on public.clinics (is_preview, created_at desc);
