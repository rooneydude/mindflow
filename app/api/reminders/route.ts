import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

  const nudges: { id: string; type: string; message: string; entry_id?: string }[] = [];

  // 1. Stale plans: active plans with no related activity in 7 days
  const { data: plans } = await supabase
    .from('entries')
    .select('id, content, project, updated_at')
    .eq('type', 'plan')
    .eq('is_archived', false)
    .neq('status', 'completed');

  for (const plan of plans || []) {
    if (plan.updated_at < weekAgo) {
      nudges.push({
        id: `stale_${plan.id}`,
        type: 'stale_plan',
        message: `Your plan "${plan.content.slice(0, 50)}..." hasn't had activity in over a week.`,
        entry_id: plan.id,
      });
    }
  }

  // 2. Neglected overdue tasks (3+ days overdue)
  const { data: overdue } = await supabase
    .from('entries')
    .select('id, content')
    .eq('type', 'task')
    .eq('is_archived', false)
    .eq('status', 'active')
    .lt('due_date', threeDaysAgo);

  for (const task of overdue || []) {
    nudges.push({
      id: `overdue_${task.id}`,
      type: 'neglected_overdue',
      message: `"${task.content.slice(0, 50)}" is overdue by 3+ days. Complete, snooze, or archive it?`,
      entry_id: task.id,
    });
  }

  // 3. Recurring themes: tags that appear 3+ times in last 14 days without active tasks
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data: recent } = await supabase
    .from('entries')
    .select('tags, type')
    .eq('is_archived', false)
    .gte('created_at', twoWeeksAgo);

  const tagCounts: Record<string, { total: number; hasTasks: boolean }> = {};
  for (const e of recent || []) {
    for (const tag of e.tags || []) {
      if (!tagCounts[tag]) tagCounts[tag] = { total: 0, hasTasks: false };
      tagCounts[tag].total++;
      if (e.type === 'task') tagCounts[tag].hasTasks = true;
    }
  }

  for (const [tag, info] of Object.entries(tagCounts)) {
    if (info.total >= 3 && !info.hasTasks) {
      nudges.push({
        id: `theme_${tag}`,
        type: 'recurring_theme',
        message: `"${tag}" keeps coming up (${info.total}x in 2 weeks) but you don't have any tasks for it.`,
      });
    }
  }

  return NextResponse.json(nudges.slice(0, 5));
}
