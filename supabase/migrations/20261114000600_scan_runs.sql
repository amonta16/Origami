-- Facet · model comparison log for testers.
-- One row per analysis or after-image run. No photos or images are stored here: analysis rows
-- keep the structured results (scores, concerns, recommendations), sim rows keep timing and errors.
create table public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  session_id text not null,
  kind text not null check (kind in ('analysis', 'sim')),
  provider text not null,
  model_requested text,
  model_served text,
  sim_kind text,
  used_mask boolean,
  ok boolean not null,
  error text,
  ms integer,
  results jsonb,
  created_at timestamptz not null default now()
);
create index scan_runs_session_idx on public.scan_runs (session_id, created_at);
create index scan_runs_created_idx on public.scan_runs (created_at desc);

alter table public.scan_runs enable row level security;
create policy "staff read scan runs" on public.scan_runs
  for select to authenticated
  using (clinic_id in (select public.my_clinic_ids()));
revoke all on public.scan_runs from anon;
grant select on public.scan_runs to authenticated;
