/**
 * CafeToolbox Dashboard - Route Protection Middleware (Next.js 16)
 *
 * This is the active middleware entry point. It uses the updated
 * updateSession() from @cafetoolbox/supabase which includes:
 *   - Pre-emptive auth cookie deduplication (removes host-only variants)
 *   - Stale cookie cleanup across all domain variants
 *   - Single authoritative cookie domain per auth cookie
 *
 * The middleware-updated.ts file is kept as backup only.
 */

import { updateSession } from "@cafetoolbox/supabase";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN ?? "localhost";

  // updateSession() now handles:
  //  1. Deduplication of host-only vs domain-scoped auth cookies
  //  2. Stale cookie cleanup
  //  3. Session refresh with single authoritative domain
  //  4. Route protection (redirect to /login if unauthenticated)
  const response = await updateSession(request, {
    supabaseUrl,
    supabaseAnonKey,
    authCookieDomain,
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};