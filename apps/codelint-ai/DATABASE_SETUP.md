# Database Setup Guide

## Supabase Configuration Required

The application requires Supabase tables to be set up before full functionality is available.

### Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. Get your project URL and anon key from Project Settings > API

### Environment Variables

Add the following to your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_ENABLE_CHAT_SYNC=true
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### Create Tables

You have two options:

#### Option 1: Using Supabase Dashboard (Recommended for beginners)

1. Go to Supabase Dashboard > SQL Editor
2. Create a new query
3. Copy the SQL from `supabase/migrations/20250415_create_chat_sessions.sql`
4. Run the query

#### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link your Supabase project
supabase link --project-ref your_project_ref

# Run migrations (make sure you have migrated the table first via dashboard)
supabase db push
```

### Tables Created

#### `chat_sessions`
Stores chat conversation history:
- `id` (text): Unique session identifier
- `title` (text): Session title
- `timestamp` (bigint): Creation timestamp
- `messages` (jsonb): Array of chat messages
- `created_at`, `updated_at`: Timestamps

#### `codelint_usage_actions` (optional)
Tracks user actions for analytics:
- `id` (bigserial): Auto-increment ID
- `action_name` (text): Type of action
- `action_source` (text): Where action originated
- `session_id` (text): Associated session ID
- `metadata` (jsonb): Additional data
- `created_at`: Timestamp

### Troubleshooting

If you see the error:
```
Could not find the table 'public.chat_sessions' in the schema cache
```

This means the table hasn't been created yet. Follow the "Create Tables" steps above.

If you prefer to use the app without Supabase:
- Chat history will be stored locally in browser/state
- No sync across devices
- App will show warnings in console about skipped Supabase operations

If you want to keep the app quiet and avoid any Supabase requests, leave `NEXT_PUBLIC_ENABLE_CHAT_SYNC` unset or set it to `false`.

This is fine for development/testing!
