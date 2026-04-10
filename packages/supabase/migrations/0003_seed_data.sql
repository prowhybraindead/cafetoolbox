-- ============================================
-- CafeToolbox - Seed Data (Development)
-- Version: 0003
-- Phase: 1 (Development only)
-- ============================================

-- NOTE: Only run this in development environment!
-- In production, seed data should be inserted via admin dashboard

-- ============================================
-- SEED TOOLS
-- ============================================

INSERT INTO public.tools (slug, name, description, status, size, path, icon, stack) VALUES
-- Small tools
('color-picker', 'Color Picker', 'Advanced color picker with multiple formats (HEX, RGB, HSL) and palette generation.', 'active', 'small', '/tools/color-picker', 'lucide:droplets', ARRAY['TypeScript', 'React', 'Tailwind CSS']),
('json-formatter', 'JSON Formatter & Validator', 'Format, validate, and minify JSON with syntax highlighting.', 'active', 'small', '/tools/json-formatter', 'lucide:braces', ARRAY['TypeScript', 'Monaco Editor', 'React']),
('markdown-preview', 'Markdown Previewer', 'Real-time Markdown preview with GitHub Flavored Markdown support.', 'active', 'small', '/tools/markdown-preview', 'lucide:file-text', ARRAY['TypeScript', 'React', 'marked', 'DOMPurify']),
('regex-tester', 'Regex Tester', 'Test and debug regular expressions with live matching and explanations.', 'active', 'small', '/tools/regex-tester', 'lucide:search-code', ARRAY['TypeScript', 'React', 'regex.js']),
('uuid-generator', 'UUID Generator', 'Generate multiple UUIDs (v4) with batch copy functionality.', 'active', 'small', '/tools/uuid-generator', 'lucide:fingerprint', ARRAY['TypeScript', 'React', 'crypto']),

-- Beta tools
('image-optimizer', 'Image Optimizer', 'Compress and optimize images in browser. Upload and download optimized versions.', 'beta', 'small', '/tools/image-optimizer', 'lucide:image', ARRAY['TypeScript', 'React', 'browser-image-compression']),
('css-grid-generator', 'CSS Grid Generator', 'Visual grid generator with code export.', 'beta', 'small', '/tools/css-grid-generator', 'lucide:grid', ARRAY['TypeScript', 'React', 'Tailwind CSS']),

-- Large tools
('api-client', 'REST API Client', 'Full-featured API client for testing endpoints. Save requests, manage collections.', 'beta', 'large', '/tools/api-client', 'lucide:api', ARRAY['TypeScript', 'React', 'Axios', 'Monaco Editor']),
('database-viewer', 'Database Schema Viewer', 'Visual database schema viewer for Postgres. Generate ER diagrams.', 'archived', 'large', '/tools/database-viewer', 'lucide:database', ARRAY['TypeScript', 'React', 'React Flow', 'pg'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED SERVICES (for status page)
-- ============================================

INSERT INTO public.services (name, status, uptime) VALUES
('Dashboard App', 'operational', 99.98),
('Status Page', 'operational', 99.99),
('API Services', 'operational', 99.95),
('Database', 'operational', 99.97)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED INCIDENT (example for demonstration)
-- ============================================

-- This is a resolved incident example (visible on status page)
INSERT INTO public.incidents (title, status, started_at, resolved_at, services_affected) VALUES
('Minor API Latency', 'resolved', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 23 hours', ARRAY['API Services']::TEXT[])
ON CONFLICT DO NOTHING;

-- Add update to the resolved incident
INSERT INTO public.incident_updates (incident_id, body, status, created_at)
SELECT 
  incidents.id,
  'We are investigating increased response times in our API services.',
  'investigating',
  incidents.started_at
FROM public.incidents
WHERE incidents.title = 'Minor API Latency'
AND NOT EXISTS (
  SELECT 1 FROM public.incident_updates
  WHERE incident_updates.incident_id = incidents.id
)
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.incident_updates (incident_id, body, status, created_at)
SELECT 
  incidents.id,
  'The issue has been identified and we are working on a fix.',
  'identified',
  incidents.started_at + INTERVAL '30 minutes'
FROM public.incidents
WHERE incidents.title = 'Minor API Latency'
AND (SELECT COUNT(*) FROM public.incident_updates WHERE incident_updates.incident_id = incidents.id) = 1
ON CONFLICT DO NOTHING;

INSERT INTO public.incident_updates (incident_id, body, status, created_at)
SELECT 
  incidents.id,
  'We have implemented a fix and are monitoring the results.',
  'monitoring',
  incidents.started_at + INTERVAL '1 hour'
FROM public.incidents
WHERE incidents.title = 'Minor API Latency'
AND (SELECT COUNT(*) FROM public.incident_updates WHERE incident_updates.incident_id = incidents.id) = 2
ON CONFLICT DO NOTHING;

INSERT INTO public.incident_updates (incident_id, body, status, created_at)
SELECT 
  incidents.id,
  'The issue has been resolved. API response times are back to normal.',
  'resolved',
  incidents.resolved_at
FROM public.incidents
WHERE incidents.title = 'Minor API Latency'
AND incidents.resolved_at IS NOT NULL
AND (SELECT COUNT(*) FROM public.incident_updates WHERE incident_updates.incident_id = incidents.id) = 3
ON CONFLICT DO NOTHING;

-- ============================================
-- CREATE FIRST ADMIN USER (MANUAL - DO NOT RUN IN PRODUCTION!)
-- ============================================

-- Instructions:
-- 1. Sign up a new user in the app (e.g., admin@cafetoolbox.app)
-- 2. Get their UUID from auth.users table via Supabase Dashboard > Database > Table Editor > auth.users
-- 3. Run this query below with their UUID to grant admin role:

-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'admin@cafetoolbox.app';
