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
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = toCookieString(
              name,
              value,
              (options ?? {}) as Record<string, unknown>
            );
          });
        },
      },
    }
  );
}
