-- MindFlow Migration 2: Robust tasks
-- Run in Supabase SQL Editor

ALTER TABLE entries ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS labels text[] NOT NULL DEFAULT '{}';

-- Add 'in_progress' to status (for Kanban)
-- Drop and recreate the check constraint
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_status_check;
ALTER TABLE entries ADD CONSTRAINT entries_status_check
  CHECK (status IN ('active', 'in_progress', 'completed', 'archived'));

CREATE INDEX IF NOT EXISTS idx_entries_sort_order ON entries(sort_order);
