-- ============================================
-- CafeToolbox - Heartbeat Monitoring Schema
-- Version: 0012
-- Purpose:
--   Add tables for real-time service health monitoring.
--   Tracks heartbeat logs to calculate accurate uptime percentages.
-- ============================================

BEGIN;

-- ============================================
-- 1) SERVICE HEARTBEATS TABLE
-- ============================================
-- Each heartbeat = one health check attempt for a service
CREATE TABLE IF NOT EXISTS public.service_heartbeats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  is_healthy BOOLEAN NOT NULL DEFAULT true,
  response_time_ms INTEGER, -- NULL if failed
  http_status INTEGER, -- NULL if network error
  error_message TEXT, -- NULL if successful
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2) SERVICE HEALTH CONFIG TABLE
-- ============================================
-- Admin configures health check endpoints per service
CREATE TABLE IF NOT EXISTS public.service_health_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL UNIQUE REFERENCES public.services(id) ON DELETE CASCADE,
  health_check_url TEXT NOT NULL, -- e.g., https://api.cafetoolbox.app/health
  method TEXT NOT NULL DEFAULT 'GET' CHECK (method IN ('GET', 'HEAD', 'POST')),
  expected_status_code INTEGER NOT NULL DEFAULT 200,
  timeout_ms INTEGER NOT NULL DEFAULT 5000,
  check_interval_seconds INTEGER NOT NULL DEFAULT 60, -- How often to check
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3) INDEXES
-- ============================================
CREATE INDEX idx_service_heartbeats_service_id ON public.service_heartbeats(service_id);
CREATE INDEX idx_service_heartbeats_checked_at ON public.service_heartbeats(checked_at DESC);
CREATE INDEX idx_service_heartbeats_service_checked ON public.service_heartbeats(service_id, checked_at DESC);
CREATE INDEX idx_service_health_config_service_id ON public.service_health_config(service_id);
CREATE INDEX idx_service_health_config_enabled ON public.service_health_config(enabled);

-- ============================================
-- 4) TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_service_health_config_updated_at
  BEFORE UPDATE ON public.service_health_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 5) RLS POLICIES
-- ============================================
ALTER TABLE public.service_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_health_config ENABLE ROW LEVEL SECURITY;

-- Heartbeats: Public read (for status page)
CREATE POLICY "Heartbeats: Public read"
  ON public.service_heartbeats FOR SELECT
  USING (true);

-- Health config: Superadmin manage
CREATE POLICY "Health config: Superadmin manage"
  ON public.service_health_config FOR ALL
  USING (public.is_superadmin_jwt())
  WITH CHECK (public.is_superadmin_jwt());

-- ============================================
-- 6) HELPER FUNCTION: Calculate Uptime %
-- ============================================
-- Returns uptime % for a service in last N hours
CREATE OR REPLACE FUNCTION public.calculate_service_uptime(
  service_uuid UUID,
  hours_lookback INTEGER DEFAULT 24
)
RETURNS DECIMAL
LANGUAGE SQL
STABLE
AS $$
  SELECT
    CASE
      -- No data = 100% (assume healthy)
      WHEN COUNT(*) = 0 THEN 100.00
      -- Calculate: (healthy checks / total checks) * 100
      ELSE ROUND(
        (SUM(CASE WHEN is_healthy THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100),
        2
      )
    END AS uptime_percent
  FROM public.service_heartbeats
  WHERE
    service_id = service_uuid
    AND checked_at > NOW() - (hours_lookback || ' hours')::INTERVAL;
$$;

-- ============================================
-- 7) HELPER FUNCTION: Get Latest Service Status
-- ============================================
-- Returns most recent health status and calculated uptime
CREATE OR REPLACE FUNCTION public.get_service_health_status(service_uuid UUID)
RETURNS TABLE(
  is_healthy BOOLEAN,
  last_checked_at TIMESTAMPTZ,
  last_response_time_ms INTEGER,
  uptime_24h DECIMAL,
  consecutive_failures INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  WITH latest_heartbeat AS (
    SELECT
      is_healthy,
      checked_at,
      response_time_ms,
      ROW_NUMBER() OVER (ORDER BY checked_at DESC) AS rn
    FROM public.service_heartbeats
    WHERE service_id = service_uuid
  ),
  failures AS (
    SELECT COUNT(*) as fail_count
    FROM public.service_heartbeats
    WHERE
      service_id = service_uuid
      AND is_healthy = false
      AND checked_at >= (
        SELECT COALESCE(MAX(checked_at), NOW() - INTERVAL '24 hours')
        FROM public.service_heartbeats
        WHERE service_id = service_uuid AND is_healthy = true
      )
  )
  SELECT
    COALESCE(lh.is_healthy, true),
    COALESCE(lh.checked_at, NOW()),
    lh.response_time_ms,
    public.calculate_service_uptime(service_uuid, 24),
    COALESCE(f.fail_count, 0)
  FROM latest_heartbeat lh
  LEFT JOIN failures f ON true
  WHERE lh.rn = 1 OR lh.rn IS NULL;
$$;

-- ============================================
-- 8) GRANTS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.service_heartbeats TO anon, authenticated;
GRANT ALL ON public.service_heartbeats, public.service_health_config TO service_role;

COMMIT;
