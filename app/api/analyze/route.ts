import { NextRequest, NextResponse } from 'next/server';
import { analyzeEntry } from '@/lib/claude';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Simple similarity check (word overlap)
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

export async function POST(request: NextRequest) {
  const { content } = await request.json();

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  // Fetch recent entries for context (include project field)
  const { data: recentEntries } = await supabase
    .from('entries')
    .select('id, content, type, tags, project')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(20);

  // Smart dedup: find similar existing entries
  let similarEntryId: string | null = null;
  if (recentEntries) {
    for (const entry of recentEntries) {
      if (similarity(content, entry.content) > 0.6) {
        similarEntryId = entry.id;
        break;
      }
    }
  }

  // Get existing project names
  const { data: projectRows } = await supabase
    .from('entries')
    .select('project')
    .neq('project', null)
    .eq('is_archived', false);

  const existingProjects = Array.from(
    new Set((projectRows ?? []).map(r => r.project).filter(Boolean))
  );

  const analysis = await analyzeEntry(content, recentEntries || [], existingProjects);

  return NextResponse.json({
    ...analysis,
    similar_entry_id: similarEntryId,
  });
}
