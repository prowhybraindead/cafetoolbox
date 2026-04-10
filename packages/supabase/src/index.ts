/**
 * @cafetoolbox/supabase - Supabase client package
 *
 * Provides Supabase clients for all contexts:
 * - `@cafetoolbox/supabase/client` → Browser (Client Components)
 * - `@cafetoolbox/supabase/server` → Server (Server Components, Actions, Route Handlers)
 * - `@cafetoolbox/supabase/middleware` → Next.js Middleware
 *
 * All clients are configured with cookie domain `.cafetoolbox.app`
 * for cross-subdomain authentication.
 */

export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient, createAdminClient } from "./server";
export { updateSession } from "./middleware";
