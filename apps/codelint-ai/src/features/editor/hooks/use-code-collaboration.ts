'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logUsageAction } from '@/lib/usage-actions';
import type { EditorLanguage } from '@/features/editor/stores';

const ROOM_STORAGE_KEY = 'codelint_collab_room_id';
const CLIENT_STORAGE_KEY = 'codelint_collab_client_id';
const DEFAULT_ROOM_PREFIX = 'codelint-room';

type PresenceState = {
  clientId: string;
  name: string;
  joinedAt: number;
};

type BroadcastPayload = {
  code: string;
  language: EditorLanguage;
  senderId: string;
  timestamp: number;
};

const getOrCreateStableId = (storageKey: string, prefix: string): string => {
  if (typeof window === 'undefined') {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  const existing = window.sessionStorage.getItem(storageKey) || window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const generated = `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(storageKey, generated);
  return generated;
};

const getRoomFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('room');
};

const resolveRoomId = (): string => {
  if (typeof window === 'undefined') return `${DEFAULT_ROOM_PREFIX}-${Math.random().toString(36).slice(2, 10)}`;

  const fromUrl = getRoomFromUrl();
  if (fromUrl) {
    window.localStorage.setItem(ROOM_STORAGE_KEY, fromUrl);
    return fromUrl;
  }

  const stored = window.localStorage.getItem(ROOM_STORAGE_KEY);
  if (stored) return stored;

  const generated = `${DEFAULT_ROOM_PREFIX}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(ROOM_STORAGE_KEY, generated);

  return generated;
};

export function useCodeCollaboration(
  code: string,
  language: EditorLanguage,
  onRemoteChange: (payload: { code: string; language: EditorLanguage }) => void
) {
  const [roomId] = useState<string | null>(() => (typeof window === 'undefined' ? null : resolveRoomId()));
  const [participants, setParticipants] = useState<PresenceState[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const clientIdRef = useRef<string>(typeof window === 'undefined' ? '' : getOrCreateStableId(CLIENT_STORAGE_KEY, 'client'));
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const skipBroadcastRef = useRef(false);
  const lastSentSignatureRef = useRef<string>('');
  const debounceTimerRef = useRef<number | null>(null);
  const onRemoteChangeRef = useRef(onRemoteChange);

  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
  }, [onRemoteChange]);

  const collaboratorCount = useMemo(() => {
    const uniqueIds = new Set(participants.map((item) => item.clientId));
    return uniqueIds.size;
  }, [participants]);

  useEffect(() => {
    if (!roomId || typeof window === 'undefined') return;

    const nextUrl = new URL(window.location.href);
    if (nextUrl.searchParams.get('room') !== roomId) {
      nextUrl.searchParams.set('room', roomId);
      window.history.replaceState({}, '', nextUrl.toString());
    }

    window.localStorage.setItem(ROOM_STORAGE_KEY, roomId);
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !clientIdRef.current) return;

    const channel = supabase.channel(`code-collab:${roomId}`, {
      config: {
        presence: {
          key: clientIdRef.current,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const flattened = Object.values(state).flat().filter(Boolean) as PresenceState[];
        setParticipants(flattened);
      })
      .on('broadcast', { event: 'code:update' }, ({ payload }) => {
        const message = payload as BroadcastPayload;
        if (!message || message.senderId === clientIdRef.current) return;

        skipBroadcastRef.current = true;
        onRemoteChangeRef.current({ code: message.code, language: message.language });
        setLastSyncedAt(message.timestamp);
        window.setTimeout(() => {
          skipBroadcastRef.current = false;
        }, 0);
      })
      .subscribe(async (status) => {
        setIsConnected(status === 'SUBSCRIBED');

        if (status === 'SUBSCRIBED') {
          await channel.track({
            clientId: clientIdRef.current,
            name: `User ${clientIdRef.current.slice(-4)}`,
            joinedAt: Date.now(),
          });
          void logUsageAction({
            actionName: 'collaboration_connected',
            actionSource: 'code_collaboration',
            roomId,
            language,
            metadata: {
              participantClientId: clientIdRef.current,
            },
          });
        }
      });

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !channelRef.current || !isConnected) return;

    const signature = `${language}:${code}`;
    if (skipBroadcastRef.current || signature === lastSentSignatureRef.current) return;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const currentSignature = `${language}:${code}`;
      lastSentSignatureRef.current = currentSignature;
      channelRef.current?.send({
        type: 'broadcast',
        event: 'code:update',
        payload: {
          code,
          language,
          senderId: clientIdRef.current,
          timestamp: Date.now(),
        } satisfies BroadcastPayload,
      });
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [code, language, isConnected, roomId]);

  const copyInviteLink = async () => {
    if (typeof window === 'undefined' || !roomId) return;

    const inviteUrl = new URL(window.location.href);
    inviteUrl.searchParams.set('room', roomId);
    await navigator.clipboard.writeText(inviteUrl.toString());
    void logUsageAction({
      actionName: 'collaboration_invite_link_copied',
      actionSource: 'code_collaboration',
      roomId,
      language,
    });
  };

  return {
    roomId,
    collaboratorCount,
    participants,
    isConnected,
    lastSyncedAt,
    copyInviteLink,
  };
}
