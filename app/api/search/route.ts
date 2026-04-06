import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: NextRequest) {
  const { query, type } = await request.json();

  // Build query - if type specified, filter to that type; otherwise exclude journal
  let q = supabase
    .from('entries')
    .select('id, content, type, tags, project, created_at, due_date, status, mood')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (type) {
    q = q.eq('type', type);
  } else {
    q = q.neq('type', 'journal');
  }

  const { data: entries } = await q;
  const all = entries || [];

  const context = all.map((e, i) =>
    `[${i}] (${e.type}) "${e.content}"${e.project ? ` [${e.project}]` : ''}${e.due_date ? ` due:${e.due_date}` : ''}${e.mood ? ` mood:${e.mood}/5` : ''} ${e.created_at.split('T')[0]}`
  ).join('\n');

  const isJournal = type === 'journal';
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `You are searching through a personal ${isJournal ? 'journal' : 'planner'}. Answer the user's question based on these entries.

User's question: "${query}"

Entries:
${context}

Return ONLY valid JSON:
{
  "answer": "A concise, helpful answer to their question${isJournal ? ', synthesizing their thoughts and feelings on this topic' : ''}",
  "relevant_indices": [0, 3, 7] (indices of the most relevant entries from the list above, max 5)
}`
    }]
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    const result = JSON.parse(match[0]);
    const relevantEntries = (result.relevant_indices || [])
      .filter((i: number) => i >= 0 && i < all.length)
      .map((i: number) => all[i]);
    return NextResponse.json({ answer: result.answer, entries: relevantEntries });
  } catch {
    return NextResponse.json({ answer: 'Could not find relevant entries.', entries: [] });
  }
}
