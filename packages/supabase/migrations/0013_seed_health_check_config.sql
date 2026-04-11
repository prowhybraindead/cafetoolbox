-- ============================================
-- CafeToolbox - Seed Health Check Configuration
-- Version: 0013
-- Purpose:
--   Configure health check endpoints for each service.
--   This enables automated heartbeat monitoring.
-- ============================================

BEGIN;

-- Seed health check config for each service
-- Note: These URLs are examples. Update them based on actual deploy.
INSERT INTO public.service_health_config (
  service_id,
  health_check_url,
  method,
  expected_status_code,
  timeout_ms,
  check_interval_seconds,
  enabled
)
SELECT
  s.id,
  CASE
    WHEN s.name = 'Dashboard App' THEN 'https://cafetoolbox.app/api/health'
    WHEN s.name = 'Status Page' THEN 'https://status.cafetoolbox.app/'
    WHEN s.name = 'API Services' THEN 'https://cafetoolbox.app/api/health'
    WHEN s.name = 'Database' THEN 'https://cafetoolbox.app/api/health'
    ELSE 'https://cafetoolbox.app/'
  END,
  'GET',
  200,
  5000,
  60,
  true
FROM public.services s
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_health_config sc WHERE sc.service_id = s.id
)
ON CONFLICT DO NOTHING;

COMMIT;
