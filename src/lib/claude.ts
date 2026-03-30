import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysis, Entry } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function analyzeEntry(
  content: string,
  recentEntries: Pick<Entry, 'id' | 'content' | 'type' | 'tags'>[]
): Promise<AIAnalysis> {
  const recentContext = recentEntries
    .map((e) => `[${e.id}] (${e.type}) ${e.content} | tags: ${e.tags.join(', ')}`)
    .join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an AI assistant for a personal journal/planner app. Analyze this new entry and return a JSON response.

New entry: "${content}"

Recent entries for context (find connections if relevant):
${recentContext || 'No recent entries yet.'}

Return ONLY valid JSON with these fields:
{
  "type": "thought" | "task" | "journal" | "plan",
  "tags": ["tag1", "tag2", ...],
  "summary": "A brief one-line summary for matching with future entries",
  "priority": null or 1-5 (only for tasks, 1=highest),
  "connections": ["id1", "id2"] (IDs of related recent entries, empty array if none)
}

Rules:
- "thought" = an idea, observation, or reflection
- "task" = something to do, an action item
- "journal" = personal diary entry, how the user feels, what happened
- "plan" = a goal, strategy, or multi-step intention
- Tags should be 1-3 words each, lowercase, 2-5 tags total
- Only connect entries that are genuinely related in topic or intent`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return JSON.parse(jsonMatch[0]) as AIAnalysis;
  } catch {
    return {
      type: 'thought',
      tags: [],
      summary: content.slice(0, 100),
      priority: null,
      connections: [],
    };
  }
}

export async function generateDailySummary(
  entries: Pick<Entry, 'content' | 'type' | 'tags'>[]
): Promise<{ summary: string; mood: string | null }> {
  if (entries.length === 0) {
    return { summary: 'No entries today.', mood: null };
  }

  const entriesText = entries
    .map((e) => `[${e.type}] ${e.content}`)
    .join('\n');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Summarize this person's day based on their journal/planner entries. Return ONLY valid JSON.

Entries:
${entriesText}

Return:
{
  "summary": "A warm, concise 2-3 sentence summary of their day",
  "mood": "one word describing the overall mood, or null if unclear"
}`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { summary: 'Had a productive day with various activities.', mood: null };
  }
}
