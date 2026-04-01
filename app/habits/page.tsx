'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Habit, HabitCompletion } from '@/lib/types';

const HABIT_ICONS = ['✅', '🏃', '📖', '🧘', '💧', '🍎', '💤', '✍️', '🎯', '💪'];

function getStreak(habitId: string, completions: HabitCompletion[]): { current: number; longest: number } {
  const dates = completions
    .filter(c => c.habit_id === habitId)
    .map(c => c.date)
    .sort()
    .reverse();

  if (dates.length === 0) return { current: 0, longest: 0 };

  const today = new Date().toISOString().split('T')[0];

  // Current streak: count backwards from today
  let current = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    if (dates.includes(d)) current++;
    else if (i === 0) continue; // today not done yet is OK
    else break;
  }

  // Longest streak
  let longest = 0;
  let run = 1;
  const sorted = [...new Set(dates)].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00');
    const curr = new Date(sorted[i] + 'T12:00:00');
    if (curr.getTime() - prev.getTime() === 86400000) {
      run++;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  return { current, longest };
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('✅');

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/habits?from=${weekAgo}&to=${today}`);
    if (res.ok) {
      const d = await res.json();
      setHabits(d.habits);
      setCompletions(d.completions);
    }
  }, [today, weekAgo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggle = async (habitId: string) => {
    await fetch('/api/habits/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId, date: today }),
    });
    await fetchData();
  };

  const addHabit = async () => {
    if (!newName.trim()) return;
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, icon: newIcon }),
    });
    setNewName('');
    setNewIcon('✅');
    setShowAdd(false);
    await fetchData();
  };

  const isCompleted = (habitId: string, date: string) =>
    completions.some(c => c.habit_id === habitId && c.date === date);

  // Last 7 days
  const last7 = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(new Date(Date.now() - i * 86400000).toISOString().split('T')[0]);
    }
    return days;
  }, []);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDone = habits.filter(h => isCompleted(h.id, today)).length;

  return (
    <div className="h-screen overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Habits</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{todayDone}/{habits.length} done today</p>
          </div>
          <button onClick={() => setShowAdd(v => !v)} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">
            + New habit
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-xl space-y-3">
            <div className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addHabit()}
                placeholder="Habit name..."
                className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none"
              />
              <button onClick={addHabit} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg">Add</button>
            </div>
            <div className="flex gap-2">
              {HABIT_ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`text-lg p-1 rounded transition-all ${newIcon === icon ? 'bg-zinc-700 scale-110' : 'opacity-40 hover:opacity-80'}`}
                >{icon}</button>
              ))}
            </div>
          </div>
        )}

        {habits.length === 0 ? (
          <p className="text-center py-16 text-zinc-600 text-sm">No habits yet. Add your first habit above.</p>
        ) : (
          <>
            {/* Today's checklist */}
            <div className="mb-8">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Today</h2>
              <div className="space-y-2">
                {habits.map(h => {
                  const done = isCompleted(h.id, today);
                  const streaks = getStreak(h.id, completions);
                  return (
                    <div key={h.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800 hover:border-zinc-700'
                    }`}>
                      <button
                        onClick={() => toggle(h.id)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                          done ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600 hover:border-emerald-500'
                        }`}
                      >
                        {done && <span className="text-xs text-white">✓</span>}
                      </button>
                      <span className="text-lg">{h.icon}</span>
                      <span className={`text-sm flex-1 ${done ? 'text-zinc-400' : 'text-zinc-200'}`}>{h.name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        {streaks.current > 0 && (
                          <span className="text-[11px] text-amber-400">🔥 {streaks.current}d</span>
                        )}
                        <span className="text-[10px] text-zinc-600">best: {streaks.longest}d</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly heatmap */}
            <div className="border border-zinc-800 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Last 7 Days</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] text-zinc-600 pb-2 w-32" />
                      {last7.map(d => (
                        <th key={d} className="text-center text-[10px] text-zinc-600 pb-2 px-1">
                          {dayLabels[new Date(d + 'T12:00:00').getDay()]}
                          <br />{d.slice(8)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map(h => (
                      <tr key={h.id}>
                        <td className="text-xs text-zinc-400 py-1 truncate max-w-[120px]">{h.icon} {h.name}</td>
                        {last7.map(d => (
                          <td key={d} className="text-center py-1 px-1">
                            <div className={`w-5 h-5 mx-auto rounded ${
                              isCompleted(h.id, d) ? 'bg-emerald-500' : 'bg-zinc-800'
                            }`} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
