/**
 * Test Supabase Connection
 * Run with: node scripts/test-supabase-connection.mjs
 */

import { createClient } from '../packages/supabase/src/client.mjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env variables from .env.local
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');

  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });

  return env;
}

// Test functions
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  const env = loadEnv();

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  AUTH_COOKIE_DOMAIN: ${env.AUTH_COOKIE_DOMAIN || 'localhost'}\n`);

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('❌ Fail: Missing required environment variables!\n');
    console.log('Please update .env.local with:');
    console.log('  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n');
    process.exit(1);
  }

  try {
    // Create client
    console.log('🔌 Creating Supabase client...');
    const supabase = createClient();
    console.log('✅ Client created successfully\n');

    // Test 1: Query profiles table
    console.log('📊 Test 1: Query profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.log(`❌ Profiles query failed: ${profilesError.message}\n`);
      console.log('💡 Hint: Run migrations first!\n');
      console.log('Go to Supabase Dashboard > SQL Editor and run:');
      console.log('  1. packages/supabase/migrations/0001_initial_schema.sql');
      console.log('  2. packages/supabase/migrations/0002_rls_policies.sql');
      console.log('  3. packages/supabase/migrations/0003_seed_data.sql\n');
    } else {
      console.log(`✅ Profiles table accessible! Count: ${profiles?.length ?? 0}\n`);
    }

    // Test 2: Query tools table (if profiles works)
    if (!profilesError) {
      console.log('📊 Test 2: Query tools table...');
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('*')
        .limit(5);

      if (toolsError) {
        console.log(`❌ Tools query failed: ${toolsError.message}\n`);
        console.log('💡 Hint: RLS might be blocking access. Check policies in 0002_rls_policies.sql\n');
      } else {
        console.log(`✅ Tools table accessible! Count: ${tools?.length ?? 0}\n`);

        if (tools && tools.length > 0) {
          console.log('📋 First 5 tools:');
          tools.forEach(tool => {
            console.log(`  - ${tool.name} (${tool.status}) - ${tool.slug}`);
          });
          console.log();
        } else {
          console.log('⚠️  No tools found. Did you run seed data?\n');
        }
      }
    }

    // Test 3: Query services table
    if (!profilesError) {
      console.log('📊 Test 3: Query services table...');
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*');

      if (servicesError) {
        console.log(`❌ Services query failed: ${servicesError.message}\n`);
      } else {
        console.log(`✅ Services table accessible! Count: ${services?.length ?? 0}\n`);

        if (services && services.length > 0) {
          console.log('📋 Services status:');
          services.forEach(service => {
            const statusEmoji = service.status === 'operational' ? '🟢' : '🟡';
            console.log(`  ${statusEmoji} ${service.name}: ${service.uptime}% uptime (${service.status})`);
          });
          console.log();
        }
      }
    }

    // Summary
    console.log('🎉 Supabase connection test complete!\n');
    console.log('📝 Next steps:');
    console.log('  1. If migrations failed: Run SQL migrations in Supabase Dashboard');
    console.log('  2. If connection failed: Check .env.local variables');
    console.log('  3. If RLS blocked access: Check policies in 0002_rls_policies.sql');
    console.log('  4. Then: Implement auth flow (login/register pages)\n');

  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
    console.log('💡 Hint: Make sure you created the Supabase project and added keys to .env.local\n');
    process.exit(1);
  }
}

// Run test
testSupabaseConnection();
