import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const tag = searchParams.get('tag');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabase
    .from('entries')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  if (tag) {
    query = query.contains('tags', [tag]);
  }

  const project = searchParams.get('project');
  if (project) {
    query = query.eq('project', project);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content, type, tags, embedding_summary, priority, connections,
          due_date, recurrence, project, parent_id, mood,
          is_favorited, goal_target, goal_progress, notes, sort_order, labels } = body;

  const { data, error } = await supabase
    .from('entries')
    .insert({
      content,
      type: type || 'thought',
      tags: tags || [],
      embedding_summary: embedding_summary || null,
      status: 'active',
      is_archived: false,
      priority: priority || null,
      connections: connections || [],
      due_date: due_date || null,
      recurrence: recurrence || null,
      project: project || null,
      parent_id: parent_id || null,
      mood: mood || null,
      is_favorited: is_favorited ?? false,
      goal_target: goal_target || null,
      goal_progress: goal_progress ?? 0,
      notes: notes || null,
      sort_order: sort_order ?? 0,
      labels: labels ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // NEVER allow hard deletes — only status/archive updates
  const allowedFields = ['status', 'is_archived', 'content', 'type', 'tags', 'priority', 'connections',
    'due_date', 'recurrence', 'project', 'parent_id', 'mood', 'is_favorited', 'goal_target', 'goal_progress',
    'notes', 'sort_order', 'labels'];
  const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowedFields) {
    if (key in updates) {
      safeUpdates[key] = updates[key];
    }
  }

  const { data, error } = await supabase
    .from('entries')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
