'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import StreamInput from '@/components/StreamInput';
import { Entry, DailySummary } from '@/lib/types';
import Link from 'next/link';

const MOOD_EMOJIS = ['', '😞', '😕', '😐', '🙂', '😄'];

function StatCard({ label, value, sub, href }: { label: string; value: string | number; sub?: string; href?: string }) {
  const inner = (
    <div className="border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function MoodChart({ entries }: { entries: Entry[] }) {
  const last7 = useMemo(() => {
    const days: { date: string; avg: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const dayEntries = entries.filter(e => e.created_at.startsWith(d) && e.mood);
      const avg = dayEntries.length > 0
        ? dayEntries.reduce((s, e) => s + (e.mood ?? 0), 0) / dayEntries.length
        : 0;
      days.push({ date: d, avg, count: dayEntries.length });
    }
    return days;
  }, [entries]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="border border-zinc-800 rounded-xl p-4">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">Mood — Last 7 Days</p>
      <div className="flex items-end gap-2 h-24">
        {last7.map(d => {
          const height = d.avg > 0 ? (d.avg / 5) * 100 : 0;
          const dayName = dayLabels[new Date(d.date + 'T12:00:00').getDay()];
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                {d.avg > 0 ? (
                  <div
                    className="w-full max-w-[28px] rounded-t bg-indigo-500/40 transition-all"
                    style={{ height: `${height}%` }}
                    title={`${d.date}: ${MOOD_EMOJIS[Math.round(d.avg)]} (${d.count} entries)`}
                  />
                ) : (
                  <div className="w-full max-w-[28px] h-1 rounded bg-zinc-800" />
                )}
              </div>
              <span className="text-[9px] text-zinc-600">{dayName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [dupWarning, setDupWarning] = useState<{ content: string; similar: Entry } | null>(null);

  const fetchEntries = useCallback(async () => {
    const res = await fetch('/api/entries?limit=200');
    if (res.ok) setEntries(await res.json());
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => {
    fetch('/api/summary').then(r => r.ok ? r.json() : null).then(d => { if (d) setDailySummary(d); });
  }, []);

  const handleSubmit = async (content: string) => {
    setIsProcessing(true);
    setDupWarning(null);
    try {
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const analysis = await analyzeRes.json();

      // Smart dedup: check for similar entries
      if (analysis.similar_entry_id) {
        const similar = entries.find(e => e.id === analysis.similar_entry_id);
        if (similar) {
          setDupWarning({ content, similar });
          setIsProcessing(false);
          return;
        }
      }

      await saveEntry(content, analysis);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveEntry = async (content: string, analysis: Record<string, unknown>) => {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        type: analysis.type,
        tags: analysis.tags,
        embedding_summary: analysis.summary,
        priority: analysis.priority,
        connections: analysis.connections,
        due_date: analysis.due_date || null,
        project: analysis.project || null,
        mood: analysis.mood || null,
      }),
    });
    if (res.ok) {
      setDupWarning(null);
      await fetchEntries();
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // Stats
  const tasksDueToday = useMemo(() =>
    entries.filter(e => e.type === 'task' && e.due_date === today && e.status !== 'completed'),
    [entries, today]
  );
  const overdue = useMemo(() =>
    entries.filter(e => e.type === 'task' && e.due_date && e.due_date < today && e.status !== 'completed'),
    [entries, today]
  );
  const weekEntries = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    return entries.filter(e => e.created_at >= weekAgo);
  }, [entries]);
  const completedThisWeek = weekEntries.filter(e => e.type === 'task' && e.status === 'completed').length;
  const journalEntries = entries.filter(e => e.type === 'journal');
  const todayMoods = journalEntries.filter(e => e.created_at.startsWith(today) && e.mood);
  const avgMood = todayMoods.length > 0
    ? Math.round(todayMoods.reduce((s, e) => s + (e.mood ?? 0), 0) / todayMoods.length)
    : 0;

  // Streak: consecutive days with at least one entry
  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      if (entries.some(e => e.created_at.startsWith(d))) count++;
      else break;
    }
    return count;
  }, [entries]);

  // Upcoming deadlines (next 7 days)
  const upcoming = useMemo(() => {
    const week = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    return entries
      .filter(e => e.type === 'task' && e.due_date && e.due_date >= today && e.due_date <= week && e.status !== 'completed')
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
  }, [entries, today]);

  // Recent entries (last 8, EXCLUDE journal content for privacy)
  const recent = entries.filter(e => e.type !== 'journal').slice(0, 8);

  const typeIcons: Record<string, string> = { thought: '💡', task: '✅', journal: '📝', plan: '🎯' };

  return (
    <div className="h-screen overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stream input */}
        <div className="mb-6">
          <StreamInput onSubmit={handleSubmit} isProcessing={isProcessing} />
        </div>

        {/* Dedup warning */}
        {dupWarning && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-sm text-amber-300 mb-2">This looks similar to an existing entry:</p>
            <div className="bg-zinc-900 rounded-lg p-3 mb-3">
              <p className="text-xs text-zinc-400">{typeIcons[dupWarning.similar.type]} {dupWarning.similar.content}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const res = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: dupWarning.content }),
                  });
                  const analysis = await res.json();
                  await saveEntry(dupWarning.content, analysis);
                }}
                className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
              >Save anyway</button>
              <button
                onClick={() => setDupWarning(null)}
                className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
              >Cancel</button>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Due Today"
            value={tasksDueToday.length}
            sub={overdue.length > 0 ? `${overdue.length} overdue` : undefined}
            href="/tasks"
          />
          <StatCard
            label="This Week"
            value={weekEntries.length}
            sub={`${completedThisWeek} tasks done`}
          />
          <StatCard
            label="Mood"
            value={avgMood > 0 ? MOOD_EMOJIS[avgMood] : '—'}
            sub={avgMood > 0 ? ['', 'Rough', 'Meh', 'Okay', 'Good', 'Great'][avgMood] : 'No mood logged today'}
            href="/journal"
          />
          <StatCard
            label="Streak"
            value={`${streak}d`}
            sub={streak > 0 ? 'consecutive days' : 'Start today!'}
          />
        </div>

        {/* Daily summary */}
        {dailySummary && (
          <div className="mb-6 border border-zinc-800 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-xl p-4">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Today&apos;s Summary</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{dailySummary.summary}</p>
          </div>
        )}

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Today's focus */}
          <div className="border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Today&apos;s Focus</p>
              <Link href="/tasks" className="text-[11px] text-indigo-400 hover:text-indigo-300">View all →</Link>
            </div>
            {[...overdue, ...tasksDueToday].length === 0 ? (
              <p className="text-sm text-zinc-600 py-4 text-center">No tasks due today. Nice!</p>
            ) : (
              <div className="space-y-2">
                {[...overdue, ...tasksDueToday].slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      t.due_date && t.due_date < today ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <span className="text-sm text-zinc-300 truncate">{t.content}</span>
                    {t.project && <span className="text-[10px] text-zinc-600 ml-auto shrink-0">{t.project}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming deadlines */}
          <div className="border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Upcoming (7 days)</p>
              <Link href="/tasks" className="text-[11px] text-indigo-400 hover:text-indigo-300">View all →</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-zinc-600 py-4 text-center">No upcoming deadlines</p>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 6).map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 shrink-0 w-14">{t.due_date?.slice(5)}</span>
                    <span className="text-sm text-zinc-300 truncate">{t.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mood chart */}
        <div className="mb-6">
          <MoodChart entries={journalEntries} />
        </div>

        {/* Recent activity */}
        <div className="border border-zinc-800 rounded-xl p-4">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">Recent Activity</p>
          <div className="space-y-2">
            {recent.map(e => (
              <div key={e.id} className="flex items-center gap-2 py-1">
                <span className="text-sm shrink-0">{typeIcons[e.type]}</span>
                <span className="text-sm text-zinc-300 truncate">{e.content}</span>
                <span className="text-[10px] text-zinc-600 ml-auto shrink-0">
                  {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
