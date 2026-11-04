-- =============================================================================
-- Nr5 Studios – tiered cancellation policy (studio's own terms, 2026-11-04)
--   ≥ cancellation_deadline_hours (48) before: free
--   between that and late_cancellation_hours (24): late_cancellation_percent (50 %) of the agreed price
--   < late_cancellation_hours, same day, drop-in or no-show: 100 %
-- The fee is never charged automatically; the studio invoices manually if needed.
-- =============================================================================

alter table public.studio_settings
  add column late_cancellation_hours integer not null default 24 check (late_cancellation_hours >= 0),
  add column late_cancellation_percent integer not null default 50 check (late_cancellation_percent between 0 and 100),
  add constraint studio_settings_cancellation_windows check (late_cancellation_hours <= cancellation_deadline_hours);

-- New terms: new version, so every booking records which terms the customer accepted.
update public.studio_settings
   set cancellation_deadline_hours = 48,
       late_cancellation_hours = 24,
       late_cancellation_percent = 50,
       policy_version = '2026-11-04';

comment on column public.studio_settings.cancellation_fee_nok is
  'Deprecated (flat fee before 2026-11-04). Kept until every deployed Edge Function reads the tiered columns.';
