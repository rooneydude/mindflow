export type EntryType = 'thought' | 'task' | 'journal' | 'plan';
export type EntryStatus = 'active' | 'completed' | 'archived';

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
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  id: string;
  date: string;
  summary: string;
  mood: string | null;
  created_at: string;
}

export interface AIAnalysis {
  type: EntryType;
  tags: string[];
  summary: string;
  priority: number | null;
  connections: string[];
}
