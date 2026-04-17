/**
 * Test Supabase Connection
 * Run with: node scripts/test-supabase-connection.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf-8");
  const env = {};

  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && !key.startsWith("#") && valueParts.length > 0) {
      const value = valueParts.join("=").trim();
      env[key.trim()] = value;
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });

  return env;
}

function createHeaders() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function fetchRows(path) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: createHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    return { data: null, error: `${response.status} ${body}` };
  }

  const data = await response.json();
  return { data, error: null };
}

async function testSupabaseConnection() {
  console.log("Testing Supabase Connection...\n");

  const env = loadEnv();

  console.log("Environment Variables:");
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${env.NEXT_PUBLIC_SUPABASE_URL ? "OK" : "Missing"}`);
  console.log(
    `  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "OK" : "Missing"}`
  );
  console.log(`  AUTH_COOKIE_DOMAIN: ${env.AUTH_COOKIE_DOMAIN || "localhost"}\n`);

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log("Missing required environment variables.\n");
    process.exit(1);
  }

  console.log("Test 1: Query profiles table...");
  const profilesResult = await fetchRows("profiles?select=id,email,role&limit=1");
  if (profilesResult.error) {
    console.log(`  Failed: ${profilesResult.error}`);
    console.log("  Hint: Verify baseline schema and RLS are already applied in your Supabase project.\n");
    process.exit(1);
  }
  console.log(`  OK: profiles accessible (${profilesResult.data?.length ?? 0} row sample)\n`);

  console.log("Test 2: Query tools table...");
  const toolsResult = await fetchRows("tools?select=id,name,slug,status&limit=5");
  if (toolsResult.error) {
    console.log(`  Failed: ${toolsResult.error}`);
    console.log("  Hint: Check RLS policies and table grants for anon/authenticated access.\n");
  } else {
    console.log(`  OK: tools accessible (${toolsResult.data?.length ?? 0} rows)\n`);
  }

  console.log("Test 3: Query services table...");
  const servicesResult = await fetchRows("services?select=id,name,status,uptime&limit=10");
  if (servicesResult.error) {
    console.log(`  Failed: ${servicesResult.error}\n`);
  } else {
    console.log(`  OK: services accessible (${servicesResult.data?.length ?? 0} rows)\n`);
  }

  console.log("Done.");
  console.log("Migration references in this repository currently include:");
  console.log("  - packages/supabase/migrations/0014_add_service_uptime_daily.sql");
  console.log("  - packages/supabase/migrations/0015_monitoring_correctness_hardening.sql");
  console.log("  - packages/supabase/migrations/0016_add_worker_heartbeats.sql");
  console.log("  - packages/supabase/migrations/0017_seed_convertube_service.sql\n");
}

testSupabaseConnection().catch((error) => {
  console.log(`Unexpected error: ${error.message}`);
  process.exit(1);
});
