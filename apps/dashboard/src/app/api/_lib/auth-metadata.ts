export const MAX_DISPLAY_NAME_LENGTH = 80;
export const MAX_AVATAR_URL_LENGTH = 1024;

export function sanitizeDisplayName(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const nextValue = raw || fallback.trim() || 'User';
  return nextValue.slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export function sanitizeAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;
  if (raw.length > MAX_AVATAR_URL_LENGTH) {
    throw new Error('Avatar URL quá dài');
  }
  if (raw.startsWith('data:')) {
    throw new Error('Avatar URL không được là data URL');
  }

  const parsed = new URL(raw);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Avatar URL phải dùng http hoặc https');
  }

  return raw;
}

export function buildUserMetadataPatch(input: {
  display_name?: unknown;
  avatar_url?: unknown;
  fallbackDisplayName: string;
}) {
  const display_name = sanitizeDisplayName(input.display_name, input.fallbackDisplayName);
  const avatar_url = sanitizeAvatarUrl(input.avatar_url);

  return {
    display_name,
    ...(avatar_url ? { avatar_url } : {}),
  };
}

export function buildAppMetadataPatch(role: string | null | undefined) {
  return {
    role: role ?? 'user',
  };
}