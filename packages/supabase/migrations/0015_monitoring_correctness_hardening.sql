-- 0015_monitoring_correctness_hardening.sql
-- Monitoring correctness hardening:
-- 1) allow null daily uptime when there are no checks (unknown/no data)
-- 2) allow high-severity incident status 'major_outage' when enum-backed

BEGIN;

ALTER TABLE public.service_uptime_daily
  ALTER COLUMN uptime_percentage DROP NOT NULL,
  ALTER COLUMN uptime_percentage DROP DEFAULT;

DO $$
DECLARE
  incident_status_udt text;
  incident_update_status_udt text;
BEGIN
  SELECT c.udt_name
  INTO incident_status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'incidents'
    AND c.column_name = 'status';

  IF incident_status_udt IS NOT NULL AND incident_status_udt <> 'text' THEN
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS ''major_outage''', incident_status_udt);
  END IF;

  SELECT c.udt_name
  INTO incident_update_status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'incident_updates'
    AND c.column_name = 'status';

  IF incident_update_status_udt IS NOT NULL
     AND incident_update_status_udt <> 'text'
     AND incident_update_status_udt <> incident_status_udt THEN
    EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS ''major_outage''', incident_update_status_udt);
  END IF;
END
$$;

COMMIT;
