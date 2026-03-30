import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  // Get recent journal entries for context
  const { data: recent } = await supabase
    .from('entries')
    .select('content, mood, created_at')
    .eq('type', 'journal')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(5);

  const context = recent?.map(e => e.content).join('\n') || '';

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Generate 3 thoughtful journal prompts for today (${today}). These are personal daily reflection prompts.
${context ? `\nRecent journal context:\n${context}` : ''}
Return ONLY a JSON array of 3 strings, each a single question or prompt. No extra text.`
    }]
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
  try {
    const match = text.match(/\[[\s\S]*\]/);
    const prompts = match ? JSON.parse(match[0]) : [];
    return NextResponse.json({ prompts });
  } catch {
    return NextResponse.json({ prompts: [
      "What's one thing you're grateful for today?",
      "What's on your mind right now?",
      "What do you want to accomplish or let go of today?"
    ]});
  }
}
