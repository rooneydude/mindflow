'use client';

import { useState, useEffect, useCallback } from 'react';
import { Entry, Milestone } from '@/lib/types';

function ProgressBar({ value, target }: { value: number; target: number | null }) {
  if (!target) return null;
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
        <span>Progress</span>
        <span>{value} / {target} ({pct}%)</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MilestoneList({ planId, onUpdate }: { planId: string; onUpdate?: () => void }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const fetch_ = useCallback(async () => {
    const res = await fetch(`/api/milestones?plan_id=${planId}`);
    if (res.ok) setMilestones(await res.json());
  }, [planId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const addMilestone = async () => {
    if (!newTitle.trim()) return;
    await fetch('/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_entry_id: planId, title: newTitle, order_index: milestones.length }),
    });
    setNewTitle('');
    await fetch_();
    onUpdate?.();
  };

  const toggleMilestone = async (m: Milestone) => {
    await fetch('/api/milestones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, is_completed: !m.is_completed }),
    });
    await fetch_();
    onUpdate?.();
  };

  const completed = milestones.filter(m => m.is_completed).length;

  return (
    <div className="mt-3 pt-3 border-t border-zinc-800/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-zinc-500 font-medium">MILESTONES {milestones.length > 0 && `· ${completed}/${milestones.length}`}</span>
        <button onClick={() => setAdding(!adding)} className="text-[11px] text-zinc-500 hover:text-zinc-300">+ add</button>
      </div>
      <div className="space-y-1.5">
        {milestones.map(m => (
          <div key={m.id} className="flex items-center gap-2">
            <button
              onClick={() => toggleMilestone(m)}
              className={`w-3.5 h-3.5 rounded-sm border shrink-0 flex items-center justify-center transition-colors ${
                m.is_completed ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600 hover:border-indigo-500'
              }`}
            >
              {m.is_completed && <span className="text-[8px] text-white">✓</span>}
            </button>
            <span className={`text-xs ${m.is_completed ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
              {m.title}
            </span>
          </div>
        ))}
      </div>
      {adding && (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addMilestone(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Milestone name..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <button onClick={addMilestone} className="text-[11px] px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Add</button>
        </div>
      )}
    </div>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Entry[]>([]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [linkedTasks, setLinkedTasks] = useState<Record<string, Entry[]>>({});
  const [breakdownResult, setBreakdownResult] = useState<{ milestones: {title:string;order_index:number}[]; tasks: {content:string;priority:number}[] } | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState<string | null>(null);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanContent, setNewPlanContent] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingProgress, setEditingProgress] = useState<string | null>(null);
  const [progressInput, setProgressInput] = useState('');

  const fetchPlans = useCallback(async () => {
    const res = await fetch('/api/entries?type=plan&limit=100');
    if (res.ok) setPlans(await res.json());
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const fetchLinkedTasks = async (planId: string) => {
    const res = await fetch(`/api/entries?type=task&limit=100`);
    if (!res.ok) return;
    const all: Entry[] = await res.json();
    setLinkedTasks(prev => ({ ...prev, [planId]: all.filter(t => t.connections?.includes(planId)) }));
  };

  const expand = (id: string) => {
    if (expandedPlan === id) { setExpandedPlan(null); return; }
    setExpandedPlan(id);
    fetchLinkedTasks(id);
  };

  const createPlan = async () => {
    if (!newPlanContent.trim() || isCreating) return;
    setIsCreating(true);
    const analyzeRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newPlanContent }),
    });
    const analysis = await analyzeRes.json();
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newPlanContent,
        type: 'plan',
        tags: analysis.tags,
        embedding_summary: analysis.summary,
        goal_target: newGoalTarget ? parseFloat(newGoalTarget) : null,
        goal_progress: 0,
        status: 'active',
        connections: [],
      }),
    });
    setNewPlanContent(''); setNewGoalTarget(''); setShowNewPlan(false);
    await fetchPlans();
    setIsCreating(false);
  };

  const runAIBreakdown = async (plan: Entry) => {
    setBreakdownLoading(plan.id);
    const res = await fetch('/api/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: plan.content, goal_target: plan.goal_target }),
    });
    if (res.ok) {
      const data = await res.json();
      setBreakdownResult(data);
      // Auto-create milestones
      for (const m of data.milestones) {
        await fetch('/api/milestones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_entry_id: plan.id, ...m }),
        });
      }
      // Auto-create tasks linked to this plan
      for (const t of data.tasks) {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: t.content,
            type: 'task',
            tags: [],
            priority: t.priority,
            connections: [plan.id],
            status: 'active',
          }),
        });
      }
      await fetchLinkedTasks(plan.id);
    }
    setBreakdownLoading(null);
  };

  const updateProgress = async (id: string) => {
    const val = parseFloat(progressInput);
    if (isNaN(val)) return;
    await fetch('/api/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, goal_progress: val }),
    });
    setEditingProgress(null);
    await fetchPlans();
  };

  return (
    <div className="h-screen overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-zinc-100">Plans</h1>
          <button
            onClick={() => setShowNewPlan(v => !v)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
          >+ New plan</button>
        </div>

        {/* New plan form */}
        {showNewPlan && (
          <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-xl space-y-3">
            <textarea
              autoFocus
              value={newPlanContent}
              onChange={e => setNewPlanContent(e.target.value)}
              placeholder="Describe your plan or goal..."
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-sm leading-relaxed focus:outline-none min-h-[80px] resize-none"
            />
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500">Goal target:</label>
                <input
                  type="number"
                  value={newGoalTarget}
                  onChange={e => setNewGoalTarget(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <button
                onClick={createPlan}
                disabled={!newPlanContent.trim() || isCreating}
                className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white text-sm rounded-lg"
              >
                {isCreating ? 'Saving...' : 'Create plan'}
              </button>
            </div>
          </div>
        )}

        {/* Plans list */}
        <div className="space-y-3">
          {plans.map(plan => {
            const isExpanded = expandedPlan === plan.id;
            const tasks = linkedTasks[plan.id] || [];

            return (
              <div key={plan.id} className="border border-zinc-800 rounded-xl overflow-hidden">
                {/* Plan header */}
                <div
                  className="p-4 cursor-pointer hover:bg-zinc-900/50 transition-colors"
                  onClick={() => expand(plan.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">🎯</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 leading-relaxed">{plan.content}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {plan.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded-full">{tag}</span>
                        ))}
                      </div>
                      <ProgressBar value={plan.goal_progress} target={plan.goal_target} />
                    </div>
                    <span className="text-zinc-600 text-sm shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-900/30 space-y-4">
                    {/* Progress editor */}
                    {plan.goal_target && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Update progress:</span>
                        {editingProgress === plan.id ? (
                          <>
                            <input
                              autoFocus
                              value={progressInput}
                              onChange={e => setProgressInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') updateProgress(plan.id); if (e.key === 'Escape') setEditingProgress(null); }}
                              className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-300 focus:outline-none"
                            />
                            <button onClick={() => updateProgress(plan.id)} className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded">Set</button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setEditingProgress(plan.id); setProgressInput(String(plan.goal_progress)); }}
                            className="text-xs px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded"
                          >
                            {plan.goal_progress} / {plan.goal_target}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Milestones */}
                    <MilestoneList planId={plan.id} />

                    {/* Linked tasks */}
                    {tasks.length > 0 && (
                      <div className="pt-3 border-t border-zinc-800/50">
                        <p className="text-[11px] text-zinc-500 font-medium mb-2">LINKED TASKS · {tasks.filter(t => t.status === 'completed').length}/{tasks.length} done</p>
                        <div className="space-y-1.5">
                          {tasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2">
                              <span className={`text-xs ${t.status === 'completed' ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                                {t.status === 'completed' ? '✓ ' : '○ '}{t.content}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI breakdown button */}
                    <div className="pt-3 border-t border-zinc-800/50">
                      <button
                        onClick={() => runAIBreakdown(plan)}
                        disabled={breakdownLoading === plan.id}
                        className="w-full text-sm py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                      >
                        {breakdownLoading === plan.id
                          ? '⏳ Breaking down...'
                          : '✨ AI breakdown → auto-create milestones & tasks'}
                      </button>
                      {breakdownResult && breakdownLoading === null && (
                        <p className="text-[11px] text-emerald-400 text-center mt-2">
                          ✓ Created {breakdownResult.milestones.length} milestones and {breakdownResult.tasks.length} tasks
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {plans.length === 0 && (
            <p className="text-center py-16 text-zinc-600 text-sm">No plans yet. Create your first plan above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
