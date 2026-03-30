-- MindFlow Database Setup
-- Run this in your Supabase SQL Editor (supabase.com > your project > SQL Editor)

-- Create entries table
create table if not exists entries (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  type text not null default 'thought' check (type in ('thought', 'task', 'journal', 'plan')),
  tags text[] default '{}',
  embedding_summary text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  is_archived boolean not null default false,
  priority integer check (priority is null or (priority >= 1 and priority <= 5)),
  connections uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create daily_summaries table
create table if not exists daily_summaries (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  summary text not null,
  mood text,
  created_at timestamptz default now()
);

-- Create indexes for common queries
create index if not exists idx_entries_is_archived on entries(is_archived);
create index if not exists idx_entries_type on entries(type);
create index if not exists idx_entries_created_at on entries(created_at desc);
create index if not exists idx_entries_tags on entries using gin(tags);
create index if not exists idx_daily_summaries_date on daily_summaries(date);

-- Enable Row Level Security (open access for now — add auth later)
alter table entries enable row level security;
alter table daily_summaries enable row level security;

-- Allow all operations for now (you can restrict this later with auth)
create policy "Allow all access to entries" on entries for all using (true) with check (true);
create policy "Allow all access to daily_summaries" on daily_summaries for all using (true) with check (true);

-- IMPORTANT: There is intentionally NO delete policy enforcement here.
-- The app is designed to NEVER hard-delete entries — only archive them.
-- If you need to purge data, do it manually in the Supabase dashboard.
