-- Facet · front desk settings
-- Written Sat Nov 14, 2026. One jsonb column for desk switches that don't deserve their own columns:
--   scan_enabled  boolean   show the AI skin scan in the patient app
--   journey       object    { "<switch key>": boolean } for automated offers and automations.
--                           Saved only; nothing is sent until texting is connected.
-- The desk reads it if present and works without it (switches report that the update is pending).

alter table public.clinics
  add column if not exists settings jsonb not null default '{}'::jsonb;
