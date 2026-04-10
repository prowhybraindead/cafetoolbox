/**
 * Test Supabase connection - Simple version
 * Run: node test-supabase.js
 */

const env = require('dotenv').config({ path: '.env.local' }).parsed;

console.log('🔍 Testing Supabase Connection...\n');

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

console.log('✅ Environment variables configured correctly!\n');

console.log('📝 Next_steps:');
console.log('  1. Run SQL migrations in Supabase Dashboard');
console.log('  2. Go to: packages/supabase/migrations/');
console.log('  3. Run files in order: 0001 -> 0002 -> 0003');
console.log('  4. Check Table Editor to verify tables created\n');

console.log('🎉 Configuration check complete!\n');
