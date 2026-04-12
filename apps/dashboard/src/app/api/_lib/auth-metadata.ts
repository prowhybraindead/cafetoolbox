export const MAX_DISPLAY_NAME_LENGTH = 80;
export const MAX_AVATAR_URL_LENGTH = 1024;

/**
 * Allowed keys in user_metadata. Any key NOT in this set will be stripped
 * when using buildUserMetadataReplacement(). Role is NEVER stored in
 * user_metadata — it belongs in app_metadata only.
 */
const USER_METADATA_ALLOWLIST = new Set(['display_name', 'avatar_url']);

export function sanitizeDisplayName(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const nextValue = raw || fallback.trim() || 'User';
  return nextValue.slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export function sanitizeAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;

  // data: URLs are base64-encoded images injected by OAuth providers (Google etc.).
  // They can be 10–20 KB each and bloat the JWT to 17+ cookie chunks → 494 errors.
  // Strip silently — the callback handler is responsible for rejecting them early.
  if (raw.startsWith('data:')) return null;

  if (raw.length > MAX_AVATAR_URL_LENGTH) {
    throw new Error('Avatar URL quá dài');
  }

  const parsed = new URL(raw);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Avatar URL phải dùng http hoặc https');
  }

  return raw;
}

/**
 * Build a FULL REPLACEMENT user_metadata object. This is NOT a merge patch —
 * it contains exactly the fields that should exist in raw_user_meta_data after
 * the update. Supabase GoTrue deep-merges by default, but the admin API
 * `updateUserById()` can be combined with explicit null-setting of unwanted
 * keys to achieve a clean replacement.
 *
 * Only allowlisted keys (display_name, avatar_url) are preserved.
 * Everything else (including role, sub, email, email_verified, provider, etc.)
 * is intentionally excluded to prevent metadata bloat.
 */
export function buildUserMetadataReplacement(input: {
  display_name?: unknown;
  avatar_url?: unknown;
  fallbackDisplayName: string;
}): Record<string, string> {
  const display_name = sanitizeDisplayName(input.display_name, input.fallbackDisplayName);
  const avatar_url = sanitizeAvatarUrl(input.avatar_url);

  const result: Record<string, string> = { display_name };
  if (avatar_url) result.avatar_url = avatar_url;

  return result;
}

/**
 * Given existing user_metadata from the database, return a replacement object
 * that strips all keys not in the allowlist. Unknown keys are set to null so
 * that GoTrue's deep-merge effectively deletes them.
 *
 * Use this with admin.updateUserById() to compact bloated metadata.
 */
export function buildCleanUserMetadata(
  existingMeta: Record<string, unknown> | null | undefined,
  input: {
    display_name?: unknown;
    avatar_url?: unknown;
    fallbackDisplayName: string;
  },
): Record<string, unknown> {
  const clean = buildUserMetadataReplacement(input) as Record<string, unknown>;

  // Explicitly null-out any existing keys that are not allowlisted.
  // GoTrue deep-merges, so setting a key to null removes it.
  if (existingMeta && typeof existingMeta === 'object') {
    for (const key of Object.keys(existingMeta)) {
      if (!USER_METADATA_ALLOWLIST.has(key) && !(key in clean)) {
        clean[key] = null;
      }
    }
  }

  return clean;
}

export function buildAppMetadataPatch(role: string | null | undefined) {
  return {
    role: role ?? 'user',
  };
}