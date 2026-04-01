import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('is_archived', false)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let completions: unknown[] = [];
  if (from && to) {
    const { data } = await supabase
      .from('habit_completions')
      .select('*')
      .gte('date', from)
      .lte('date', to);
    completions = data || [];
  }

  return NextResponse.json({ habits, completions });
}

export async function POST(request: NextRequest) {
  const { name, icon } = await request.json();
  const { data, error } = await supabase
    .from('habits')
    .insert({ name, icon: icon || '✅' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const { id, ...updates } = await request.json();
  const allowed = ['name', 'icon', 'is_archived'];
  const safe: Record<string, unknown> = {};
  for (const k of allowed) if (k in updates) safe[k] = updates[k];

  const { data, error } = await supabase.from('habits').update(safe).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
