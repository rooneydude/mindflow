import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get('plan_id');
  if (!planId) return NextResponse.json({ error: 'plan_id required' }, { status: 400 });

  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('plan_entry_id', planId)
    .order('order_index');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { plan_entry_id, title, order_index } = await request.json();
  const { data, error } = await supabase
    .from('milestones')
    .insert({ plan_entry_id, title, order_index: order_index ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const { id, ...updates } = await request.json();
  const allowed = ['title', 'is_completed', 'order_index'];
  const safe: Record<string, unknown> = {};
  for (const k of allowed) if (k in updates) safe[k] = updates[k];

  const { data, error } = await supabase
    .from('milestones')
    .update(safe)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
