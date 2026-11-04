-- =============================================================================
-- Nr5 Studios – optional: process the email queue every minute
-- Emails are already sent immediately after each booking/status change. This
-- job is the safety net that retries failed emails even if nobody uses the site.
-- Run once in Supabase → SQL Editor. (Uses the public anon key – no secrets here.)
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('send-notifications') where exists (select 1 from cron.job where jobname = 'send-notifications');

select cron.schedule(
  'send-notifications',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://cubbhqlvgicemmapjmyw.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1YmJocWx2Z2ljZW1tYXBqbXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1Nzc2NTQsImV4cCI6MjEwOTE1MzY1NH0.qoSmSBrY3zriJeSMD07R7feZWC6cyFGMh1zv6hcLPTU',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1YmJocWx2Z2ljZW1tYXBqbXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1Nzc2NTQsImV4cCI6MjEwOTE1MzY1NH0.qoSmSBrY3zriJeSMD07R7feZWC6cyFGMh1zv6hcLPTU'
    ),
    body := '{}'::jsonb
  );
  $$
);
