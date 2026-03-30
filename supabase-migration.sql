-- MindFlow Migration: Add organizational detail columns
-- Run this in Supabase SQL Editor after the initial supabase-setup.sql

-- Add new columns to entries table
ALTER TABLE entries ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS recurrence text CHECK (recurrence IN ('daily', 'weekly', 'monthly'));
ALTER TABLE entries ADD COLUMN IF NOT EXISTS project text;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_favorited boolean NOT NULL DEFAULT false;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS mood integer CHECK (mood IS NULL OR (mood >= 1 AND mood <= 5));
ALTER TABLE entries ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES entries(id);
ALTER TABLE entries ADD COLUMN IF NOT EXISTS goal_target numeric;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS goal_progress numeric NOT NULL DEFAULT 0;

-- Milestones table (for plans)
CREATE TABLE IF NOT EXISTS milestones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_entry_id uuid NOT NULL REFERENCES entries(id),
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_entries_due_date ON entries(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entries_project ON entries(project) WHERE project IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entries_parent_id ON entries(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entries_is_favorited ON entries(is_favorited) WHERE is_favorited = true;
CREATE INDEX IF NOT EXISTS idx_milestones_plan_entry_id ON milestones(plan_entry_id);

-- RLS for milestones
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to milestones" ON milestones FOR ALL USING (true) WITH CHECK (true);
