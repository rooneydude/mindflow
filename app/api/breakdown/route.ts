import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: NextRequest) {
  const { content, goal_target } = await request.json();

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Break down this plan into actionable milestones and tasks.

Plan: "${content}"
${goal_target ? `Goal target: ${goal_target}` : ''}

Return ONLY valid JSON:
{
  "milestones": [
    { "title": "Phase 1 name", "order_index": 0 },
    { "title": "Phase 2 name", "order_index": 1 }
  ],
  "tasks": [
    { "content": "specific action item", "priority": 1 },
    { "content": "another action item", "priority": 2 }
  ]
}

Keep milestones to 3-5 high-level phases. Keep tasks to 5-8 specific actions.`
    }]
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    return NextResponse.json(JSON.parse(match[0]));
  } catch {
    return NextResponse.json({ milestones: [], tasks: [] });
  }
}
