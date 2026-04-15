-- 0017_seed_convertube_service.sql
-- Purpose: Register Convertube in services + service_health_config for monitoring/status.
-- Safe to re-run (idempotent).
-- IMPORTANT: Verify v_health_url matches your current Convertube primary domain.

DO $$
DECLARE
  v_service_id uuid;
  -- Primary (CNAME) URL:
  v_health_url text := 'http://convertube.cafetoolbox.app:25914/health';
  -- Origin fallback reference:
  v_origin_health_url text := 'http://mbasic7.pikamc.vn:25914/health';
BEGIN
  IF to_regclass('public.services') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.services. Apply baseline migrations first.';
  END IF;

  RAISE NOTICE 'Convertube health URL (primary): %, origin fallback: %', v_health_url, v_origin_health_url;

  IF to_regclass('public.service_health_config') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.service_health_config. Apply baseline migrations first.';
  END IF;

  -- Upsert service record by stable name.
  SELECT id INTO v_service_id
  FROM public.services
  WHERE name = 'Convertube'
  LIMIT 1;

  IF v_service_id IS NULL THEN
    INSERT INTO public.services (name, status, uptime)
    VALUES ('Convertube', 'operational', 100)
    RETURNING id INTO v_service_id;
  ELSE
    UPDATE public.services
    SET
      status = 'operational',
      uptime = COALESCE(uptime, 100),
      updated_at = now()
    WHERE id = v_service_id;
  END IF;

  -- Configure monitoring probe.
  INSERT INTO public.service_health_config (
    service_id,
    health_check_url,
    method,
    expected_status_code,
    timeout_ms,
    check_interval_seconds,
    enabled
  )
  VALUES (
    v_service_id,
    v_health_url,
    'GET',
    200,
    5000,
    30,
    true
  )
  ON CONFLICT (service_id)
  DO UPDATE SET
    health_check_url = EXCLUDED.health_check_url,
    method = EXCLUDED.method,
    expected_status_code = EXCLUDED.expected_status_code,
    timeout_ms = EXCLUDED.timeout_ms,
    check_interval_seconds = EXCLUDED.check_interval_seconds,
    enabled = EXCLUDED.enabled,
    updated_at = now();
END $$;
