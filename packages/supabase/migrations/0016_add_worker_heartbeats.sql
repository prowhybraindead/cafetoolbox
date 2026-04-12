-- 0016_add_worker_heartbeats.sql
-- Worker self-heartbeat table for monitoring system self-health (Phase 2).
-- The monitoring worker upserts a row here at every cycle.
-- A separate watchdog process reads this table to detect stale workers.

BEGIN;

CREATE TABLE IF NOT EXISTS public.worker_heartbeats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  worker_name text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  status text NOT NULL DEFAULT 'healthy',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT worker_heartbeats_pk PRIMARY KEY (id),
  CONSTRAINT worker_heartbeats_worker_name_key UNIQUE (worker_name)
);

CREATE INDEX IF NOT EXISTS worker_heartbeats_worker_name_idx
  ON public.worker_heartbeats (worker_name);

DROP TRIGGER IF EXISTS update_worker_heartbeats_updated_at ON public.worker_heartbeats;
CREATE TRIGGER update_worker_heartbeats_updated_at
  BEFORE UPDATE ON public.worker_heartbeats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: internal monitoring data, not publicly readable.
-- Service role key (used by the worker) bypasses RLS for all writes.
-- Superadmins can read/write via the dashboard.
ALTER TABLE public.worker_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS worker_heartbeats_superadmin_all ON public.worker_heartbeats;
CREATE POLICY worker_heartbeats_superadmin_all
  ON public.worker_heartbeats
  FOR ALL
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

COMMIT;
