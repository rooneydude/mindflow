import { NextResponse } from 'next/server';
import { generateDailySummary } from '@/lib/claude';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  const today = new Date().toISOString().split('T')[0];

  const { data: entries } = await supabase
    .from('entries')
    .select('content, type, tags')
    .eq('is_archived', false)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  const result = await generateDailySummary(entries || []);

  const { data, error } = await supabase
    .from('daily_summaries')
    .upsert(
      { date: today, summary: result.summary, mood: result.mood },
      { onConflict: 'date' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('date', today)
    .single();

  return NextResponse.json(data);
}
