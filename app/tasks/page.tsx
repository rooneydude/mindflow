'use client';

import { useState, useEffect, useCallback } from 'react';
import { Entry, Recurrence } from '@/lib/types';

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

function isOverdue(due: string | null) {
  if (!due) return false;
  return new Date(due) < new Date(new Date().toDateString());
}

function isDueToday(due: string | null) {
  if (!due) return false;
  return due === new Date().toISOString().split('T')[0];
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function scheduleNotification(task: Entry) {
  if (!task.due_date || Notification.permission !== 'granted') return;
  const due = new Date(task.due_date);
  due.setHours(9, 0, 0, 0); // 9am on due date
  const delay = due.getTime() - Date.now();
  if (delay > 0 && delay < 86400000 * 2) {
    setTimeout(() => {
      new Notification('MindFlow: Task Due', {
        body: task.content,
        icon: '/favicon.ico',
      });
    }, delay);
  }
}

// Group tasks by project
function groupByProject(tasks: Entry[]) {
  const groups: Record<string, Entry[]> = { 'No Project': [] };
  for (const t of tasks) {
    const key = t.project || 'No Project';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return groups;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Entry[]>([]);
  const [subtasks, setSubtasks] = useState<Record<string, Entry[]>>({});
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [addingSubtask, setAddingSubtask] = useState<string | null>(null);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<Recurrence | ''>('');
  const [projects, setProjects] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams({ type: 'task' });
    if (activeProject) params.set('project', activeProject);
    const res = await fetch(`/api/entries?${params}&limit=100`);
    if (!res.ok) return;
    const data: Entry[] = await res.json();
    const parents = data.filter(t => !t.parent_id);
    const children = data.filter(t => t.parent_id);
    setTasks(parents);
    const subs: Record<string, Entry[]> = {};
    for (const c of children) {
      if (!subs[c.parent_id!]) subs[c.parent_id!] = [];
      subs[c.parent_id!].push(c);
    }
    setSubtasks(subs);

    const ps = Array.from(new Set(data.map(t => t.project).filter(Boolean))) as string[];
    setProjects(ps);
  }, [activeProject]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { requestNotificationPermission(); }, []);

  const addTask = async () => {
    if (!newTask.trim() || isAdding) return;
    setIsAdding(true);
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newTask,
        type: 'task',
        tags: [],
        status: 'active',
        due_date: newDue || null,
        project: newProject || null,
        recurrence: newRecurrence || null,
        priority: null,
        connections: [],
      }),
    });
    if (res.ok) {
      const entry: Entry = await res.json();
      scheduleNotification(entry);
      setNewTask(''); setNewDue(''); setNewProject(''); setNewRecurrence('');
      setShowAddForm(false);
      await fetchTasks();
    }
    setIsAdding(false);
  };

  const addSubtask = async (parentId: string) => {
    if (!subtaskInput.trim()) return;
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: subtaskInput,
        type: 'task',
        tags: [],
        status: 'active',
        parent_id: parentId,
        connections: [],
      }),
    });
    setSubtaskInput('');
    setAddingSubtask(null);
    await fetchTasks();
  };

  const toggleComplete = async (id: string, current: string) => {
    const newStatus = current === 'completed' ? 'active' : 'completed';
    await fetch('/api/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    await fetchTasks();
  };

  const archive = async (id: string) => {
    await fetch('/api/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_archived: true }),
    });
    await fetchTasks();
  };

  const today = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter(t => t.status !== 'completed' && isOverdue(t.due_date));
  const dueToday = tasks.filter(t => t.status !== 'completed' && isDueToday(t.due_date));
  const upcoming = tasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date > today);
  const noDue = tasks.filter(t => t.status !== 'completed' && !t.due_date);
  const completed = tasks.filter(t => t.status === 'completed');

  const grouped = groupByProject(tasks.filter(t => t.status !== 'completed'));

  const renderTask = (task: Entry, indent = false) => {
    const subs = subtasks[task.id] || [];
    const expanded = expandedTasks.has(task.id);
    const overdue_ = isOverdue(task.due_date);
    const today_ = isDueToday(task.due_date);

    return (
      <div key={task.id} className={indent ? 'ml-6 border-l border-zinc-700/50 pl-3' : ''}>
        <div className={`group flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-zinc-800/40 ${task.status === 'completed' ? 'opacity-50' : ''}`}>
          <button
            onClick={() => toggleComplete(task.id, task.status)}
            className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
              task.status === 'completed'
                ? 'bg-emerald-600 border-emerald-600'
                : 'border-zinc-600 hover:border-emerald-500'
            }`}
          >
            {task.status === 'completed' && <span className="text-[10px] text-white">✓</span>}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-sm text-zinc-200 ${task.status === 'completed' ? 'line-through' : ''}`}>
              {task.content}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {task.due_date && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                  overdue_ ? 'bg-red-500/20 text-red-400' :
                  today_ ? 'bg-amber-500/20 text-amber-400' :
                  'bg-zinc-800 text-zinc-500'
                }`}>
                  {overdue_ ? '⚠ Overdue' : today_ ? '⏰ Today' : task.due_date}
                </span>
              )}
              {task.recurrence && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                  ↻ {RECURRENCE_LABELS[task.recurrence]}
                </span>
              )}
              {task.priority && (
                <span className="text-[11px] text-zinc-500">P{task.priority}</span>
              )}
              {subs.length > 0 && (
                <button
                  onClick={() => setExpandedTasks(prev => {
                    const n = new Set(prev);
                    n.has(task.id) ? n.delete(task.id) : n.add(task.id);
                    return n;
                  })}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300"
                >
                  {subs.filter(s => s.status === 'completed').length}/{subs.length} subtasks
                </button>
              )}
            </div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setAddingSubtask(task.id); setExpandedTasks(prev => new Set([...prev, task.id])); }}
              className="text-[11px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            >+ sub</button>
            <button
              onClick={() => archive(task.id)}
              className="text-[11px] px-2 py-1 rounded bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            >archive</button>
          </div>
        </div>

        {(expanded || addingSubtask === task.id) && (
          <div className="ml-6 border-l border-zinc-700/50 pl-3">
            {subs.map(s => renderTask(s, true))}
            {addingSubtask === task.id && (
              <div className="flex gap-2 py-1 pr-3">
                <input
                  autoFocus
                  value={subtaskInput}
                  onChange={e => setSubtaskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSubtask(task.id); if (e.key === 'Escape') setAddingSubtask(null); }}
                  placeholder="Subtask..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <button onClick={() => addSubtask(task.id)} className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded">Add</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (title: string, items: Entry[], color = '') => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-3 ${color || 'text-zinc-500'}`}>{title}</h3>
        <div className="space-y-0.5">{items.map(t => renderTask(t))}</div>
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      {/* Projects sidebar */}
      <aside className="w-44 shrink-0 border-r border-zinc-800/50 p-3 space-y-0.5">
        <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Projects</h3>
        <button
          onClick={() => setActiveProject(null)}
          className={`w-full text-left text-sm px-2 py-1.5 rounded ${!activeProject ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
        >All tasks</button>
        {projects.map(p => (
          <button
            key={p}
            onClick={() => setActiveProject(p === activeProject ? null : p)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded truncate ${activeProject === p ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
          >{p}</button>
        ))}
      </aside>

      {/* Main task list */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-zinc-100">Tasks</h1>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
            >+ New task</button>
          </div>

          {/* Add task form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-xl space-y-3">
              <input
                autoFocus
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Task description..."
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none"
              />
              <div className="flex gap-2 flex-wrap">
                <input
                  type="date"
                  value={newDue}
                  onChange={e => setNewDue(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
                />
                <input
                  value={newProject}
                  onChange={e => setNewProject(e.target.value)}
                  placeholder="Project..."
                  list="projects-list"
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-32"
                />
                <datalist id="projects-list">{projects.map(p => <option key={p} value={p} />)}</datalist>
                <select
                  value={newRecurrence}
                  onChange={e => setNewRecurrence(e.target.value as Recurrence | '')}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
                >
                  <option value="">No recurrence</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button onClick={addTask} disabled={isAdding} className="ml-auto px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white text-xs rounded">
                  {isAdding ? 'Saving...' : 'Add task'}
                </button>
              </div>
            </div>
          )}

          {renderSection('⚠ Overdue', overdue, 'text-red-400')}
          {renderSection('⏰ Due Today', dueToday, 'text-amber-400')}
          {renderSection('Upcoming', upcoming)}
          {renderSection('No Due Date', noDue)}
          {renderSection('Completed', completed)}

          {tasks.length === 0 && (
            <div className="text-center py-16 text-zinc-600 text-sm">No tasks yet. Add your first task above.</div>
          )}
        </div>
      </div>
    </div>
  );
}
