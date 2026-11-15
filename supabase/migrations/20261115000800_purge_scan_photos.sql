-- Facet / Origami · enforce the 72-hour photo promise (Sun Nov 15 2026).
-- scans.delete_after has always been set to now() + 72 hours, but nothing deleted the photo.
-- Every hour, pg_cron asks the app to delete photos that are past their date (the app removes
-- the file from the private "scans" bucket through the Storage API and clears photo_path).
-- The endpoint only touches photos already due, so it needs no secret. Vercel Cron calls the
-- same endpoint once a day as a backup (vercel.json).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- re-runnable: replace the job if it already exists
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-scan-photos') then
    perform cron.unschedule('purge-scan-photos');
  end if;
end $$;

select cron.schedule(
  'purge-scan-photos',
  '17 * * * *',
  $job$ select net.http_get(url := 'https://facet-tau-weld.vercel.app/api/cron/purge-photos', timeout_milliseconds := 30000); $job$
);
