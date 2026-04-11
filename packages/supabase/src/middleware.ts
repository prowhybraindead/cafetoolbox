/**
 * @cafetoolbox/supabase - Middleware Supabase client
 *
 * Creates a Supabase client for use in Next.js middleware.
 * Handles session refresh and cookie management.
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
 * Cookie domain configuration for cross-subdomain auth.
 */
const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN ?? "localhost";

function isSupabaseAuthCookieName(name: string) {
  return /^sb-.*-auth-token(?:\.\d+)?$/.test(name) || /^sb-.*-auth-token-code-verifier$/.test(name);
}

function resolveCookieDomain(domain: string | undefined) {
  if (!domain) return undefined;
  if (domain === "localhost" || domain === "127.0.0.1") {
    return undefined;
  }
  return domain;
}

export async function updateSession(
  request: NextRequest,
  options: UpdateSessionOptions = {}
) {
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = options.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieDomain = resolveCookieDomain(options.authCookieDomain ?? AUTH_COOKIE_DOMAIN);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Your project's URL and Key are required to create a Supabase client!");
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieItem[]) {
          const incomingCookieNames = new Set(cookiesToSet.map(({ name }) => name));
          const existingCookieNames = request.cookies
            .getAll()
            .map((cookie) => cookie.name)
            .filter(isSupabaseAuthCookieName);

          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });

          // Remove stale auth cookie chunks that are not part of the new set.
          existingCookieNames.forEach((name) => {
            if (incomingCookieNames.has(name)) {
              return;
            }

            supabaseResponse.cookies.set(name, "", {
              maxAge: 0,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });

            if (cookieDomain) {
              supabaseResponse.cookies.set(name, "", {
                maxAge: 0,
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                domain: cookieDomain,
              });
            }
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = {
              ...options,
              sameSite: "lax" as const,
              secure: process.env.NODE_ENV === "production",
              path: "/",
            };

            if (cookieDomain) {
              // Clear any host-only cookie variant to avoid duplicate cookie header growth.
              supabaseResponse.cookies.set(name, "", {
                maxAge: 0,
                path: "/",
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              });
            }

            supabaseResponse.cookies.set(name, value, {
              ...cookieOptions,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            });
          });
        },
      },
    }
  );

  // Refresh the session - this is important for keeping the user logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
