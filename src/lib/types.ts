export type EntryType = 'thought' | 'task' | 'journal' | 'plan';
export type EntryStatus = 'active' | 'in_progress' | 'completed' | 'archived';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type Recurrence = 'daily' | 'weekly' | 'monthly';

export interface Entry {
  id: string;
  content: string;
  type: EntryType;
  tags: string[];
  embedding_summary: string | null;
  status: EntryStatus;
  is_archived: boolean;
  priority: number | null;
  connections: string[];
  // Tasks
  due_date: string | null;
  recurrence: Recurrence | null;
  project: string | null;
  parent_id: string | null;
  notes: string | null;
  sort_order: number;
  labels: string[];
  // Journal
  mood: number | null; // 1-5
  // Thoughts
  is_favorited: boolean;
  // Plans
  goal_target: number | null;
  goal_progress: number;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  plan_entry_id: string;
  title: string;
  is_completed: boolean;
  order_index: number;
  created_at: string;
}

export interface DailySummary {
  id: string;
  date: string;
  summary: string;
  mood: string | null;
  created_at: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  is_archived: boolean;
  created_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  date: string;
  created_at: string;
}

export interface AIAnalysis {
  type: EntryType;
  tags: string[];
  summary: string;
  priority: number | null;
  connections: string[];
  due_date: string | null;
  project: string | null;
  mood: number | null;
}
