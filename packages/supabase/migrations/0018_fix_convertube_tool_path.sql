-- 0018_fix_convertube_tool_path.sql
-- Purpose: Ensure Convertube tool route points to in-dashboard tool page.
-- Safe to re-run (idempotent).

DO $$
DECLARE
  v_updated_count integer := 0;
  v_has_slug boolean := false;
  v_has_name boolean := false;
  v_where_clause text := '';
BEGIN
  IF to_regclass('public.tools') IS NULL THEN
    RAISE NOTICE 'Skip 0018: table public.tools does not exist.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tools'
      AND column_name = 'path'
  ) THEN
    RAISE NOTICE 'Skip 0018: column public.tools.path does not exist.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tools'
      AND column_name = 'slug'
  ) INTO v_has_slug;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tools'
      AND column_name = 'name'
  ) INTO v_has_name;

  IF NOT v_has_slug AND NOT v_has_name THEN
    RAISE NOTICE 'Skip 0018: neither public.tools.slug nor public.tools.name exists.';
    RETURN;
  END IF;

  IF v_has_slug THEN
    v_where_clause := v_where_clause || 'slug = ''convertube''';
  END IF;
  IF v_has_name THEN
    IF v_where_clause <> '' THEN
      v_where_clause := v_where_clause || ' OR ';
    END IF;
    v_where_clause := v_where_clause || 'name = ''Convertube''';
  END IF;

  EXECUTE format(
    'UPDATE public.tools
     SET path = %L
     WHERE (%s) AND path IS DISTINCT FROM %L',
    '/tools/convertube',
    v_where_clause,
    '/tools/convertube'
  );

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE '0018 complete. Updated Convertube tool rows: %', v_updated_count;
END $$;
