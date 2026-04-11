# CafeToolbox Dashboard Architecture

## Overview

The Dashboard is a **Next.js 16** application serving as the private admin and user-facing interface for CafeToolbox. It's built with **TypeScript**, **React 19**, **Supabase** for authentication and data, and **Tailwind CSS** for styling.

### Tech Stack
- **Framework**: Next.js 16.2.3
- **Runtime**: Node.js
- **Language**: TypeScript 5.8
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS 4.1 + PostCSS 4
- **Database/Auth**: Supabase
- **UI Components**: Radix UI (Dialog, Dropdown Menu)
- **Icon Library**: Iconify
- **Port**: 3000 (dev), 3000 (production)

### Key Dependencies
- `@cafetoolbox/shared` - Shared utilities, types, constants
- `@cafetoolbox/supabase` - Supabase client configuration
- `@cafetoolbox/ui` - Shared UI components
- `clsx` - Conditional className utility
- `tailwind-merge` - Merge Tailwind CSS classes

---

## Directory Structure

```
apps/dashboard/
├── src/
│   ├── app/                      # Next.js App Router routes
│   │   ├── (auth)/               # Route group for auth pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── auth/                 # Auth-related routes
│   │   │   ├── callback/         # OAuth/email confirmation callback
│   │   │   └── reset-password/   # Password reset
│   │   ├── admin/                # Admin-only routes (superadmin only)
│   │   │   ├── layout.tsx        # Admin layout wrapper
│   │   │   ├── page.tsx          # Admin dashboard (stats)
│   │   │   ├── users/            # User management UI
│   │   │   ├── tools/            # Tool management UI
│   │   │   └── categories/       # Category management UI
│   │   ├── api/                  # API routes (backend-like)
│   │   │   ├── admin/            # Admin-only API endpoints
│   │   │   │   ├── users/        # User CRUD operations
│   │   │   │   ├── tools/        # Tool CRUD operations
│   │   │   │   ├── categories/   # Category CRUD operations
│   │   │   │   └── stats/        # Stats aggregation
│   │   │   ├── me/               # Current user endpoints
│   │   │   │   ├── route.ts      # Get/update profile
│   │   │   │   └── password/     # Change password
│   │   │   ├── create-user/      # Create new user (admin)
│   │   │   ├── delete-user/      # Delete user (admin)
│   │   │   └── _lib/
│   │   │       └── authz.ts      # Authorization utilities
│   │   ├── dashboard/            # User dashboard routes
│   │   ├── logout/               # Logout handler
│   │   ├── layout.tsx            # Root layout (fonts, metadata)
│   │   ├── page.tsx              # Home/landing page
│   │   └── globals.css           # Global styles
│   ├── components/               # React components
│   │   └── dashboard-nav.tsx     # Navigation component
│   ├── middleware-updated.ts     # Route protection middleware
│   ├── proxy.ts                  # Session update proxy
│   └── tsconfig.json
├── next.config.mjs               # Next.js configuration
├── package.json
└── tsconfig.json
```

---

## Route Structure & Access Control

### Authentication Flow
```
Public Routes (no auth required):
├── / (home/landing)
├── /login
├── /register
├── /forgot-password
├── /(auth)/login
├── /(auth)/register
├── /(auth)/forgot-password
├── /auth/callback (OAuth completion)
└── /auth/reset-password

Protected Routes (auth required):
├── /dashboard (general dashboard)
├── /dashboard/tools
├── /dashboard/settings
└── /logout

Admin-Only Routes (superadmin required):
├── /admin (dashboard with stats)
├── /admin/users (manage users)
├── /admin/tools (manage tools)
└── /admin/categories (manage categories)
```

### Middleware Configuration
- **File**: `middleware-updated.ts`
- **Pattern Matching**: Excludes `_next/static`, `_next/image`, `favicon.ico`, `api/*`
- **Public Routes**: Explicitly defined, no auth required
- **Protected Routes**: Require active session, redirect to `/login?redirectedFrom={pathname}`
- **Session Update**: All routes update Supabase session

---

## API Routes

### 1. **Admin Routes** (require superadmin role)

#### **Users Management**
```
GET    /api/admin/users
├─ List all users with profiles
├─ Returns: { profiles: [...] }
└─ Auth: Superadmin only

POST   /api/create-user
├─ Create new user
├─ Body: { email, password, display_name?, role? }
├─ Returns: { success: true, user: {...} }
└─ Auth: Superadmin only

PATCH  /api/admin/users/[userId]
├─ Update user profile and/or auth metadata
├─ Body: { display_name?, avatar_url?, role?, password? }
├─ Returns: { profile: {...} }
├─ Prevents: Self-deletion, password validation
└─ Auth: Superadmin only

POST   /api/delete-user
├─ Delete a user
├─ Body: { userId }
├─ Returns: { success: true, message: "..." }
├─ Prevents: Self-deletion
└─ Auth: Superadmin only
```

#### **Tools Management**
```
GET    /api/admin/tools
├─ List all tools and categories
├─ Returns: { tools: [...], categories: [...] }
└─ Auth: Superadmin only

POST   /api/admin/tools
├─ Create a new tool
├─ Body: { name, slug, description?, status?, size?, path?, icon?, stack?, category_id? }
├─ Returns: { tool: {...} }
└─ Auth: Superadmin only

PATCH  /api/admin/tools/[toolId]
├─ Update tool properties
├─ Body: { name?, slug?, description?, status?, size?, path?, icon?, stack?, category_id? }
├─ Returns: { tool: {...} }
├─ Stack: Parses string→array conversion
└─ Auth: Superadmin only
```

#### **Categories Management**
```
GET    /api/admin/categories
├─ List all categories with tool counts
├─ Returns: { categories: [...], tools: [...] }
└─ Auth: Superadmin only

POST   /api/admin/categories
├─ Create a new category
├─ Body: { slug, name, description?, icon?, sort_order? }
├─ Returns: { category: {...} }
└─ Auth: Superadmin only

PATCH  /api/admin/categories/[categoryId]
├─ Update category
├─ Body: { slug?, name?, description?, icon?, sort_order? }
├─ Returns: { category: {...} }
└─ Auth: Superadmin only

DELETE /api/admin/categories/[categoryId]
├─ Delete category if no tools belong to it
├─ Validation: Counts tools first, fails if count > 0
├─ Returns: { success: true }
└─ Auth: Superadmin only
```

#### **Statistics**
```
GET    /api/admin/stats
├─ Aggregated counts for dashboard
├─ Returns: { categories: number, tools: number, users: number }
├─ Optimization: Uses `count: 'exact', head: true` pattern
└─ Auth: Superadmin only
```

### 2. **User Profile Routes** (authenticated users)

```
GET    /api/me
├─ Get current user profile
├─ Returns: { profile: {...}, rawRole: "..." }
└─ Auth: Required

PUT    /api/me
├─ Update current user profile
├─ Body: { display_name?, avatar_url? }
├─ Returns: { profile: {...} }
└─ Auth: Required

PUT    /api/me/password
├─ Change own password
├─ Body: { password, confirmPassword }
├─ Returns: { success: true }
├─ Validation: Min 6 chars, passwords must match
└─ Auth: Required
```

---

## Authorization & Security Patterns

### Authorization Library
**File**: `src/app/api/_lib/authz.ts`

```typescript
export async function assertSuperadminUser()
  ├─ Retrieves current authenticated user from Supabase
  ├─ Returns { error: NextResponse } if not authenticated (401)
  ├─ Normalizes role: 'superadmin'|'admin' → 'superadmin', else 'user'
  ├─ Returns { error: NextResponse } if role ≠ 'superadmin' (403)
  └─ Returns { user: AuthUser } on success

export function normalizeRole(role: string | null | undefined)
  ├─ Normalizes role strings to standard format
  ├─ 'superadmin'|'admin'|'Admin'|'SuperAdmin' → 'superadmin'
  └─ Default (null|undefined|other) → 'user'
```

### Role Metadata Storage
- **Storage Locations**:
  - `auth.users.app_metadata.role` (primary)
  - `auth.users.user_metadata.role` (fallback)
  - `profiles.role` (database redundancy)
  
- **Fallback Chain**: `app_metadata.role` → `user_metadata.role` → null → 'user'

### Admin Layout Protection
**File**: `src/app/admin/layout.tsx`
```typescript
// Server-side role check
async function checkSuperAdmin()
  ├─ Gets current user from Supabase
  ├─ Checks: app_metadata.role | user_metadata.role
  ├─ Returns true only if role is 'superadmin' or 'admin'
  └─ Redirects to /dashboard if not authorized (server-side!)
```

---

## Admin Dashboard Features

### Admin Home (`/admin`)
- **Stats Panel**: Cards showing counts of:
  - Categories (with folder icon)
  - Tools (with wrench icon)
  - Users (with users icon)
- **Quick Links**: Direct navigation to management pages
- **Data Source**: Fetches `/api/admin/stats` on page load

### Users Management (`/admin/users`)
- **Features**:
  - List all users with email, display_name, avatar_url, role, created_at
  - Create new users (email + password)
  - Edit user profile (display_name, avatar_url, role, password)
  - Delete users (with self-deletion prevention)
  - Modal forms for create/edit workflows
- **UI State**: Loading, saving, error, success states
- **Delete Confirmation**: Modal confirmation before deletion

### Tools Management (`/admin/tools`)
- **Features**:
  - CRUD for tools
  - Fields: name, slug, description, status, size, path, icon, stack, category_id
  - Status options: active, beta, archived, maintenance
  - Size options: small, medium, large
  - Category assignment dropdown
  - Stack: comma-separated or array handling
- **UI State**: Edit modal, form validation

### Categories Management (`/admin/categories`)
- **Features**:
  - CRUD for categories
  - Fields: slug, name, description, icon, sort_order
  - Tool count display
  - Prevents deletion if tools exist
  - Drag-to-reorder support (sort_order)
- **Validation**: Icon picker, slug/name validation

---

## Middleware & Session Management

### Route Protection Middleware
**File**: `middleware-updated.ts`

**Public Routes** (no middleware):
- `/`, `/login`, `/register`, `/forgot-password`, `/auth/callback`, `/auth/reset-password`

**Protected Routes** (session required):
- `/dashboard/*`, `/admin/*`
- Redirects to `/login?redirectedFrom={original_path}` if no session

**Session Update**:
- All routes call `supabase.auth.getSession()` to refresh session
- Supabase SDK handles session cookie management automatically

### Proxy Pattern
**File**: `proxy.ts`
- Calls `updateSession()` from @cafetoolbox/supabase
- Handles environment variables for Supabase configuration
- Maintains session cookies across requests

---

## Component Architecture

### Root Layout (`layout.tsx`)
```typescript
- Defines global metadata: "CafeToolbox - Dashboard"
- Loads fonts: Inter (sans), JetBrains Mono (mono)
- Includes Iconify script for icon rendering
- Sets viewport for responsive design
```

### Home Page (`page.tsx`)
- Landing page with:
  - Navigation bar (logo, login link)
  - Hero section with feature text
  - Responsive grid layout (lg:grid-cols-2)
  - Color scheme: cream, charcoal, neon

### Admin Layout (`admin/layout.tsx`)
- Server-side auth check
- Navigation component with admin sections
- Icon components (Terminal, Arrow, Dashboard, Folder, Wrench, Users)
- Consistent admin UI styling

### Components Directory
Currently minimal:
- `dashboard-nav.tsx` - Main navigation component

---

## Data Models & Database Integration

### Key Tables Used
- `auth.users` - Supabase auth table
- `profiles` - Extended user profile data
- `tools` - Tool/application records
- `categories` - Tool categories
- Related through: `tool.category_id` → `categories.id`

### Data Patterns

**User Profile**:
```typescript
{
  id: string,
  email: string,
  display_name: string | null,
  avatar_url: string | null,
  role: 'user' | 'superadmin',
  created_at: string
}
```

**Tool**:
```typescript
{
  id: string,
  name: string,
  slug: string,
  description: string,
  status: 'active' | 'beta' | 'archived' | 'maintenance',
  size: 'small' | 'medium' | 'large',
  path: string,
  icon: string,
  stack: string[] | string,
  category_id: string | null
}
```

**Category**:
```typescript
{
  id: string,
  slug: string,
  name: string,
  description: string,
  icon: string,
  sort_order: number,
  created_at: string
}
```

---

## Error Handling & Response Patterns

### Standard API Response Format
```typescript
// Success
{ success: true, data: ... } (200)
{ profile: ... } (200)
{ categories: [...], tools: [...] } (200)
{ message: "...", ... } (200)

// Error
{ error: "..." } (400|401|403|500)
{ error: "...", message: "..." } (500)

// Status Codes
- 200: Success
- 400: Validation error (bad input)
- 401: Unauthorized (not logged in)
- 403: Forbidden (insufficient role)
- 500: Server error
```

### Error Messages (Vietnamese)
- "Chưa đăng nhập" - Not logged in (401)
- "Bạn không có quyền truy cập" - Permission denied (403)
- "Không thể tải..." - Cannot load (500)
- "Vui lòng cung cấp..." - Please provide (400)
- "Email này đã được sử dụng" - Email already exists (400)
- "Bạn không thể xóa chính mình" - Cannot delete self (400)

---

## Configuration Files

### Next.js Config (`next.config.mjs`)
```javascript
{
  reactStrictMode: false,  // Disabled for Next.js 16 DevTools
  async redirects() {
    return [
      /tools → /dashboard/tools,
      /settings → /dashboard/settings
    ]
  }
}
```

### TypeScript Config (`tsconfig.json`)
```json
{
  "extends": "../../packages/tsconfig/nextjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "preserve"
  }
}
```

### Environment Variables (`.env.local`)
Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `AUTH_COOKIE_DOMAIN` (optional, defaults to "localhost")

---

## Build & Development Scripts

```bash
pnpm install          # Install dependencies
pnpm dev             # Start dev server (http://localhost:3000)
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint
pnpm format          # Format with Prettier
pnpm type-check      # TypeScript type checking
pnpm clean           # Clean build artifacts
```

---

## Current Implementation Status

### ✅ Implemented
- Authentication flow (login, register, password reset)
- User management admin panel
- Tools management with CRUD
- Categories management with CRUD
- Admin dashboard with stats
- Role-based access control (superadmin)
- Middleware-based route protection
- Session management via Supabase
- User profile endpoints

### 🔄 In Progress / Notes
- Health check patterns: Currently using `/api/admin/stats` as a health indicator
- No dedicated `/health` or `/status` endpoint exists
- Stats endpoint validates auth and counts database records (implicit health check)

### ❌ Not Implemented
- Dedicated monitoring/health check endpoint
- Request logging/tracing
- Rate limiting
- Audit logging for admin operations
- Two-factor authentication
- API key management for service-to-service auth
- Cache headers/optimization

---

## Key Design Patterns

1. **Authorization Pattern**:
   - Check auth state first
   - Normalize role with fallback chain
   - Return error responses early (fail-fast)

2. **API Pattern**:
   - GET: Retrieve and list
   - POST: Create new records
   - PATCH: Update existing
   - DELETE: Remove records
   - Error-first response style

3. **Server vs. Client**:
   - Route protection: Middleware (server)
   - Admin layout check: Server component
   - Forms/UI state: Client components ('use client')
   - API routes: Both (implicit server)

4. **Database Pattern**:
   - Promise.all() for parallel queries
   - Select-only queries for counts (optimization)
   - Error checking per query
   - Normalized response format

---

## Integration Points

### External Services
- **Supabase Auth**: User authentication, session management
- **Supabase Database**: PostgreSQL tables (users, profiles, tools, categories)
- **Supabase Admin API**: User management (create, update, delete)

### Internal Packages
- `@cafetoolbox/supabase`: Client initialization, auth functions
- `@cafetoolbox/shared`: Types, constants, utilities
- `@cafetoolbox/ui`: Shared components (BrandMark)
- `@cafetoolbox/eslint-config`: Linting rules
- `@cafetoolbox/tsconfig`: TypeScript configuration

---

## Security Considerations

1. **Authentication**:
   - Supabase-managed JWT tokens
   - Session cookies (automatic)
   - Email verification on account creation

2. **Authorization**:
   - Server-side role checks (can't be bypassed by client)
   - Admin layout forces redirect before rendering
   - API routes check role before data access

3. **Data Protection**:
   - No sensitive data in client-side code
   - API routes use admin client only for elevated operations
   - Role normalization prevents bypasses

4. **Input Validation**:
   - Email format checks (Supabase handles)
   - Password length minimum (6 chars)
   - Required field validation
   - Stack parsing with filter/trim

---

## Performance Optimizations

1. **Parallel Queries**:
   ```typescript
   await Promise.all([
     supabaseAdmin.from('categories').select(...),
     supabaseAdmin.from('tools').select(...)
   ])
   ```

2. **Efficient Counting**:
   ```typescript
   select('id', { count: 'exact', head: true })
   // Only counts, doesn't fetch data
   ```

3. **Caching**:
   - Admin page: `cache: 'no-store'` for real-time stats
   - Server components reuse Supabase client

4. **Lazy Loading**:
   - Client components load data on mount
   - Forms only fetch/update target records

---

Generated: April 11, 2026
