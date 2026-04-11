/**
 * @cafetoolbox/supabase - Server-side Supabase client
 *
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Handles cookie-based auth properly with Next.js 16.
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
 * Cookie domain configuration for cross-subdomain auth.
 * Set to `.cafetoolbox.app` in production for shared auth.
 */
const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN ?? "localhost";

function resolveCookieDomain(domain: string | undefined) {
  if (!domain) return undefined;
  if (domain === "localhost" || domain === "127.0.0.1") {
    return undefined;
  }
  return domain;
}

export async function createClient(options: ServerClientOptions = {}) {
  const cookieStore = await cookies();
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = options.supabaseKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieDomain = resolveCookieDomain(options.authCookieDomain ?? AUTH_COOKIE_DOMAIN);

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Your project's URL and Key are required to create a Supabase client!");
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = {
                ...options,
                sameSite: "lax" as const,
                secure: process.env.NODE_ENV === "production",
                path: "/",
              };

              if (cookieDomain) {
                cookieStore.set(name, "", {
                  maxAge: 0,
                  path: "/",
                  sameSite: "lax",
                  secure: process.env.NODE_ENV === "production",
                });
              }

              cookieStore.set(name, value, {
                ...cookieOptions,
                ...(cookieDomain ? { domain: cookieDomain } : {}),
              });
            });
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if middleware refreshes sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase admin client using the service role key.
 * WARNING: This client bypasses Row Level Security (RLS).
 * Only use this in Server Components, Server Actions, or Route Handlers
 * where you need administrative privileges (e.g., creating users, deleting users).
 */
export async function createAdminClient() {
  return createAdminClientWithOptions();
}

export async function createAdminClientWithOptions(
  options: ServerClientOptions = {}
) {
  const cookieStore = await cookies();
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = options.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cookieDomain = resolveCookieDomain(options.authCookieDomain ?? AUTH_COOKIE_DOMAIN);

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Your project's URL and Key are required to create a Supabase client!");
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieOptions = {
                ...options,
                sameSite: "lax" as const,
                secure: process.env.NODE_ENV === "production",
                path: "/",
              };

              if (cookieDomain) {
                cookieStore.set(name, "", {
                  maxAge: 0,
                  path: "/",
                  sameSite: "lax",
                  secure: process.env.NODE_ENV === "production",
                });
              }

              cookieStore.set(name, value, {
                ...cookieOptions,
                ...(cookieDomain ? { domain: cookieDomain } : {}),
              });
            });
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if middleware refreshes sessions.
          }
        },
      },
    }
  );
}
