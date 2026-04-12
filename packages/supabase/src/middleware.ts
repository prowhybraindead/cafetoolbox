/**
 * @cafetoolbox/supabase - Middleware Supabase client
 *
 * Creates a Supabase client for use in Next.js middleware.
 * Handles session refresh and route protection.
 *
 * Cookie strategy (MUST match client.ts and server.ts):
 *   - Production: domain = ".cafetoolbox.app", secure = true, sameSite = lax
 *   - Development: no domain (host-only), secure = false, sameSite = lax
 *
 * The middleware ONLY refreshes sessions and sets fresh cookies.
 * It does NOT clear cookies on every request — that's logout's job.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UpdateSessionOptions = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  authCookieDomain?: string;
};

type CookieItem = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * Regex to detect Supabase auth cookie names.
 * MUST stay in sync with client.ts and server.ts.
 */
const SB_AUTH_COOKIE_RE =
  /^sb-[^-]+-auth-token(?:\.\d+)?$|^sb-[^-]+-auth-token-code-verifier$/;

/**
 * Resolve cookie domain from raw value.
 * Returns undefined for localhost (host-only), otherwise the domain string.
 */
function resolveCookieDomain(domain: string | undefined): string | undefined {
  if (!domain) return undefined;
  if (domain === "localhost" || domain === "127.0.0.1") return undefined;
  return domain;
}

/**
 * Get effective cookie domain from env or options override.
 */
function getEffectiveDomain(override?: string): string | undefined {
  const raw = override ?? process.env.AUTH_COOKIE_DOMAIN ?? "localhost";
  return resolveCookieDomain(raw);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function updateSession(
  request: NextRequest,
  options: UpdateSessionOptions = {}
) {
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = options.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieDomain = getEffectiveDomain(options.authCookieDomain);
  const isProd = process.env.NODE_ENV === "production";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Your project's URL and Key are required to create a Supabase client!");
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieItem[]) {
        // Copy new cookies into the request so Supabase can read them
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });

        // Set fresh cookies with correct domain
        for (const { name, value, options: cookieOpts } of cookiesToSet) {
          const isAuthCookie = SB_AUTH_COOKIE_RE.test(name);
          const maxAge = isAuthCookie && typeof cookieOpts?.maxAge !== 'number' ? 60 * 60 * 24 * 7 : cookieOpts?.maxAge;

          supabaseResponse.cookies.set(name, value, {
            ...cookieOpts,
            sameSite: "lax" as const,
            secure: isProd,
            path: "/",
            ...(typeof maxAge === 'number' ? { maxAge } : {}),
            ...(cookieDomain && isAuthCookie ? { domain: cookieDomain } : {}),
          });
        }
      },
    },
  });

  // Refresh the session — this is important for keeping the user logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProd) {
    console.log(`[middleware] ${request.nextUrl.pathname} — domain: ${cookieDomain ?? 'host-only'} — user: ${user ? user.email ?? user.id : 'null'}`);
  }

  // If no user and trying to access protected routes, redirect to login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/register") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/_next") &&
    !request.nextUrl.pathname.startsWith("/api") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
