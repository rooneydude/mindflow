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

  // Fetch recent entries for context
  const { data: recentEntries } = await supabase
    .from('entries')
    .select('id, content, type, tags')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(20);

  const analysis = await analyzeEntry(content, recentEntries || []);

  return NextResponse.json(analysis);
}
