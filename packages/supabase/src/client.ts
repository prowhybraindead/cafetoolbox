/**
 * @cafetoolbox/supabase - Browser (client-side) Supabase client
 *
 * Creates a Supabase client for use in Client Components.
 * Follows the official @supabase/ssr v0.6.x pattern for Next.js App Router.
 *
 * Cookie strategy:
 *   - Production: domain = ".cafetoolbox.app", secure = true, sameSite = lax
 *   - Development: no domain (host-only), secure = false, sameSite = lax
 *
 * Key insight: @supabase/ssr uses chunked cookies (sb-xxx-auth-token.0, .1, …)
 * when the JWT exceeds 4KB. We must NOT interfere with Supabase's own
 * getAll/setAll cycle — just provide clean cookie options per cookie.
 */

import { createBrowserClient } from "@supabase/ssr";

type CookieItem = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Determine cookie domain from env or browser hostname.
 * Returns `undefined` for localhost (host-only cookie), ".cafetoolbox.app" for prod.
 */
function getCookieDomain(): string | undefined {
  // Priority 1: explicit env variable (NEXT_PUBLIC_ so it's available in browser)
  const envDomain = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;
  if (envDomain && envDomain !== "localhost" && envDomain !== "127.0.0.1") {
    return envDomain;
  }

  // Priority 2: infer from browser hostname
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (
      hostname &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      (hostname === "cafetoolbox.app" || hostname.endsWith(".cafetoolbox.app"))
    ) {
      return ".cafetoolbox.app";
    }
  }

  // Development: no domain → host-only cookie
  return undefined;
}

/**
 * Check if we're on HTTPS (production).
 */
function isSecure(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

/**
 * Build a Set-Cookie string from parts.
 */
function toCookieString(
  name: string,
  value: string,
  opts: Record<string, unknown> = {}
): string {
  const parts: string[] = [`${name}=${value}`];
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (typeof opts.domain === "string" && opts.domain.length > 0) parts.push(`Domain=${opts.domain}`);
  if (typeof opts.maxAge === "number") parts.push(`Max-Age=${opts.maxAge}`);
  if (typeof opts.expires === "string") parts.push(`Expires=${opts.expires}`);
  if (typeof opts.sameSite === "string") parts.push(`SameSite=${opts.sameSite}`);
  if (opts.secure === true) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Regex to detect Supabase auth cookie names.
 * Matches: sb-<ref>-auth-token, sb-<ref>-auth-token.0..n, sb-<ref>-auth-token-code-verifier
 */
const SB_AUTH_COOKIE_RE =
  /^sb-[^-]+-auth-token(?:\.\d+)?$|^sb-[^-]+-auth-token-code-verifier$/;

// ---------------------------------------------------------------------------
// Exported helpers (used by auth.ts)
// ---------------------------------------------------------------------------

export { getCookieDomain, isSecure, toCookieString, SB_AUTH_COOKIE_RE };

// ---------------------------------------------------------------------------
// Create Browser Client
// ---------------------------------------------------------------------------

export function createClient() {
  const cookieDomain = getCookieDomain();
  const secure = isSecure();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          const raw = document.cookie;
          if (!raw) return [];
          return raw.split("; ").map((entry) => {
            const [name, ...rest] = entry.split("=");
            return { name, value: rest.join("=") };
          });
        },

        setAll(cookiesToSet: CookieItem[]) {
          if (typeof document === "undefined") return;

          for (const { name, value, options } of cookiesToSet) {
            const isAuthCookie = SB_AUTH_COOKIE_RE.test(name);

            // Build cookie options — single authoritative domain variant per cookie
            const cookieOpts: Record<string, unknown> = {
              path: options?.path ?? "/",
              sameSite: "lax",
              secure,
              ...(options ?? {}),
            };

            // Only set domain on auth cookies when we have one
            if (isAuthCookie && cookieDomain) {
              cookieOpts.domain = cookieDomain;
            }

            document.cookie = toCookieString(name, value, cookieOpts);
          }
        },
      },
    }
  );
}
