-- Create chat_sessions table
create table public.chat_sessions (
  id text primary key,
  title text not null,
  timestamp bigint not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.chat_sessions enable row level security;

-- Create RLS policy to allow public access (modify as needed for your auth)
create policy "Allow public access to chat_sessions"
  on public.chat_sessions
  for all
  using (true)
  with check (true);

-- Create indexes for better performance
create index idx_chat_sessions_timestamp on public.chat_sessions(timestamp desc);
create index idx_chat_sessions_created_at on public.chat_sessions(created_at desc);

-- Create usage_actions table if it doesn't exist (from hint)
create table if not exists public.codelint_usage_actions (
  id bigserial primary key,
  action_name text not null,
  action_source text not null,
  session_id text,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.codelint_usage_actions enable row level security;

create policy "Allow public access to usage_actions"
  on public.codelint_usage_actions
  for all
  using (true)
  with check (true);

create index idx_usage_actions_created_at on public.codelint_usage_actions(created_at desc);
create index idx_usage_actions_action_name on public.codelint_usage_actions(action_name);
