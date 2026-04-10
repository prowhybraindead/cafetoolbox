import { updateSession } from "@cafetoolbox/supabase";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authCookieDomain = process.env.AUTH_COOKIE_DOMAIN ?? "localhost";

  // Update session first
  const response = await updateSession(request, {
    supabaseUrl,
    supabaseAnonKey,
    authCookieDomain,
  });

  // Get pathname
  const { pathname } = request.nextUrl;

  // Public routes (no auth required)
  const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/auth/callback"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route));

  // Skip route protection for public routes and auth callback
  if (isPublicRoute) {
    return response;
  }

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