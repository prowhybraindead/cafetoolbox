/**
 * JWT Utility Functions
 * Pure client-side JWT encode/decode using base64url
 * No external dependencies needed for decoding — `jose` used for signing only
 */

export interface DecodedJWT {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: { header: string; payload: string; signature: string };
}

export type TokenStatus = 'valid' | 'expired' | 'invalid';

export interface JWTValidation {
  status: TokenStatus;
  message: string;
}

/**
 * Base64url decode a string to UTF-8
 */
function base64urlDecode(str: string): string {
  // Replace URL-safe chars and add padding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding === 2) base64 += '==';
  else if (padding === 3) base64 += '=';

  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    throw new Error('Invalid base64url encoding');
  }
}

/**
 * Parse a JWT token into its parts
 */
export function parseJWT(token: string): DecodedJWT {
  const trimmed = token.trim();
  const parts = trimmed.split('.');

  if (parts.length !== 3) {
    throw new Error(`Invalid JWT format: expected 3 parts, got ${parts.length}`);
  }

  const rawHeader = parts[0]!;
  const rawPayload = parts[1]!;
  const rawSignature = parts[2]!;

  try {
    const header = JSON.parse(base64urlDecode(rawHeader));
    const payload = JSON.parse(base64urlDecode(rawPayload));

    return {
      header,
      payload,
      signature: rawSignature,
      raw: {
        header: rawHeader,
        payload: rawPayload,
        signature: rawSignature,
      },
    };
  } catch (e) {
    throw new Error(`Failed to decode JWT: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

/**
 * Validate JWT claims
 */
export function validateJWT(decoded: DecodedJWT): JWTValidation {
  const { payload } = decoded;
  const now = Math.floor(Date.now() / 1000);

  // Check expiration
  if (typeof payload.exp === 'number') {
    if (payload.exp < now) {
      return {
        status: 'expired',
        message: `Token expired at ${formatTimestamp(payload.exp)}`,
      };
    }
  }

  // Check not-before
  if (typeof payload.nbf === 'number') {
    if (payload.nbf > now) {
      return {
        status: 'invalid',
        message: `Token not yet valid (nbf: ${formatTimestamp(payload.nbf)})`,
      };
    }
  }

  // Check issued-at is not in the future
  if (typeof payload.iat === 'number') {
    if (payload.iat > now + 60) {
      return {
        status: 'invalid',
        message: 'Token issued-at time is in the future',
      };
    }
  }

  return { status: 'valid', message: 'Token is valid' };
}

/**
 * Format a UNIX timestamp to human-readable string
 */
export function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });

  if (Math.abs(diff) < 60_000) {
    return rtf.format(Math.round(-diff / 1000), 'second');
  } else if (Math.abs(diff) < 3_600_000) {
    return rtf.format(Math.round(-diff / 60_000), 'minute');
  } else if (Math.abs(diff) < 86_400_000) {
    return rtf.format(Math.round(-diff / 3_600_000), 'hour');
  } else if (Math.abs(diff) < 2_628_000_000) {
    return rtf.format(Math.round(-diff / 86_400_000), 'day');
  }

  return date.toLocaleString('vi-VN');
}

/**
 * Get human-readable time for relative timestamps
 */
export function getRelativeTimeLabel(seconds: number): string {
  if (seconds <= 0) return 'Ngay bây giờ';
  if (seconds < 60) return `${seconds} giây`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ`;
  return `${Math.floor(seconds / 86400)} ngày`;
}

/**
 * Default JWT payload template
 */
export const DEFAULT_PAYLOAD: Record<string, unknown> = {
  sub: '1234567890',
  name: 'John Doe',
  iat: Math.floor(Date.now() / 1000),
};

/**
 * Default JWT header template
 */
export const DEFAULT_HEADER: Record<string, unknown> = {
  alg: 'HS256',
  typ: 'JWT',
};

/**
 * Pretty print JSON with syntax highlighting classes
 */
export function prettyJSON(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
  }
}
