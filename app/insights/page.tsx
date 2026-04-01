'use client';

import { useState, useEffect, useMemo } from 'react';

const MOOD_EMOJIS = ['', '😞', '😕', '😐', '🙂', '😄'];
const TYPE_ICONS: Record<string, string> = { thought: '💡', task: '✅', journal: '📝', plan: '🎯' };

interface InsightData {
  period: string;
  totalEntries: number;
  typeCounts: Record<string, number>;
  dailyCounts: Record<string, number>;
  dailyCompleted: Record<string, number>;
  dailyMood: Record<string, number>;
  summary: string;
  patterns: string[];
  suggestions: string[];
}

function BarChart({ data, label, color = 'bg-indigo-500' }: { data: { key: string; value: number }[]; label: string; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="border border-zinc-800 rounded-xl p-4">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">{label}</p>
      <div className="flex items-end gap-1.5 h-24">
        {data.map(d => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
              {d.value > 0 ? (
                <div
                  className={`w-full max-w-[24px] rounded-t ${color} transition-all`}
                  style={{ height: `${(d.value / max) * 100}%` }}
                  title={`${d.key}: ${d.value}`}
                />
              ) : (
                <div className="w-full max-w-[24px] h-1 rounded bg-zinc-800" />
              )}
            </div>
            <span className="text-[9px] text-zinc-600">{d.key.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/insights?period=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [period]);

  const days = useMemo(() => {
    const n = period === 'month' ? 30 : 7;
    const result: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      result.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
    }
    return result;
  }, [period]);

  return (
    <div className="h-screen overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-zinc-100">Insights</h1>
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            <button onClick={() => setPeriod('week')} className={`px-3 py-1 rounded-md text-sm ${period === 'week' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400'}`}>Week</button>
            <button onClick={() => setPeriod('month')} className={`px-3 py-1 rounded-md text-sm ${period === 'month' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400'}`}>Month</button>
          </div>
        </div>

        {loading && <p className="text-sm text-zinc-600 text-center py-12">Analyzing your {period}...</p>}

        {data && !loading && (
          <>
            {/* AI Summary */}
            {data.summary && (
              <div className="mb-6 border border-zinc-800 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-xl p-5">
                <p className="text-[11px] text-indigo-400 uppercase tracking-wider mb-2">AI Summary</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{data.summary}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="border border-zinc-800 rounded-xl p-4">
                <p className="text-[11px] text-zinc-500">Total Entries</p>
                <p className="text-2xl font-semibold text-zinc-100">{data.totalEntries}</p>
              </div>
              {Object.entries(data.typeCounts).map(([type, count]) => (
                <div key={type} className="border border-zinc-800 rounded-xl p-4">
                  <p className="text-[11px] text-zinc-500">{TYPE_ICONS[type]} {type}s</p>
                  <p className="text-2xl font-semibold text-zinc-100">{count}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <BarChart
                label="Entries per day"
                data={days.map(d => ({ key: d, value: data.dailyCounts[d] || 0 }))}
                color="bg-indigo-500/60"
              />
              <BarChart
                label="Tasks completed"
                data={days.map(d => ({ key: d, value: data.dailyCompleted[d] || 0 }))}
                color="bg-emerald-500/60"
              />
            </div>

            {/* Mood trend */}
            <div className="border border-zinc-800 rounded-xl p-4 mb-6">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">Mood Trend</p>
              <div className="flex items-end gap-1.5 h-24">
                {days.map(d => {
                  const mood = data.dailyMood[d];
                  const height = mood ? (mood / 5) * 100 : 0;
                  return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                        {mood ? (
                          <div className="w-full max-w-[24px] rounded-t bg-amber-500/50 transition-all" style={{ height: `${height}%` }} title={`${MOOD_EMOJIS[Math.round(mood)]} ${mood}`} />
                        ) : (
                          <div className="w-full max-w-[24px] h-1 rounded bg-zinc-800" />
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-600">{d.slice(8)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Patterns + Suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.patterns.length > 0 && (
                <div className="border border-zinc-800 rounded-xl p-4">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">Patterns</p>
                  <div className="space-y-2">
                    {data.patterns.map((p, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-indigo-400 shrink-0">•</span>
                        <p className="text-sm text-zinc-300">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.suggestions.length > 0 && (
                <div className="border border-zinc-800 rounded-xl p-4">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">Suggestions</p>
                  <div className="space-y-2">
                    {data.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 shrink-0">→</span>
                        <p className="text-sm text-zinc-300">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
