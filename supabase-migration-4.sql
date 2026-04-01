-- MindFlow Migration 4: Habit tracking
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS habits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '✅',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id uuid NOT NULL REFERENCES habits(id),
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(date);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to habits" ON habits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to habit_completions" ON habit_completions FOR ALL USING (true) WITH CHECK (true);
