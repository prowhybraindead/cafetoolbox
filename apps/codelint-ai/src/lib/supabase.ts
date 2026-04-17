import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const enableChatSync = process.env.NEXT_PUBLIC_ENABLE_CHAT_SYNC === 'true';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isChatSyncEnabled = isSupabaseConfigured && enableChatSync;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
