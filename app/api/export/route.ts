import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const format = new URL(request.url).searchParams.get('format') || 'json';

  const { data: entries, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!entries) return NextResponse.json({ error: 'No data' }, { status: 404 });

  const date = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const headers = Object.keys(entries[0] || {});
    const rows = entries.map(e =>
      headers.map(h => {
        const val = (e as Record<string, unknown>)[h];
        const str = Array.isArray(val) ? val.join('; ') : String(val ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="mindflow-export-${date}.csv"`,
      },
    });
  }

  if (format === 'markdown') {
    const types = ['task', 'journal', 'thought', 'plan'];
    const icons: Record<string, string> = { task: '✅', journal: '📝', thought: '💡', plan: '🎯' };
    let md = `# MindFlow Export — ${date}\n\n`;
    for (const type of types) {
      const items = entries.filter(e => e.type === type);
      if (items.length === 0) continue;
      md += `## ${icons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}s (${items.length})\n\n`;
      for (const e of items) {
        const meta = [e.project, e.due_date, e.status !== 'active' ? e.status : ''].filter(Boolean).join(' | ');
        md += `### ${e.content}\n`;
        if (meta) md += `*${meta}*\n`;
        if (e.notes) md += `\n${e.notes}\n`;
        if (e.tags?.length) md += `\nTags: ${e.tags.join(', ')}\n`;
        md += `\n---\n\n`;
      }
    }
    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="mindflow-export-${date}.md"`,
      },
    });
  }

  // Default: JSON
  return new NextResponse(JSON.stringify(entries, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mindflow-export-${date}.json"`,
    },
  });
}
