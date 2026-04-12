#!/usr/bin/env node

/**
 * Clean bloated raw_user_meta_data from Supabase auth.users.
 *
 * Problem:
 *   Supabase GoTrue deep-merges user_metadata on every updateUser() call.
 *   Historical writes (unbounded avatar_url, accumulated fields) can bloat
 *   raw_user_meta_data to 10-50+ KB per user. Because @supabase/ssr stores
 *   the full session (including user_metadata x3) in cookies, this causes
 *   cookie chunking (17 chunks = ~54 KB) and HTTP 431/494 errors.
 *
 * What this script does:
 *   1. Connects to Supabase using SUPABASE_SERVICE_ROLE_KEY (admin API).
 *   2. Finds all users where raw_user_meta_data exceeds a size threshold.
 *   3. In dry-run mode (default): shows bloated users and proposed cleanup.
 *   4. With --force: replaces raw_user_meta_data with minimal allowlisted
 *      fields only (display_name, avatar_url if valid http/https URL).
 *      This is a FULL REPLACEMENT, not a merge.
 *
 * Usage:
 *   # Dry-run - show all bloated users (default)
 *   node scripts/clean-bloated-auth-metadata.mjs
 *
 *   # Dry-run with custom threshold (bytes, default 1500)
 *   node scripts/clean-bloated-auth-metadata.mjs --threshold 2000
 *
 *   # Clean a specific user by email
 *   node scripts/clean-bloated-auth-metadata.mjs --force --email user@example.com
 *
 *   # Clean ALL bloated users
 *   node scripts/clean-bloated-auth-metadata.mjs --force --all
 *
 * Environment:
 *   Reads from .env.local in the project root:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_AVATAR_URL_LENGTH = 1024;
const DEFAULT_THRESHOLD = 1500; // bytes

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getFlag(name) {
  return args.includes(`--${name}`);
}

function getOption(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return fallback;
  return args[idx + 1];
}

const FORCE = getFlag('force');
const ALL = getFlag('all');
const TARGET_EMAIL = getOption('email', null);
const THRESHOLD = Number(getOption('threshold', DEFAULT_THRESHOLD));

if (FORCE && !ALL && !TARGET_EMAIL) {
  console.error('\n  ERROR: --force requires either --all or --email <email>\n');
  console.error('  Examples:');
  console.error('    node scripts/clean-bloated-auth-metadata.mjs --force --email user@example.com');
  console.error('    node scripts/clean-bloated-auth-metadata.mjs --force --all\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

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
  try {
    const env = parseEnvFile(envPath);
    for (const key of Object.keys(env)) {
      if (!process.env[key]) process.env[key] = env[key];
    }
  } catch {
    // .env.local may not exist; rely on process.env
  }
}

function ensureEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`\n  Missing environment variables: ${missing.join(', ')}`);
    console.error('  Set them in .env.local or export them before running.\n');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Metadata sanitization (mirrors auth-metadata.ts logic)
// ---------------------------------------------------------------------------

function sanitizeDisplayName(value, fallbackEmail) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const fallback = typeof fallbackEmail === 'string'
    ? fallbackEmail.split('@')[0] || 'User'
    : 'User';
  const next = raw || fallback;
  return next.slice(0, MAX_DISPLAY_NAME_LENGTH);
}

function sanitizeAvatarUrl(value) {
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;
  if (raw.length > MAX_AVATAR_URL_LENGTH) return null; // too long, drop it
  if (raw.startsWith('data:')) return null; // data URLs not allowed

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  } catch {
    return null; // invalid URL
  }

  return raw;
}

const USER_METADATA_ALLOWLIST = new Set(['display_name', 'avatar_url']);

function buildMinimalMetadata(currentMeta, email) {
  const displayName = sanitizeDisplayName(currentMeta?.display_name, email);
  const avatarUrl = sanitizeAvatarUrl(currentMeta?.avatar_url);

  // Start with the allowlisted fields
  const result = { display_name: displayName };

  // Valid avatar keeps; invalid/missing avatar gets explicit null (removes it via GoTrue merge)
  result.avatar_url = avatarUrl ?? null;

  // Explicitly null-out every extra key found in current metadata.
  // GoTrue merge: setting a key to null REMOVES it from raw_user_meta_data.
  if (currentMeta && typeof currentMeta === 'object') {
    for (const key of Object.keys(currentMeta)) {
      if (!USER_METADATA_ALLOWLIST.has(key)) {
        result[key] = null;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Supabase Admin REST API (no SDK dependency — uses native fetch)
// ---------------------------------------------------------------------------

function adminHeaders() {
  return {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

function adminUrl(path) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  return `${base}/auth/v1/admin/${path}`;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function fetchAllUsers() {
  const allUsers = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const res = await fetch(
      adminUrl(`users?page=${page}&per_page=${perPage}`),
      { headers: adminHeaders() },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`  Error fetching users (HTTP ${res.status}): ${body}`);
      process.exit(1);
    }

    const data = await res.json();
    // Supabase returns { users: [...] } or just [...] depending on version
    const users = Array.isArray(data) ? data : (data.users ?? []);
    allUsers.push(...users);

    if (users.length < perPage) break;
    page++;
  }

  return allUsers;
}

async function updateUserMetadata(userId, metadata) {
  const res = await fetch(adminUrl(`users/${userId}`), {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify({ user_metadata: metadata }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { error: { message: `HTTP ${res.status}: ${body}` } };
  }

  return { error: null };
}

function measureMetadataSize(user) {
  const meta = user.user_metadata ?? {};
  return JSON.stringify(meta).length;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function run() {
  loadEnv();
  ensureEnv();

  console.log('\n========================================');
  console.log('  CafeToolbox - Auth Metadata Cleanup');
  console.log('========================================');
  console.log(`  Mode:      ${FORCE ? 'FORCE (will modify data)' : 'DRY-RUN (read-only)'}`);
  console.log(`  Threshold: ${THRESHOLD} bytes`);
  if (TARGET_EMAIL) console.log(`  Target:    ${TARGET_EMAIL}`);
  if (ALL) console.log(`  Target:    ALL bloated users`);
  console.log('');

  // Fetch all users
  console.log('  Fetching users...');
  const allUsers = await fetchAllUsers();
  console.log(`  Total users: ${allUsers.length}\n`);

  // Filter bloated users
  let bloatedUsers = allUsers
    .map((user) => ({
      user,
      metaSize: measureMetadataSize(user),
    }))
    .filter(({ metaSize }) => metaSize > THRESHOLD)
    .sort((a, b) => b.metaSize - a.metaSize);

  // Filter by email if specified
  if (TARGET_EMAIL) {
    bloatedUsers = bloatedUsers.filter(
      ({ user }) => user.email === TARGET_EMAIL
    );

    if (bloatedUsers.length === 0) {
      // Check if user exists but is not bloated
      const targetUser = allUsers.find((u) => u.email === TARGET_EMAIL);
      if (targetUser) {
        const size = measureMetadataSize(targetUser);
        console.log(`  User ${TARGET_EMAIL} found but metadata size (${formatBytes(size)}) is below threshold (${THRESHOLD} B).`);
        console.log('  No cleanup needed.\n');
      } else {
        console.log(`  User ${TARGET_EMAIL} not found.\n`);
      }
      process.exit(0);
    }
  }

  if (bloatedUsers.length === 0) {
    console.log('  No users with bloated metadata found. All clean!\n');
    process.exit(0);
  }

  // Display bloated users
  console.log(`  Found ${bloatedUsers.length} user(s) with metadata > ${THRESHOLD} bytes:\n`);
  console.log('  ' + '-'.repeat(76));

  for (const { user, metaSize } of bloatedUsers) {
    const email = user.email ?? '(no email)';
    const meta = user.user_metadata ?? {};
    const proposed = buildMinimalMetadata(meta, user.email);
    const proposedSize = JSON.stringify(proposed).length;

    console.log(`  Email:         ${email}`);
    console.log(`  User ID:       ${user.id}`);
    console.log(`  Current size:  ${formatBytes(metaSize)}`);
    console.log(`  Proposed size: ${formatBytes(proposedSize)} (${Math.round((1 - proposedSize / metaSize) * 100)}% reduction)`);
    console.log('');
    console.log('  Current raw_user_meta_data:');
    console.log('  ' + JSON.stringify(meta, null, 2).split('\n').join('\n  '));
    console.log('');
    // Show only the kept fields (non-null) for readability
    const keptFields = Object.fromEntries(
      Object.entries(proposed).filter(([, v]) => v !== null)
    );
    console.log('  Proposed minimal metadata (keys set to null will be deleted):');
    console.log('  ' + JSON.stringify(keptFields, null, 2).split('\n').join('\n  '));
    const nulledKeys = Object.keys(proposed).filter((k) => proposed[k] === null);
    if (nulledKeys.length > 0) {
      console.log(`  Keys to DELETE: ${nulledKeys.join(', ')}`);
    }
    console.log('  ' + '-'.repeat(76));
  }

  // Dry-run: stop here
  if (!FORCE) {
    console.log('');
    console.log('  DRY-RUN complete. No changes were made.');
    console.log('');
    console.log('  To apply cleanup, re-run with:');
    if (TARGET_EMAIL) {
      console.log(`    node scripts/clean-bloated-auth-metadata.mjs --force --email ${TARGET_EMAIL}`);
    } else {
      console.log('    node scripts/clean-bloated-auth-metadata.mjs --force --all');
    }
    console.log('');
    console.log('  To clean a specific user:');
    console.log('    node scripts/clean-bloated-auth-metadata.mjs --force --email user@example.com');
    console.log('');
    process.exit(0);
  }

  // Force mode: apply cleanup
  console.log('\n  Applying cleanup...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const { user, metaSize } of bloatedUsers) {
    const email = user.email ?? '(no email)';
    const meta = user.user_metadata ?? {};
    const proposed = buildMinimalMetadata(meta, user.email);

    process.stdout.write(`  Cleaning ${email} (${formatBytes(metaSize)})... `);

    const { error } = await updateUserMetadata(user.id, proposed);

    if (error) {
      console.log(`FAILED: ${error.message}`);
      errorCount++;
    } else {
      const proposedSize = JSON.stringify(proposed).length;
      console.log(`OK (${formatBytes(metaSize)} -> ${formatBytes(proposedSize)})`);
      successCount++;
    }
  }

  console.log('');
  console.log('  ----------------------------------------');
  console.log(`  Results: ${successCount} cleaned, ${errorCount} failed`);
  console.log('  ----------------------------------------');

  if (successCount > 0) {
    console.log('');
    console.log('  IMPORTANT: Cleaned users must re-login to get a fresh,');
    console.log('  smaller JWT and session cookie. Their current session');
    console.log('  still contains the old bloated data until refresh.');
    console.log('');
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('\n  Unexpected error:', err);
  process.exit(1);
});
