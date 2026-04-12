/**
 * @cafetoolbox/supabase - Server-side Supabase client
 *
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Follows the official @supabase/ssr v0.6.x pattern.
 *
 * Cookie strategy:
 *   - Production: domain = ".cafetoolbox.app", secure = true, sameSite = lax
 *   - Development: no domain (host-only), secure = false, sameSite = lax
 *
 * MUST keep cookie options aligned with client.ts and middleware.ts.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type ServerClientOptions = {
  supabaseUrl?: string;
  supabaseKey?: string;
  authCookieDomain?: string;
};

type CookieItem = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * Regex to detect Supabase auth cookie names.
 * MUST stay in sync with client.ts and middleware.ts.
 */
const SB_AUTH_COOKIE_RE =
  /^sb-[^-]+-auth-token(?:\.\d+)?$|^sb-[^-]+-auth-token-code-verifier$/;

// ---------------------------------------------------------------------------
// Cookie domain helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the authoritative cookie domain.
 * - "localhost" / "127.0.0.1" / unset → undefined (host-only cookie)
 * - anything else → the domain string as-is
 */
export function resolveCookieDomain(domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  if (domain === "localhost" || domain === "127.0.0.1") return undefined;
  return domain;
}

/** Resolve from environment + optional override. */
function getEffectiveDomain(override?: string): string | undefined {
  const raw = override ?? process.env.AUTH_COOKIE_DOMAIN ?? "localhost";
  return resolveCookieDomain(raw);
}

// ---------------------------------------------------------------------------
// Shared cookie handlers
// ---------------------------------------------------------------------------

function makeCookieHandlers(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  cookieDomain: string | undefined,
) {
  const isProd = process.env.NODE_ENV === "production";

  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: CookieItem[]) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          const isAuthCookie = SB_AUTH_COOKIE_RE.test(name);

          cookieStore.set(name, value, {
            ...options,
            sameSite: "lax" as const,
            secure: isProd,
            path: "/",
            ...(cookieDomain && isAuthCookie ? { domain: cookieDomain } : {}),
          });
        }
      } catch {
        // `setAll` is called from Server Components where setting cookies
        // isn't allowed. Safe to ignore — middleware handles session refresh.
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a normal (anon-key) server-side Supabase client.
 */
export async function createClient(options: ServerClientOptions = {}) {
  const cookieStore = await cookies();
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = options.supabaseKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieDomain = getEffectiveDomain(options.authCookieDomain);

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Your project's URL and Key are required to create a Supabase client!");
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: makeCookieHandlers(cookieStore, cookieDomain),
  });
}

/**
 * Creates a Supabase admin client using the service role key.
 * WARNING: This client bypasses Row Level Security (RLS).
 * Only use in Server Components, Server Actions, or Route Handlers
 * where administrative privileges are needed.
 */
export async function createAdminClient() {
  return createAdminClientWithOptions();
}

export async function createAdminClientWithOptions(options: ServerClientOptions = {}) {
  const cookieStore = await cookies();
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = options.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cookieDomain = getEffectiveDomain(options.authCookieDomain);

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Your project's URL and Key are required to create a Supabase client!");
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: makeCookieHandlers(cookieStore, cookieDomain),
  });
}
