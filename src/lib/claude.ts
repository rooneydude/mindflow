import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysis, Entry } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function analyzeEntry(
  content: string,
  recentEntries: Pick<Entry, 'id' | 'content' | 'type' | 'tags' | 'project'>[],
  existingProjects: string[]
): Promise<AIAnalysis> {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const recentContext = recentEntries
    .map((e) => `[${e.id}] (${e.type}) ${e.content} | tags: ${e.tags.join(', ')}${e.project ? ` | project: ${e.project}` : ''}`)
    .join('\n');

  const projectList = existingProjects.length > 0
    ? `\nExisting projects: ${existingProjects.join(', ')}`
    : '';

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an AI assistant for a personal journal/planner app called MindFlow. Analyze this new entry and extract ALL structured information from it.

Today is ${dayOfWeek}, ${today}. Tomorrow is ${tomorrow}.

New entry: "${content}"

Recent entries for context:
${recentContext || 'No recent entries yet.'}
${projectList}

Return ONLY valid JSON with these fields:
{
  "type": "thought" | "task" | "journal" | "plan",
  "tags": ["tag1", "tag2", ...],
  "summary": "A brief one-line summary for matching with future entries",
  "priority": null or 1-4 (1=urgent, 2=high, 3=medium, 4=low; only for tasks),
  "connections": ["id1", "id2"],
  "due_date": "YYYY-MM-DD" or null,
  "project": "project name" or null,
  "mood": 1-5 or null (only for journal entries: 1=rough, 5=great)
}

IMPORTANT RULES:
- CLASSIFY correctly: action items = "task", feelings/reflections = "journal", ideas = "thought", goals/strategies = "plan"
- DUE DATES: Extract dates from natural language. "by tomorrow" = "${tomorrow}", "by Thursday" = next Thursday's date, "today" = "${today}", "next week" = 7 days from today. If no date mentioned, null.
- PROJECTS: Match to an existing project if the entry clearly relates to one (case-insensitive, partial match OK). If the entry mentions a new project/course/subject name, use that as the project. If no project context, null.
- PRIORITY: For tasks, infer urgency. Due today/tomorrow = 1 or 2. "ASAP"/"urgent" = 1. General tasks = 3. Low priority / someday = 4. Non-tasks = null.
- MOOD: Only for journal entries. Detect emotional tone. Happy/excited = 5, good = 4, neutral = 3, frustrated = 2, upset = 1.
- CONNECTIONS: Link to recent entries that share the same project, topic, or related intent.
- Tags should be 1-3 words each, lowercase, 2-5 tags total.`,
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
      due_date: null,
      project: null,
      mood: null,
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
