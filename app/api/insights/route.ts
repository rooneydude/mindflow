import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function GET(request: NextRequest) {
  const period = new URL(request.url).searchParams.get('period') || 'week';
  const days = period === 'month' ? 30 : 7;
  const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  // Check cache
  const cacheKey = `insights_${period}_${today}`;
  const { data: cached } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', cacheKey)
    .single();

  if (cached) {
    return NextResponse.json(JSON.parse(cached.value));
  }

  // Fetch entries
  const { data: entries } = await supabase
    .from('entries')
    .select('*')
    .gte('created_at', `${from}T00:00:00`)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  const all = entries || [];

  // Compute chart data (no Claude needed)
  const dailyCounts: Record<string, number> = {};
  const dailyCompleted: Record<string, number> = {};
  const dailyMood: Record<string, { sum: number; count: number }> = {};
  const typeCounts: Record<string, number> = {};

  for (const e of all) {
    const d = e.created_at.split('T')[0];
    dailyCounts[d] = (dailyCounts[d] || 0) + 1;
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    if (e.type === 'task' && e.status === 'completed') dailyCompleted[d] = (dailyCompleted[d] || 0) + 1;
    if (e.mood) {
      if (!dailyMood[d]) dailyMood[d] = { sum: 0, count: 0 };
      dailyMood[d].sum += e.mood;
      dailyMood[d].count += 1;
    }
  }

  // Claude analysis
  const entrySummary = all.slice(0, 50).map(e =>
    `[${e.type}] ${e.content}${e.mood ? ` (mood: ${e.mood}/5)` : ''}${e.project ? ` [${e.project}]` : ''}`
  ).join('\n');

  let aiInsights = { summary: '', patterns: [] as string[], suggestions: [] as string[] };

  if (all.length > 0) {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze this person's ${period === 'month' ? 'monthly' : 'weekly'} activity from their personal planner. Return ONLY valid JSON.

${all.length} entries over ${days} days:
${entrySummary}

Stats: ${Object.keys(typeCounts).map(t => `${t}s: ${typeCounts[t]}`).join(', ')}

Return:
{
  "summary": "A warm 2-3 sentence overview of their ${period}",
  "patterns": ["pattern 1", "pattern 2", "pattern 3"] (recurring behaviors or themes),
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"] (actionable improvements)
}`
      }]
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) aiInsights = JSON.parse(match[0]);
    } catch { /* use defaults */ }
  }

  const result = {
    period,
    totalEntries: all.length,
    typeCounts,
    dailyCounts,
    dailyCompleted,
    dailyMood: Object.fromEntries(
      Object.entries(dailyMood).map(([d, v]) => [d, Math.round(v.sum / v.count * 10) / 10])
    ),
    ...aiInsights,
  };

  // Cache for the day
  await supabase.from('app_settings').upsert(
    { key: cacheKey, value: JSON.stringify(result), updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );

  return NextResponse.json(result);
}
