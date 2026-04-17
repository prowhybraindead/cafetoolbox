import { supabase } from '@/lib/supabase';
import type { EditorLanguage } from '@/features/editor/stores';

const USAGE_ACTIONS_TABLE = 'codelint-usage_actions';
const USAGE_CLIENT_ID_STORAGE_KEY = 'codelint_usage_client_id';

type UsageMetadata = Record<string, unknown>;

export type LogUsageActionInput = {
  actionName: string;
  actionSource: string;
  sessionId?: string | null;
  roomId?: string | null;
  language?: EditorLanguage | null;
  skill?: string | null;
  metadata?: UsageMetadata;
};

const getUsageClientId = (): string | null => {
  if (typeof window === 'undefined') return null;

  const existing = window.localStorage.getItem(USAGE_CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;

  const generated = `usage-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(USAGE_CLIENT_ID_STORAGE_KEY, generated);
  return generated;
};

export async function logUsageAction(input: LogUsageActionInput): Promise<void> {
  try {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : null;
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : null;
    const clientId = getUsageClientId();

    await supabase.from(USAGE_ACTIONS_TABLE).insert({
      action_name: input.actionName,
      action_source: input.actionSource,
      session_id: input.sessionId ?? null,
      room_id: input.roomId ?? null,
      client_id: clientId,
      language: input.language ?? null,
      skill: input.skill ?? null,
      pathname,
      user_agent: userAgent,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error('Failed to log usage action', error);
  }
}