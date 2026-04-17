# Convertube Status Onboarding

Muc tieu: dua Convertube vao he thong monitoring/status cua CafeToolbox ma khong can nhung Supabase client truc tiep vao app Python.

## Tong quan luong

1. Convertube expose endpoint health: `/health`.
2. Monitoring worker goi endpoint health theo cau hinh `service_health_config`.
3. Worker ghi heartbeat vao Supabase.
4. Status app doc heartbeat + uptime aggregate de hien thi 1d/7d/30d.

## SQL onboarding (chay trong Supabase SQL Editor)

Can thay URL trong script bang domain/host that cua Convertube.

```sql
DO $$
DECLARE
  v_service_id uuid;
BEGIN
  -- 1) Tim service Convertube neu da ton tai
  SELECT id INTO v_service_id
  FROM public.services
  WHERE name = 'Convertube'
  LIMIT 1;

  -- 2) Neu chua co thi tao moi
  IF v_service_id IS NULL THEN
    INSERT INTO public.services (name, status, uptime)
    VALUES ('Convertube', 'operational', 100)
    RETURNING id INTO v_service_id;
  ELSE
    UPDATE public.services
    SET
      status = 'operational',
      uptime = 100,
      updated_at = now()
    WHERE id = v_service_id;
  END IF;

  -- 3) Gan cau hinh health check cho monitoring worker
  --    Primary (CNAME): YOUR-CONVERTUBE-CNAME:25914
  --    Origin fallback: YOUR-CONVERTUBE-ORIGIN:25914
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
    'http://YOUR-CONVERTUBE-CNAME:25914/health',
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
```

Neu muon giam phu thuoc DNS CNAME khi monitor, ban co the doi URL health check ve origin:

```sql
UPDATE public.service_health_config
SET health_check_url = 'http://YOUR-CONVERTUBE-ORIGIN:25914/health',
    updated_at = now()
WHERE service_id IN (
  SELECT id FROM public.services WHERE name = 'Convertube'
);
```

Neu schema cua ban khac (vi da tuy bien), truoc khi insert hay verify nhanh:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('services', 'service_health_config')
ORDER BY table_name, ordinal_position;
```

## Verify sau onboarding

```sql
-- Verify service
SELECT id, name, status, uptime, updated_at
FROM public.services
WHERE name = 'Convertube';

-- Verify monitoring config
SELECT service_id, health_check_url, method, expected_status_code, timeout_ms, check_interval_seconds, enabled
FROM public.service_health_config
WHERE service_id IN (
  SELECT id FROM public.services WHERE name = 'Convertube'
);
```

## Checklist env va network

### Convertube host

- Convertube phai public endpoint health:
  - `GET /health` tra HTTP 200 khi app song.
- Nếu dang sau reverse proxy thi can forward dung host/proto.
- Neu dung dashboard-gated access cho UI/API thi van de `/health` public cho monitoring.

### Monitoring backend

- Da set du env backend:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
- Worker dang chay lien tuc (`pnpm monitoring:start` hoac worker/watchdog split mode).
- Timeout check phu hop voi host Convertube (`MONITORING_REQUEST_TIMEOUT_MS`, khuyen nghi 5000-8000).

### Status app

- Khong can them env rieng cho Convertube.
- Chi can status app dang doc cung Supabase project voi monitoring backend.

## Kiem tra end-to-end nhanh

1. Goi thu endpoint Convertube:

```bash
curl -i http://YOUR-CONVERTUBE-HOST:25914/health
```

1. Chay 1 chu ky monitoring va verify heartbeat:

```bash
pnpm monitoring:once
```

1. Kiem tra heartbeat da vao DB:

```sql
SELECT service_id, is_healthy, checked_at
FROM public.service_heartbeats
WHERE service_id IN (SELECT id FROM public.services WHERE name = 'Convertube')
ORDER BY checked_at DESC
LIMIT 20;
```

1. Kiem tra tren status page: service Convertube xuat hien va co uptime.

## Ghi chu quan trong

- Ban khong can noi Supabase truc tiep vao Convertube cho use case monitoring/status co ban.
- Khi can metrics nang cao (queue depth, active jobs theo thoi gian), co the bo sung endpoint rieng roi de monitoring worker ingest them.
