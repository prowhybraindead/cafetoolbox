#!/usr/bin/env node

/**
 * Phase 1 preflight checker for unified migration 0011.
 *
 * Usage:
 *   node scripts/supabase-phase1-preflight.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function parseEnvFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const env = parseEnvFile(envPath);

  for (const key of Object.keys(env)) {
    if (!process.env[key]) process.env[key] = env[key];
  }

  return envPath;
}

function ensureEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

async function getCount(baseUrl, headers, table) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?select=id`, {
    headers: {
      ...headers,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Count failed for ${table}: ${response.status} ${errorBody}`);
  }

  const contentRange = response.headers.get('content-range') ?? '';
  const match = contentRange.match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

async function getRows(baseUrl, headers, path) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, { headers });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Query failed for ${path}: ${response.status} ${errorBody}`);
  }
  return response.json();
}

async function run() {
  const envPath = loadEnv();
  ensureEnv();

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  console.log('=== PHASE 1 PREFLIGHT (LIVE) ===');
  console.log(`Env source: ${envPath}`);

  const tables = [
    'profiles',
    'categories',
    'tools',
    'services',
    'incidents',
    'incident_updates',
  ];

  const counts = {};
  for (const table of tables) {
    counts[table] = await getCount(baseUrl, headers, table);
    console.log(`${table}: ${counts[table]}`);
  }

  const profiles = await getRows(baseUrl, headers, 'profiles?select=id,email,role&limit=10000');
  const roleCountMap = {};

  for (const profile of profiles) {
    const role = profile.role ?? 'null';
    roleCountMap[role] = (roleCountMap[role] ?? 0) + 1;
  }

  console.log('\nRole quality:');
  for (const role of Object.keys(roleCountMap).sort()) {
    console.log(`  ${role}: ${roleCountMap[role]}`);
  }

  const invalidProfiles = profiles.filter((profile) => {
    if (!profile.role) return true;
    const normalized = String(profile.role).toLowerCase();
    return !['superadmin', 'admin', 'user'].includes(normalized);
  });

  console.log(`\nUnexpected/null roles: ${invalidProfiles.length}`);
  for (const profile of invalidProfiles.slice(0, 20)) {
    console.log(`  ${profile.id} | ${profile.email} | ${profile.role}`);
  }

  const tools = await getRows(baseUrl, headers, 'tools?select=id,slug,status,size&limit=10000');
  const invalidTools = tools.filter((tool) => {
    const status = String(tool.status ?? '').toLowerCase();
    const size = String(tool.size ?? '').toLowerCase();

    return !['active', 'beta', 'archived', 'maintenance'].includes(status)
      || !['small', 'medium', 'large'].includes(size);
  });

  console.log(`\nTool status/size drift rows: ${invalidTools.length}`);
  for (const tool of invalidTools.slice(0, 20)) {
    console.log(`  ${tool.id} | ${tool.slug} | status=${tool.status} | size=${tool.size}`);
  }

  const hasBlockingIssues = invalidProfiles.length > 0 || invalidTools.length > 0;
  if (hasBlockingIssues) {
    console.log('\nResult: BLOCKED (fix data drift before migration apply)');
    process.exit(2);
  }

  console.log('\nResult: PASS (Phase 1 preflight checks succeeded)');
}

run().catch((error) => {
  console.error(`\nPreflight failed: ${error.message}`);
  process.exit(1);
});
