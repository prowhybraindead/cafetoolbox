# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.7-beta] - 2026-04-10

### Fixed

- **Status page live data**: Replaced the static status landing page with a public Supabase-backed view that shows per-service uptime, overall health, and recent incidents without login.
- **Uptime visibility**: Added service-level uptime bars and incident update timelines so the page reflects how each part is doing instead of a single generic banner.

### Validation

- `apps/status` type-checks cleanly after the live-data refactor.

## [0.2.6-beta] - 2026-04-10

### Fixed

- **Next.js deprecation warning**: Migrated dashboard request interception from `src/middleware.ts` to `src/proxy.ts` to follow Next.js 16 conventions and remove startup warning noise.

### Validation

- Dev startup no longer shows the middleware-to-proxy deprecation warning for dashboard app.

## [0.2.5-beta] - 2026-04-10

### Fixed

- **Phase 1 data quality**: Removed hardcoded dashboard values (`Good`, `99.9%`) and now derive status + average uptime from `services` table data.
- **Registration policy enforcement**: Replaced `/register` form with a disabled informational page to match the superadmin-only account creation policy.
- **Shared package drift**:
  - Updated `UserRole` types to `superadmin|user`.
  - Updated `ToolSize` types to include `medium`.
  - Updated shared route constants to canonical `/dashboard/*` paths and `forgot-password` route.
- **Type-check stability**: Fixed `@cafetoolbox/shared` utility globals usage so TypeScript no longer errors on `setTimeout`/`window` in non-DOM contexts.
- **Compile-time hygiene**:
  - Added missing UI deps (`@radix-ui/react-slot`, `class-variance-authority`) used by existing button source.
  - Updated Next.js tsconfig baseline to include DOM + Node typings.
  - Fixed async Supabase client usage in API routes/middleware-updated (`await createClient()` / `await createServerClient()` / `await createAdminClient()`).
  - Fixed duplicate export in `packages/supabase/src/index-new.ts`.

### Changed

- Cleaned up dashboard/tool page strings that still used temporary wording.

### Validation

- `npm run type-check` passes for all workspace packages.

## [0.2.4-beta] - 2026-04-10

### Fixed

- **Legacy route note cleanup**: Updated the stale middleware comment so it reflects the canonical `/dashboard/*` routes and the legacy redirect support.

### Validation

- Confirmed no remaining UI links point to `/tools` or `/settings`.

## [0.2.3-beta] - 2026-04-10

### Fixed

- **Dashboard link routing**: Updated dashboard home and navigation links to use `/dashboard/tools` and `/dashboard/settings` instead of broken `/tools` and `/settings` paths.
- **Backward compatibility**: Added redirects from `/tools` and `/settings` to the canonical dashboard routes so older links no longer 404.

### Validation

- Verified `/dashboard` continues to load successfully and `/tools` now resolves through redirect support.

## [0.2.2-beta] - 2026-04-10

### Fixed

- **Auth loop on localhost**: Updated Supabase cookie handling so local development does not force `domain=localhost`, preventing login-redirect loops.
- **Dashboard build error**: Removed invalid duplicated JSX block in `apps/dashboard/src/app/dashboard/page.tsx` that caused parser failure.
- **Wrong Supabase imports in client context**:
  - Login/logout pages now import from `@cafetoolbox/supabase/auth`.
  - Client navigation/profile usage imports from `@cafetoolbox/supabase/client`.
  - Added `./auth` export in `packages/supabase/package.json`.
- **Dashboard route wiring**:
  - Fixed quick links from `/tools` and `/settings` to `/dashboard/tools` and `/dashboard/settings`.
  - Fixed `ToolsPage` server client usage (`await createServerClient()`).
  - Replaced invalid logout server action in tools page with `/logout` navigation.
- **Missing route pages**: Added working pages:
  - `apps/dashboard/src/app/dashboard/settings/page.tsx`
  - `apps/dashboard/src/app/dashboard/users/page.tsx`
- **Registration policy consistency**:
  - Removed remaining "Đăng ký" CTAs from landing and login footer.
  - Kept `/register` as disabled informational page.
- **Icon rendering issue**: Added Iconify runtime script in dashboard layout so icon placeholders render correctly.

### Added

- **Transfer/Handoff docs**:
  - Added root `README.md` with setup and resume instructions for moving project to another PC.
  - Added home-transfer checkpoint section in `AI.md`.

### Validation

- Verified runtime responses from dev logs:
  - `GET /dashboard 200`
  - `GET /dashboard/tools 200`
  - `GET /dashboard/settings 200`
  - `GET /dashboard/users 200`

## [0.2.1-beta] - 2026-04-10

### Fixed

#### Database Schema Updates
- **Role System Change**: Updated from `admin|member|viewer` to `superadmin|user` only
- **Migration 0004**: `packages/supabase/migrations/0004_fix_profile_schema.sql`
  - Changed `profiles.role` constraint to only allow `'superadmin'` or `'user'`
  - Added `last_activity TIMESTAMPTZ` column for idle timeout tracking
  - Added index on `last_activity DESC` for performance
- **Migration 0005**: `packages/supabase/migrations/0005_update_rls_for_superadmin.sql`
  - Replaced all `is_admin()` function calls with `is_superadmin()` in RLS policies
  - Updated all tables (profiles, tools, services, incidents, incident_updates) to check for `role = 'superadmin'` instead of `role = 'admin'`
  - Added `get_current_user_role()` helper function
- **Migration 0006**: `packages/supabase/migrations/0006_update_trigger_default_role.sql`
  - Updated `handle_new_user()` trigger to default new users to `role = 'user'` instead of `'viewer'`

#### Idle Timeout Implementation
- **Idle Timeout Module**: New `packages/supabase/src/idle-timeout.ts`
  - `startIdleTimer(callbacks, customTimeoutMs?, customWarningMs?)` - Start tracking user activity
  - `stopIdleTimer()` - Stop tracking and clean up event listeners
  - `resetIdleTimer()` - Manually reset timers
  - `isUserIdle(customTimeoutMs?)` - Check if user is currently idle
  - `updateLastActivity(userId)` - Update database `last_activity` timestamp
  - `shouldLogoutUser(userId)` - Check if user should be logged out (30 min timeout)
  - Default timeout: 30 minutes with warning at 25 minutes
  - Tracks: mousemove, mousedown, keypress, scroll, touchstart
  - Type-safe callbacks with `IdleTimerCallbacks` interface
- **Config**: Added exports in `packages/supabase/src/index.ts` and `index-new.ts`

#### Registration Policy
- **Disabled Public Registration**: Updated `apps/dashboard/src/app/(auth)/register/page.tsx`
  - Replaced signup form with info card showing "Đăng ký đã bị tắt"
  - Message: "Hiện tại không cho phép tự đăng ký. Chỉ Superadmin mới có quyền tạo tài khoản mới."
  - Added "Đăng nhập" and "Quay lại trang chủ" buttons
  - Removed all signup state management (useState, handleSubmit, etc.)
  - Clean, informative UI for users who try to access /register

#### Superadmin User Management
- **Users Page**: New `apps/dashboard/src/app/dashboard/users/page.tsx`
  - Superadmin-only access with role check (non-superadmins redirected to dashboard with access denied message)
  - Full user list with profiles (email, display name, role, auth status)
  - Search functionality (by email or display name)
  - Create new user button with form modal
  - Role change dropdown (superadmin/user) with prevention of self-degrading
  - Delete user button with confirmation dialog
  - Prevent deletion of own account
  - Real-time auth user status check via `supabase.auth.admin.getUserById()`
  - Vietnamese UI throughout
  - Server-side role validation via middleware
- **Create User API**: New `apps/dashboard/src/app/api/create-user/route.ts`
  - POST endpoint for creating new users
  - Superadmin-only access check (verifies current user role in database)
  - Validates email uniqueness via admin API
  - Creates user via `supabase.auth.admin.createUser()` with service role key
  - Sets default `role = 'user'` in profiles table
  - Vietnamese error messages
  - Prevents creating duplicate emails
- **Delete User API**: New `apps/dashboard/src/app/api/delete-user/route.ts`
  - POST endpoint for deleting users
  - Superadmin-only access check
  - Prevents self-deletion
  - Deletes user via `supabase.auth.admin.deleteUser()` with service role key
  - Profile deletion cascades automatically due to foreign key
  - Vietnamese error messages

#### Middleware & Navigation Updates
- **Middleware Role Protection**: Updated `apps/dashboard/src/middleware.ts`
  - Added `/dashboard/users` to protected routes (superadmin-only)
  - Before accessing `/dashboard/users`, checks `profiles.role = 'superadmin'`
  - Non-superadmins redirected to `/dashboard`
  - Maintains existing auth checks for all other routes
- **Dashboard Navigation**: Updated `apps/dashboard/src/components/dashboard-nav.tsx`
  - Changed "Users" link from `href="/users"` to `href="/dashboard/users"`
  - Updated role check from `role === 'admin'` to `role === 'superadmin'`
  - "Users" link only visible to superadmin users

#### Admin Client for User Management
- **Admin Client**: New `createAdminClient()` in `packages/supabase/src/server.ts`
  - Uses `SUPABASE_SERVICE_ROLE_KEY` instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Bypasses Row Level Security (RLS) for administrative operations
  - Same cookie domain configuration (`AUTH_COOKIE_DOMAIN`)
  - Exported in `packages/supabase/src/index.ts`
  - Used in `/api/create-user` and `/api/delete-user` endpoints
- **Warning**: Documented that `createAdminClient()` should ONLY be used in server-side code where admin privileges are needed

#### Documentation Updates
- **README Updates**: `packages/supabase/README.md`
  - Updated migration list to include 0004, 0005, 0006
  - Changed "Creating Your First Admin User" to "Creating Your First Superadmin User"
  - Updated default role from `'viewer'` to `'user'` in test section
  - Added note about `last_activity = NOW()` in test section
  - Updated RLS policies section: "Superadmin" instead of "Admin"
  - Added notes about user creation via `/dashboard/users`, disabled public registration
  - Updated "Creating Your First Superadmin User" section with current role names

### Changed

- **Role System Complete Overhaul**: From 3 roles (admin/member/viewer) to 2 roles (superadmin/user)
- **Superadmin Privileges**: Only superadmin can now access `/dashboard/users`, create users, delete users, manage roles
- **New Users**: Default to `role = 'user'` instead of `'viewer'`
- **Public Registration**: Completely disabled - only superadmin can create new users
- **Database Auth State**: All profiles now track `last_activity` timestamp for idle timeout

### Removed

- **Register Page Form**: Removed all signup form logic from `/register` page (now shows disabled message)
- **Old Role Checks**: All references to `is_admin()` function in RLS policies replaced with `is_superadmin()`
- **Member/Viewer Roles**: Removed from role system

---

## [0.2.0-beta] - 2026-04-10

### Added

#### Authentication System
- **Auth Helpers**: Complete auth utilities in `packages/supabase/src/auth.ts`
  - `signup(email, password, displayName?)`: Register new users with email/password
  - `login(email, password)`: Authenticate users with credentials
  - `logout()`: Sign out current user
  - `forgotPassword(email)`: Send password reset email
  - `updatePassword(newPassword)`: Update authenticated user's password
  - `getCurrentUser()`: Get current authenticated user
  - `getCurrentSession()`: Get current session
  - `onAuthStateChange(callback)`: Subscribe to auth state changes
- **TypeScript Types**: Full type definitions (`SignupResult`, `LoginResult`, `LogoutResult`, `ForgotPasswordResult`, `AuthErrorType`)
- **Error Handling**: Comprehensive error messages in Vietnamese for `email_not_confirmed`, `invalid_credentials`, `email_exists`

#### Auth Pages
- **Login Page**: `apps/dashboard/src/app/(auth)/login/page.tsx`
  - Email/password form with validation
  - Error display (red alert boxes)
  - Success state with auto-redirect to dashboard
  - Links to register and forgot-password
  - Vietnamese UI throughout
- **Register Page**: `apps/dashboard/src/app/(auth)/register/page.tsx`
  - Full signup form (email, password, confirm password, display name)
  - Client-side validation (password match, minimum length)
  - Success message with auto-redirect to login
  - Back to home link
- **Logout Page**: `apps/dashboard/src/app/logout/page.tsx`
  - Auto-logout and redirect functionality

#### Dashboard Core Pages
- **Public Landing Page**: Updated `apps/dashboard/src/app/page.tsx`
  - Modern hero section with Vietnamese content
  - Responsive navigation with Đăng nhập/Đăng ký buttons
  - Tool cards preview (Color Picker, JSON Formatter, Markdown Preview, Regex Tester)
  - Features showcase (3 cards: Bộ công cụ đa năng, Status Page, Bảo mật & RLS)
  - Footer with links
  - DESIGN.md compliant colors (cream, charcoal, neon)
- **Dashboard Home**: Updated `apps/dashboard/src/app/dashboard/page.tsx`
  - Metric cards (Tools, Services, Status, Uptime)
  - Fetch real counts from database
  - Quick action links to Tools and Settings pages
  - Simplified navigation
- **Tools Page**: `apps/dashboard/src/app/dashboard/tools/page.tsx`
  - Server-side fetch tools from database
  - Responsive grid layout
  - Status badges with Vietnamese labels (Hoạt động, Beta, Lưu trữ, Bảo trì)
  - Size indicators (Nhỏ, Trung bình, Lớn)
  - Links to individual tool paths
  - Empty state handling
- **Settings Page**: `apps/dashboard/src/app/dashboard/settings/page.tsx`
  - Profile management (read-only email, display name, avatar URL)
  - Real-time profile updates
  - Success/error messages
  - Danger zone with logout button
- **Users Page (Admin Only)**: `apps/dashboard/src/app/dashboard/users/page.tsx`
  - Admin-only access (redirects non-admins to dashboard)
  - User list with profiles
  - Search by email or display name
  - Filter by role (all, viewer, member, admin)
  - Role update functionality (select dropdown)
  - Prevent admin de-grading themselves
  - Vietnamese table headers and labels

#### Middleware Route Protection
- **Updated Middleware**: `apps/dashboard/src/middleware.ts`
  - Protect all dashboard routes (/dashboard, /tools, /users, /settings)
  - Redirect unauthenticated users to /login with redirect query param
  - Public routes: /, /login, /register, /forgot-password, /auth/callback
  - Session refresh for all routes
  - Integration with Supabase auth

#### Shared Constants Updates
- **Vietnamese Labels**: `packages/shared/src constants.ts`
  - `TOOL_STATUS_LABELS_VI`: Hoạt động, Beta, Lưu trữ, Bảo trì
  - `SERVICE_STATUS_LABELS_VI`: Hoạt động, Giảm hiệu suất, Sự cố cục bộ, Sự cố lớn
  - `TOOL_SIZE_LABELS_VI`: Nhỏ, Trung bình, Lớn
- **Route Updates**:
  - Added `USERS: "/users"`
  - Added `LOGOUT: "/logout"`

#### Config Updates
- **Layout Language**: Changed `apps/dashboard/src/app/layout.tsx` from `lang="en"` to `lang="vi"`

### Changed

- **Supabase Package Exports**: Updated `packages/supabase/src/index.ts` to export all auth functions and types
- **Dashboard Navigation**: Simplified nav across all dashboard pages for consistency
- **Error Handling**: All auth errors now display in Vietnamese with clear user guidance
- **User Experience**: Loading states, success messages, error alerts throughout auth flow

### Deprecated

- **legacy auth state**: Old page designs replaced with new Vietnamese UI
- **hero icon imports**: Replaced with iconify `data-icon` approach

### Notes

- **Admin User Creation**: After running migrations, create admin user via Supabase Dashboard:
  1. Signup a user in the app
  2. Copy user UUID from Supabase Dashboard > Authentication > Users
  3. Run: `UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';`
- **Idle Timeout**: Pending implementation (30-minute inactivity detection)
- **Phase 2**: Next phase will implement individual tool pages (Color Picker, JSON Formatter, etc.)

---

## [0.1.0-beta] - 2026-04-10

### Added

#### Database Schema & Migrations
- **Migration Scripts**: Created 3 SQL migration files in `packages/supabase/migrations/`
  - `0001_initial_schema.sql`: 5 tables (profiles, tools, services, incidents, incident_updates)
  - `0002_rls_policies.sql`: Row Level Security with public/admin/authenticated roles
  - `0003_seed_data.sql`: 8 tools, 4 services, 1 incident for development
- **Auto-create Profile Trigger**: Automatically creates profile row when user signs up
- **Helper Functions**: `is_admin()` and `get_current_user_role()` for role checking
- **Indexes**: Performance indexes on frequently queried fields (slug, status, role, etc.)
- **Timestamp Triggers**: Auto-update `updated_at` on all tables

#### Documentation
- **Migration Guide**: Full guide in `packages/supabase/README.md`
  - Step-by-step migration execution via Supabase Dashboard
  - RLS policy reference
  - Admin user creation instructions
  - Troubleshooting section
- **Test Script**: `test-supabase.js` for env variable verification

### Changed

- Updated Phase 1 progress in AI.md (Step 1 & 2 completed)
- Env variables configured and verified (NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, AUTH_COOKIE_DOMAIN)
- Folder cleanup: `tooling/` added to `.gitignore`

### Notes

- **Action Required**: Run SQL migrations in Supabase Dashboard
  1. Go to Database > SQL Editor
  2. Run `0001_initial_schema.sql`
  3. Run `0002_rls_policies.sql`
  4. Run `0003_seed_data.sql`
  5. Verify tables created in Table Editor

- **Next Step**: Implement Authentication Flow (login, register, pages, middleware)


## [0.0.2-alpha] - 2026-04-10

### Changed

- **Monorepo Refactoring**: Completed migration from `tooling/*` to `packages/*`
  - Updated `pnpm-workspace.yaml` to only include `apps/*` and `packages/*`
  - Moved all config packages to `packages/*`: eslint-config, prettier-config, tailwind-config
  - Both apps already reference `@cafetoolbox/*-config` packages (no code changes needed)
  - The old `tooling/` folder remains but is no longer part of workspace (user to delete manually)

- **packages/ui cleanup**: Removed component exports from package.json (lib/* only)
  - `button.tsx` and `button.css` remain in components folder but not exported
  - Package exports now baseline-only: main entry, globals.css, postcss.config, lib/*
  - Components will be added in Phase 1 when needed

### Fixed

- Verified Supabase auth configuration uses AUTH_COOKIE_DOMAIN env variable
- Default cookie domain set to localhost for development, .cafetoolbox.app for production
- Both browser and server clients properly configured for cross-subdomain auth

### Removed

- No actual content removal - `tooling/*` folder still exists locally (user action needed)

### Notes

- apps/status remains in Phase 0 scope as status page will be implemented in Phase 3
- Phase 0 foundation now properly structured; ready to move to Phase 1

## [0.0.1-alpha] - 2026-04-10

### Added

- Temporary checkpoint entry for paused PC session during Phase 0 refinement.

### Changed

- Partial restructuring started: created `packages/eslint-config`, `packages/prettier-config`, `packages/tailwind-config` while legacy `tooling/*` still exists.
- Partial cleanup started in `packages/ui` to keep baseline setup only.

### Fixed

- Progress snapshot captured in internal `AI.md` for resume continuity.

## [0.1.0] - 2026-04-10

### Added

#### Monorepo Foundation
- **Turborepo + pnpm**: Khởi tạo monorepo với Turborepo v2.5.0 và pnpm v10.8.0
- **Workspace Configuration**: package.json root, turbo.json, pnpm-workspace.yaml
- **Scripts**: dev, build, lint, format, clean, type-check (Turborepo-powered)

#### Core Tools & Configs
- **packages/tsconfig**: Base, Next.js, React Library TypeScript configs (strict mode)
- **tooling/eslint**: Shared ESLint configs (base + Next.js) with TypeScript, React, React Hooks rules
- **tooling/prettier**: Shared Prettier config with tailwindcss plugin
- **tooling/tailwind**: Tailwind CSS v4 configuration with DESIGN.md color tokens (cream, charcoal, neon, etc.)
- **.gitignore**: Proper exclusions for secrets (.env), monorepo artifacts (.next, .turbo, dist), and AI.md (internal only)
- **.env.example**: Template for Supabase URLs, keys, and cookie domain config

#### Shared Packages
- **@cafetoolbox/shared**:
  - Types: UserProfile, UserRole, Tool, Service, Incident, Route, DashboardStats, NavItem
  - Constants: APP_URL, ROUTES, TOOL_STATUS_LABELS, SERVICE_STATUS_LABELS, STATUS_COLORS
  - Utils: cn (className merge), formatDate, formatRelativeTime, sleep, truncate, slugify

- **@cafetoolbox/supabase**:
  - client.ts: Browser Supabase client for Client Components (cookie-based session)
  - server.ts: Server Supabase client for Server Components, Actions, Route Handlers
  - middleware.ts: updateSession utility for auth refresh and cookie management
- **Cookie Domain**: Configured as `.cafetoolbox.app` for cross-subdomain authentication

- **@cafetoolbox/ui**: Shared UI components library (shadcn/ui pattern)
  - lib/cn.ts: className merged using clsx + tailwind-merge
  - components/button.tsx + button.css: Primary (neon slide animation), Secondary, Solid, Ghost, Outline
  - globals.css: Import from tooling/tailwind
  - Tailwind v4 @theme with all DESIGN.md colors

#### Next.js 16 Applications

**apps/dashboard** (port 3000)
- **Next.js 16 + Turbopack**: Modern app with App Router and Turbopack enabled
- **Middleware**: Auth middleware using @cafetoolbox/supabase updateSession
- **Layout**: Root layout with Inter (sans) and JetBrains Mono (mono) fonts
- **Pages**:
  - / (landing): Hero section, CTA buttons (neon + dark), GitHub link
  - /dashboard: Dashboard home with API client, metric cards (4 metrics grid), tools section

**apps/status** (port 3001)
- **Next.js 16 + Turbopack**: Status page application
- **Layout**: Root layout with matching fonts
- **Pages**:
  - / (status page): All Systems Operational banner, uptime grid (90 days), incidents section, footer

#### Custom CSS & Animations
- **tooling/tailwind/custom.css**:
  - neon-btn::before slide animation (0 → scaleX 1 on hover)
  - metric-card hover (border + shadow neon glow)
  - stack-tag hover (bg to neon)
  - fade-in (opacity + translateY with cubic-bezier easing)
  - pulse-neon (2s infinite animation)
  - changelog-entry (border-left + bg neon ghost on hover)

### Changed
- Nothing yet

### Fixed
- TypeScript strict mode enabled across all configs (no type errors)
- Proper workspace exports for all packages
