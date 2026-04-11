/**
 * @cafetoolbox/supabase - Browser (client-side) Supabase client
 *
 * Creates a Supabase client for use in Client Components.
 * Handles session management with cookies.
 */

import { createBrowserClient } from "@supabase/ssr";

type CookieItem = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

const AUTH_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN;

function isSupabaseAuthCookieName(name: string) {
  return /^sb-.*-auth-token(?:\.\d+)?$/.test(name) || /^sb-.*-auth-token-code-verifier$/.test(name);
}

function inferProjectCookieDomain(hostname: string | undefined) {
  if (!hostname) return undefined;
  if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;

  // Project-specific safe fallback for shared subdomain auth.
  if (hostname === "cafetoolbox.app" || hostname.endsWith(".cafetoolbox.app")) {
    return ".cafetoolbox.app";
  }

  return undefined;
}

function resolveCookieDomain(domain: string | undefined) {
  if (!domain) return undefined;
  if (domain === "localhost" || domain === "127.0.0.1") {
    return undefined;
  }
  return domain;
}

function toCookieString(
  name: string,
  value: string,
  options: Record<string, unknown> = {}
) {
  const parts: string[] = [`${name}=${value}`];

  if (typeof options.path === "string") {
    parts.push(`Path=${options.path}`);
  }
  if (typeof options.domain === "string" && options.domain.length > 0) {
    parts.push(`Domain=${options.domain}`);
  }
  if (typeof options.expires === "string") {
    parts.push(`Expires=${options.expires}`);
  }
  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (typeof options.sameSite === "string") {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure === true) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function createClient() {
  const inferredDomain =
    typeof window !== "undefined" ? inferProjectCookieDomain(window.location.hostname) : undefined;
  const cookieDomain = resolveCookieDomain(AUTH_COOKIE_DOMAIN ?? inferredDomain);

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") {
            return [];
          }
          const cookieStr = document.cookie;
          if (!cookieStr) return [];
          return cookieStr.split("; ").map((cookie) => {
            const [name, ...valueParts] = cookie.split("=");
            return {
              name,
              value: valueParts.join("="),
            };
          });
        },
        setAll(cookiesToSet: CookieItem[]) {
          if (typeof document === "undefined") {
            return;
          }

          const incomingCookieNames = new Set(cookiesToSet.map(({ name }) => name));
          const existingCookieNames = document.cookie
            ? document.cookie
                .split("; ")
                .map((cookie) => cookie.split("=")[0])
                .filter((name): name is string => Boolean(name))
            : [];

          // Remove stale Supabase auth cookies/chunks that are no longer emitted.
          existingCookieNames.forEach((name) => {
            if (!isSupabaseAuthCookieName(name)) {
              return;
            }
            if (incomingCookieNames.has(name)) {
              return;
            }

            const clearOptions = {
              path: "/",
              maxAge: 0,
              sameSite: "lax",
              secure: typeof window !== "undefined" ? window.location.protocol === "https:" : false,
            } as Record<string, unknown>;

            // Clear host-only variant.
            document.cookie = toCookieString(name, "", clearOptions);

            // Clear domain variant.
            if (cookieDomain) {
              document.cookie = toCookieString(name, "", {
                ...clearOptions,
                domain: cookieDomain,
              });
            }
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            const mergedOptions = {
              ...(options ?? {}),
              path: "/",
              sameSite: "lax",
              secure: typeof window !== "undefined" ? window.location.protocol === "https:" : false,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            } as Record<string, unknown>;

            if (cookieDomain) {
              // Remove old host-only cookie variant to prevent duplicate auth cookies in requests.
              document.cookie = toCookieString(name, "", {
                path: "/",
                maxAge: 0,
                sameSite: "lax",
                secure: mergedOptions.secure,
              });
            }

            document.cookie = toCookieString(name, value, mergedOptions);
          });
        },
      },
    }
  );
}
