import { createServerClient } from '@cafetoolbox/supabase';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware to protect routes and handle auth
 *
 * Routes protection:
 * - Public: /, /login, /register, /forgot-password, /auth/callback, /auth/reset-password
 * - Protected: /dashboard, /dashboard/tools, /dashboard/users, /dashboard/settings
 * - Legacy redirects: /tools, /settings
 * - Admin only: /dashboard/users (users page)
 */

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl;

  // Public routes (no auth required)
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/auth/callback', '/auth/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));

  // Skip middleware for public routes
  if (isPublicRoute) {
    // Update session for all routes (even public ones)
    const supabase = await createServerClient();
    await supabase.auth.getSession();

    return NextResponse.next({ request });
  }

  // Protected routes - require authentication
  const response = NextResponse.next({ request });

  // Create Supabase client and update session
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Check for auth callback (OAuth or email confirmation)
  if (pathname === '/auth/callback') {
    return response;
  }

  // Redirect unauthenticated users to login
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

/**
 * Matcher configuration - which routes middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public file (public folder)
     * - api routes (they handle auth separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api.*).*)',
  ],
};
