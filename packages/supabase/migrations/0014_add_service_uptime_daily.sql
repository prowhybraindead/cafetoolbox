-- 0014_add_service_uptime_daily.sql
-- Daily rollups for status chart windows (7d / 30d) without querying raw heartbeat logs.

BEGIN;

CREATE TABLE IF NOT EXISTS public.service_uptime_daily (
  service_uuid uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  date date NOT NULL,
  uptime_percentage numeric(6,4) NOT NULL DEFAULT 0,
  avg_response_time numeric(10,2),
  total_checks integer NOT NULL DEFAULT 0,
  failed_checks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT service_uptime_daily_pk PRIMARY KEY (service_uuid, date),
  CONSTRAINT service_uptime_daily_uptime_pct_range CHECK (uptime_percentage >= 0 AND uptime_percentage <= 100),
  CONSTRAINT service_uptime_daily_counts_non_negative CHECK (total_checks >= 0 AND failed_checks >= 0),
  CONSTRAINT service_uptime_daily_failed_not_exceed_total CHECK (failed_checks <= total_checks)
);

CREATE INDEX IF NOT EXISTS service_uptime_daily_date_idx
  ON public.service_uptime_daily (date DESC);

CREATE INDEX IF NOT EXISTS service_uptime_daily_service_date_idx
  ON public.service_uptime_daily (service_uuid, date DESC);

DROP TRIGGER IF EXISTS update_service_uptime_daily_updated_at ON public.service_uptime_daily;
CREATE TRIGGER update_service_uptime_daily_updated_at
  BEFORE UPDATE ON public.service_uptime_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.service_uptime_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_uptime_daily_public_read ON public.service_uptime_daily;
CREATE POLICY service_uptime_daily_public_read
  ON public.service_uptime_daily
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS service_uptime_daily_superadmin_write ON public.service_uptime_daily;
CREATE POLICY service_uptime_daily_superadmin_write
  ON public.service_uptime_daily
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

COMMIT;
