'use client';

import { useState, useEffect, useCallback } from 'react';
import { Entry } from '@/lib/types';

const MOOD_EMOJIS = ['', '😞', '😕', '😐', '🙂', '😄'];
const MOOD_LABELS = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Great'];

function MoodPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-zinc-500">Mood:</span>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          title={MOOD_LABELS[n]}
          className={`text-xl transition-all ${value === n ? 'scale-125' : 'opacity-40 hover:opacity-80'}`}
        >
          {MOOD_EMOJIS[n]}
        </button>
      ))}
    </div>
  );
}

function MiniCalendar({ datesWithEntries, selectedDate, onSelect }: {
  datesWithEntries: Set<string>;
  selectedDate: string | null;
  onSelect: (d: string | null) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="text-zinc-400 hover:text-zinc-200 text-sm px-1">‹</button>
        <span className="text-xs font-medium text-zinc-300">{monthLabel}</span>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="text-zinc-400 hover:text-zinc-200 text-sm px-1">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-[10px] text-zinc-600 py-0.5">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const hasEntry = datesWithEntries.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          return (
            <button
              key={i}
              onClick={() => onSelect(isSelected ? null : dateStr)}
              className={`text-[11px] rounded py-0.5 transition-colors ${
                isSelected ? 'bg-indigo-600 text-white' :
                isToday ? 'bg-zinc-700 text-zinc-100' :
                hasEntry ? 'text-indigo-400 hover:bg-zinc-800' :
                'text-zinc-600 hover:bg-zinc-800/50'
              }`}
            >
              {day}
              {hasEntry && !isSelected && <span className="block w-1 h-1 rounded-full bg-indigo-500 mx-auto mt-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<string | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams({ type: 'journal', limit: '200' });
    const res = await fetch(`/api/entries?${params}`);
    if (res.ok) setEntries(await res.json());
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const loadPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const res = await fetch('/api/prompts');
      if (res.ok) { const d = await res.json(); setPrompts(d.prompts); }
    } finally { setLoadingPrompts(false); }
  };

  useEffect(() => { loadPrompts(); }, []);

  const saveEntry = async () => {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        type: 'journal',
        tags: [],
        mood: mood || null,
        status: 'active',
        connections: [],
      }),
    });
    if (res.ok) {
      setContent(''); setMood(0);
      await fetchEntries();
    }
    setIsSaving(false);
  };

  const generateWeeklyReview = async () => {
    setLoadingReview(true);
    try {
      const res = await fetch('/api/summary', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        setWeeklyReview(d.summary);
      }
    } finally { setLoadingReview(false); }
  };

  const datesWithEntries = new Set(entries.map(e => e.created_at.split('T')[0]));

  const filteredEntries = selectedDate
    ? entries.filter(e => e.created_at.startsWith(selectedDate))
    : entries;

  const todayEntries = entries.filter(e => e.created_at.startsWith(new Date().toISOString().split('T')[0]));
  const avgMood = todayEntries.filter(e => e.mood).reduce((sum, e, _, arr) => sum + (e.mood ?? 0) / arr.length, 0);

  return (
    <div className="flex h-screen">
      {/* Sidebar: calendar + weekly review */}
      <aside className="w-60 shrink-0 border-r border-zinc-800/50 p-4 space-y-4 overflow-y-auto">
        <MiniCalendar
          datesWithEntries={datesWithEntries}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />

        {selectedDate && (
          <button onClick={() => setSelectedDate(null)} className="text-xs text-indigo-400 hover:text-indigo-300">
            ← Show all entries
          </button>
        )}

        {avgMood > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <p className="text-[11px] text-zinc-500 mb-1">Today&apos;s mood</p>
            <p className="text-2xl">{MOOD_EMOJIS[Math.round(avgMood)]}</p>
            <p className="text-xs text-zinc-400">{MOOD_LABELS[Math.round(avgMood)]}</p>
          </div>
        )}

        <button
          onClick={generateWeeklyReview}
          disabled={loadingReview}
          className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
        >
          {loadingReview ? 'Generating...' : '✨ Weekly review'}
        </button>

        {weeklyReview && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3">
            <p className="text-[11px] text-indigo-400 font-medium mb-1">Weekly Review</p>
            <p className="text-xs text-zinc-300 leading-relaxed">{weeklyReview}</p>
          </div>
        )}
      </aside>

      {/* Main journal area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold text-zinc-100 mb-6">Journal</h1>

          {/* Daily prompts */}
          {prompts.length > 0 && (
            <div className="mb-5 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Today&apos;s prompts</p>
                <button onClick={loadPrompts} disabled={loadingPrompts} className="text-[11px] text-zinc-500 hover:text-zinc-300">↻ refresh</button>
              </div>
              <div className="space-y-1.5">
                {prompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setContent(prev => prev ? prev + '\n\n' + p : p)}
                    className="w-full text-left text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 px-2 py-1.5 rounded transition-colors"
                  >
                    💬 {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Write entry */}
          <div className="mb-8 bg-zinc-900 border border-zinc-700 rounded-xl p-4 focus-within:border-zinc-500 transition-colors">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write in your journal..."
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 resize-none text-sm leading-relaxed focus:outline-none min-h-[120px]"
            />
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <MoodPicker value={mood} onChange={setMood} />
              <button
                onClick={saveEntry}
                disabled={!content.trim() || isSaving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save entry'}
              </button>
            </div>
          </div>

          {/* Entry list */}
          {selectedDate && (
            <p className="text-xs text-zinc-500 mb-3">
              Showing entries for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          )}

          <div className="space-y-4">
            {filteredEntries.map(entry => {
              const date = new Date(entry.created_at);
              return (
                <div key={entry.id} className="border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] text-zinc-500">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {entry.mood && (
                      <span className="text-base ml-auto" title={MOOD_LABELS[entry.mood]}>
                        {MOOD_EMOJIS[entry.mood]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                </div>
              );
            })}
            {filteredEntries.length === 0 && (
              <p className="text-center py-12 text-zinc-600 text-sm">
                {selectedDate ? 'No entries on this day.' : 'No journal entries yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
