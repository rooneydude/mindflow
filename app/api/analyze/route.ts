import { NextRequest, NextResponse } from 'next/server';
import { analyzeEntry } from '@/lib/claude';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  return NextResponse.json(analysis);
}
