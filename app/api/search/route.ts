import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: NextRequest) {
  const { query } = await request.json();

  // Fetch recent non-journal entries
  const { data: entries } = await supabase
    .from('entries')
    .select('id, content, type, tags, project, created_at, due_date, status')
    .eq('is_archived', false)
    .neq('type', 'journal')
    .order('created_at', { ascending: false })
    .limit(100);

  const all = entries || [];
  const context = all.map((e, i) =>
    `[${i}] (${e.type}) "${e.content}"${e.project ? ` [${e.project}]` : ''}${e.due_date ? ` due:${e.due_date}` : ''} status:${e.status}`
  ).join('\n');

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `You are searching through a personal planner's entries. Answer the user's question based on these entries.

User's question: "${query}"

Entries:
${context}

Return ONLY valid JSON:
{
  "answer": "A concise, helpful answer to their question",
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
