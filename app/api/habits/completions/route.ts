import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Toggle: if completion exists for (habit_id, date) delete it, else insert
export async function POST(request: NextRequest) {
  const { habit_id, date } = await request.json();

  const { data: existing } = await supabase
    .from('habit_completions')
    .select('id')
    .eq('habit_id', habit_id)
    .eq('date', date)
    .single();

  if (existing) {
    await supabase.from('habit_completions').delete().eq('id', existing.id);
    return NextResponse.json({ toggled: false });
  }

  await supabase.from('habit_completions').insert({ habit_id, date });
  return NextResponse.json({ toggled: true });
}
