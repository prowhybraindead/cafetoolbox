'use client';

import { useEffect } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';

export function SupabaseConfigWarning() {
  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.info(
        '%c⚠️  Supabase Not Configured',
        'color: #ff9800; font-weight: bold; font-size: 14px;',
        '\n\nChat history will only be saved locally. To enable cloud sync:\n' +
        '1. Set up Supabase: https://supabase.com\n' +
        '2. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local\n' +
        '3. Create tables using supabase/migrations/20250415_create_chat_sessions.sql\n' +
        '4. See DATABASE_SETUP.md for detailed instructions\n'
      );
    }
  }, []);

  return null;
}
