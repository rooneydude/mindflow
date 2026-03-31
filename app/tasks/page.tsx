'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Entry, Recurrence } from '@/lib/types';

// ── Constants ────────────────────────────────────────────────────────────────

type Priority = 'urgent' | 'high' | 'medium' | 'low';

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string; order: number }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/30', dot: 'bg-red-500', order: 0 },
  high:   { label: 'High',   color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', dot: 'bg-orange-500', order: 1 },
  medium: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-500', order: 2 },
  low:    { label: 'Low',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', dot: 'bg-blue-500', order: 3 },
};

const numericToNamed = (n: number | null): Priority | null => {
  if (!n) return null;
  return (['urgent', 'high', 'medium', 'low'] as Priority[])[n - 1] ?? null;
};

const namedToNumeric = (p: Priority | null): number | null => {
  if (!p) return null;
  return { urgent: 1, high: 2, medium: 3, low: 4 }[p];
};

const LABEL_COLORS = [
  'bg-pink-500/20 text-pink-400',
  'bg-violet-500/20 text-violet-400',
  'bg-cyan-500/20 text-cyan-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
];

const labelColor = (label: string) =>
  LABEL_COLORS[Math.abs(label.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % LABEL_COLORS.length];

function isOverdue(due: string | null) {
  if (!due) return false;
  return due < new Date().toISOString().split('T')[0];
}

function isDueToday(due: string | null) {
  return due === new Date().toISOString().split('T')[0];
}

// ── Sortable task row (list view) ─────────────────────────────────────────────

function SortableTask({
  task, subtasks, selectedIds, onToggleSelect, onToggleStatus,
  onArchive, onAddSubtask, onUpdateNotes, onUpdatePriority, onUpdateLabels,
}: {
  task: Entry;
  subtasks: Entry[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleStatus: (id: string, status: string) => void;
  onArchive: (id: string) => void;
  onAddSubtask: (parentId: string, content: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdatePriority: (id: string, p: Priority | null) => void;
  onUpdateLabels: (id: string, labels: string[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(task.notes ?? '');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [addingLabel, setAddingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  const priority = numericToNamed(task.priority);
  const overdue = isOverdue(task.due_date);
  const today = isDueToday(task.due_date);
  const done = task.status === 'completed';
  const inProgress = task.status === 'in_progress';

  return (
    <div ref={setNodeRef} style={style} className={`group rounded-lg border transition-colors ${
      done ? 'border-zinc-800/50 opacity-50' :
      overdue ? 'border-red-500/20 bg-red-500/[0.02]' :
      'border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle */}
        <button {...attributes} {...listeners} className="mt-1 shrink-0 text-zinc-700 hover:text-zinc-500 cursor-grab active:cursor-grabbing">
          ⠿
        </button>

        {/* Bulk select */}
        <input
          type="checkbox"
          checked={selectedIds.has(task.id)}
          onChange={() => onToggleSelect(task.id)}
          className="mt-1 shrink-0 accent-indigo-500"
        />

        {/* Complete checkbox */}
        <button
          onClick={() => onToggleStatus(task.id, task.status)}
          className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
            done ? 'bg-emerald-600 border-emerald-600' :
            inProgress ? 'bg-indigo-600/50 border-indigo-500' :
            'border-zinc-600 hover:border-emerald-500'
          }`}
        >
          {done && <span className="text-[9px] text-white">✓</span>}
          {inProgress && <span className="text-[9px] text-white">●</span>}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(v => !v)}>
          <p className={`text-sm text-zinc-200 leading-snug ${done ? 'line-through text-zinc-500' : ''}`}>
            {task.content}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {priority && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PRIORITY_CONFIG[priority].color}`}>
                {PRIORITY_CONFIG[priority].label}
              </span>
            )}
            {task.due_date && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                overdue ? 'bg-red-500/20 text-red-400' :
                today ? 'bg-amber-500/20 text-amber-400' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                {overdue ? '⚠ ' : today ? '⏰ ' : ''}{task.due_date}
              </span>
            )}
            {task.recurrence && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                ↻ {task.recurrence}
              </span>
            )}
            {(task.labels ?? []).map(l => (
              <span key={l} className={`text-[10px] px-1.5 py-0.5 rounded-full ${labelColor(l)}`}>{l}</span>
            ))}
            {subtasks.length > 0 && (
              <span className="text-[10px] text-zinc-600">
                {subtasks.filter(s => s.status === 'completed').length}/{subtasks.length} sub
              </span>
            )}
            {task.notes && <span className="text-[10px] text-zinc-600">📝</span>}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Priority picker */}
          <select
            value={priority ?? ''}
            onChange={e => onUpdatePriority(task.id, (e.target.value as Priority) || null)}
            onClick={e => e.stopPropagation()}
            className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-zinc-400 focus:outline-none"
          >
            <option value="">— priority</option>
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
          <button
            onClick={e => { e.stopPropagation(); onArchive(task.id); }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          >archive</button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-10 pb-3 space-y-3">
          {/* Notes */}
          <div>
            {editingNotes ? (
              <textarea
                autoFocus
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                onBlur={() => { setEditingNotes(false); onUpdateNotes(task.id, notesValue); }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none min-h-[80px]"
                placeholder="Add notes, links, or context..."
              />
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className="w-full text-left text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1.5 rounded hover:bg-zinc-800/50 transition-colors"
              >
                {task.notes || '+ Add notes...'}
              </button>
            )}
          </div>

          {/* Labels */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(task.labels ?? []).map(l => (
              <button
                key={l}
                onClick={() => onUpdateLabels(task.id, (task.labels ?? []).filter(x => x !== l))}
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${labelColor(l)} hover:opacity-70`}
                title="Remove label"
              >{l} ×</button>
            ))}
            {addingLabel ? (
              <input
                autoFocus
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && labelInput.trim()) {
                    onUpdateLabels(task.id, [...(task.labels ?? []), labelInput.trim()]);
                    setLabelInput(''); setAddingLabel(false);
                  }
                  if (e.key === 'Escape') { setAddingLabel(false); setLabelInput(''); }
                }}
                placeholder="Label name..."
                className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-zinc-300 focus:outline-none w-28"
              />
            ) : (
              <button onClick={() => setAddingLabel(true)} className="text-[10px] text-zinc-600 hover:text-zinc-400">+ label</button>
            )}
          </div>

          {/* Status toggle */}
          <div className="flex items-center gap-2">
            {(['active', 'in_progress', 'completed'] as const).map(s => (
              <button
                key={s}
                onClick={() => onToggleStatus(task.id, s === task.status ? 'active' : s)}
                className={`text-[10px] px-2 py-1 rounded transition-colors ${
                  task.status === s ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s === 'active' ? 'To Do' : s === 'in_progress' ? 'In Progress' : 'Done'}
              </button>
            ))}
          </div>

          {/* Subtasks */}
          <div>
            {subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-1">
                <button
                  onClick={() => onToggleStatus(s.id, s.status)}
                  className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                    s.status === 'completed' ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600'
                  }`}
                >
                  {s.status === 'completed' && <span className="text-[8px] text-white">✓</span>}
                </button>
                <span className={`text-xs ${s.status === 'completed' ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>{s.content}</span>
              </div>
            ))}
            {addingSubtask ? (
              <div className="flex gap-2 mt-1">
                <input
                  autoFocus
                  value={subtaskInput}
                  onChange={e => setSubtaskInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onAddSubtask(task.id, subtaskInput); setSubtaskInput(''); setAddingSubtask(false); }
                    if (e.key === 'Escape') setAddingSubtask(false);
                  }}
                  placeholder="Subtask..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
                <button onClick={() => { onAddSubtask(task.id, subtaskInput); setSubtaskInput(''); setAddingSubtask(false); }}
                  className="text-[10px] px-2 bg-indigo-600 text-white rounded">Add</button>
              </div>
            ) : (
              <button onClick={() => setAddingSubtask(true)} className="text-[10px] text-zinc-600 hover:text-zinc-400 mt-1">+ subtask</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Kanban card ───────────────────────────────────────────────────────────────

function KanbanCard({ task, onStatusChange }: { task: Entry; onStatusChange: (id: string, status: string) => void }) {
  const priority = numericToNamed(task.priority);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-700 transition-colors">
      <p className="text-sm text-zinc-200 leading-snug mb-2">{task.content}</p>
      <div className="flex flex-wrap gap-1 items-center">
        {priority && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${PRIORITY_CONFIG[priority].color}`}>
            {PRIORITY_CONFIG[priority].label}
          </span>
        )}
        {task.due_date && (
          <span className={`text-[10px] px-1 rounded ${isOverdue(task.due_date) ? 'text-red-400' : isDueToday(task.due_date) ? 'text-amber-400' : 'text-zinc-600'}`}>
            {task.due_date}
          </span>
        )}
        {(task.labels ?? []).map(l => (
          <span key={l} className={`text-[10px] px-1.5 py-0.5 rounded-full ${labelColor(l)}`}>{l}</span>
        ))}
      </div>
      <div className="flex gap-1 mt-2 pt-2 border-t border-zinc-800/50">
        {(['active', 'in_progress', 'completed'] as const).map(s => (
          <button
            key={s}
            onClick={() => onStatusChange(task.id, s)}
            className={`flex-1 text-[9px] py-0.5 rounded transition-colors ${
              task.status === s ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {s === 'active' ? 'Todo' : s === 'in_progress' ? 'Doing' : 'Done'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Entry[]>([]);
  const [subtasks, setSubtasks] = useState<Record<string, Entry[]>>({});
  const [projects, setProjects] = useState<string[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'board'>('list');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterLabel, setFilterLabel] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'manual'>('date');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<Recurrence | ''>('');
  const [newPriority, setNewPriority] = useState<Priority | ''>('');
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams({ type: 'task', limit: '200' });
    if (activeProject) params.set('project', activeProject);
    const res = await fetch(`/api/entries?${params}`);
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
    setProjects(Array.from(new Set(data.map(t => t.project).filter(Boolean))) as string[]);
  }, [activeProject]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const patch = async (id: string, updates: Record<string, unknown>) => {
    await fetch('/api/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    await fetchTasks();
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    let next: string;
    if (currentStatus === 'completed') next = 'active';
    else if (currentStatus === 'active') next = 'completed';
    else next = currentStatus; // explicit set from expanded view
    await patch(id, { status: next });
  };

  const handleStatusChange = async (id: string, status: string) => {
    await patch(id, { status });
  };

  const handleArchive = async (id: string) => { await patch(id, { is_archived: true }); };
  const handleUpdateNotes = async (id: string, notes: string) => { await patch(id, { notes }); };
  const handleUpdatePriority = async (id: string, p: Priority | null) => {
    await patch(id, { priority: namedToNumeric(p) });
  };
  const handleUpdateLabels = async (id: string, labels: string[]) => { await patch(id, { labels }); };
  const handleAddSubtask = async (parentId: string, content: string) => {
    if (!content.trim()) return;
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, type: 'task', tags: [], status: 'active', parent_id: parentId, connections: [] }),
    });
    await fetchTasks();
  };

  const addTask = async () => {
    if (!newTask.trim() || isAdding) return;
    setIsAdding(true);
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newTask, type: 'task', tags: [], status: 'active',
        due_date: newDue || null, project: newProject || null,
        recurrence: newRecurrence || null,
        priority: namedToNumeric(newPriority as Priority || null),
        connections: [], sort_order: tasks.length,
      }),
    });
    setNewTask(''); setNewDue(''); setNewProject(''); setNewRecurrence(''); setNewPriority('');
    setShowAddForm(false);
    await fetchTasks();
    setIsAdding(false);
  };

  // Bulk actions
  const bulkAction = async (action: 'complete' | 'archive' | string) => {
    for (const id of selectedIds) {
      if (action === 'complete') await patch(id, { status: 'completed' });
      else if (action === 'archive') await patch(id, { is_archived: true });
      else await patch(id, { project: action }); // move to project
    }
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map(t => t.id)));
  };

  // Drag end (manual reorder)
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTasks(prev => {
      const oldIdx = prev.findIndex(t => t.id === active.id);
      const newIdx = prev.findIndex(t => t.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      // persist order
      reordered.forEach((t, i) => {
        fetch('/api/entries', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: t.id, sort_order: i }),
        });
      });
      return reordered;
    });
  };

  // All unique labels
  const allLabels = useMemo(() =>
    Array.from(new Set(tasks.flatMap(t => t.labels ?? []))).sort(),
    [tasks]
  );

  // Filter + search + sort
  const filtered = useMemo(() => {
    let result = tasks.filter(t => t.status !== 'archived');
    if (search) result = result.filter(t => t.content.toLowerCase().includes(search.toLowerCase()) || (t.notes ?? '').toLowerCase().includes(search.toLowerCase()));
    if (filterPriority) result = result.filter(t => numericToNamed(t.priority) === filterPriority);
    if (filterLabel) result = result.filter(t => (t.labels ?? []).includes(filterLabel));
    if (sortBy === 'priority') {
      result = [...result].sort((a, b) => (PRIORITY_CONFIG[numericToNamed(a.priority) ?? 'low']?.order ?? 4) - (PRIORITY_CONFIG[numericToNamed(b.priority) ?? 'low']?.order ?? 4));
    } else if (sortBy === 'date') {
      result = [...result].sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    } else {
      result = [...result].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return result;
  }, [tasks, search, filterPriority, filterLabel, sortBy]);

  const active_ = filtered.filter(t => t.status === 'active');
  const inProgress_ = filtered.filter(t => t.status === 'in_progress');
  const completed_ = filtered.filter(t => t.status === 'completed');

  // List sections
  const today_ = new Date().toISOString().split('T')[0];
  const sections = [
    { title: '⚠ Overdue', color: 'text-red-400', items: active_.filter(t => isOverdue(t.due_date)) },
    { title: '⏰ Due Today', color: 'text-amber-400', items: active_.filter(t => isDueToday(t.due_date)) },
    { title: 'In Progress', color: 'text-indigo-400', items: inProgress_ },
    { title: 'Upcoming', color: '', items: active_.filter(t => t.due_date && t.due_date > today_) },
    { title: 'No Due Date', color: '', items: active_.filter(t => !t.due_date) },
    { title: 'Completed', color: 'text-zinc-600', items: completed_ },
  ];

  return (
    <div className="flex h-screen">
      {/* Projects sidebar */}
      <aside className="w-44 shrink-0 border-r border-zinc-800/50 p-3 space-y-0.5 overflow-y-auto">
        <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Projects</h3>
        <button onClick={() => setActiveProject(null)}
          className={`w-full text-left text-sm px-2 py-1.5 rounded ${!activeProject ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
          All tasks
          <span className="ml-1 text-zinc-600 text-[11px]">{tasks.length}</span>
        </button>
        {projects.map(p => (
          <button key={p} onClick={() => setActiveProject(p === activeProject ? null : p)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded truncate ${activeProject === p ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
            {p}
          </button>
        ))}

        {allLabels.length > 0 && (
          <>
            <div className="pt-4 pb-1">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-2">Labels</h3>
            </div>
            {allLabels.map(l => (
              <button key={l} onClick={() => setFilterLabel(filterLabel === l ? '' : l)}
                className={`w-full text-left text-[11px] px-2 py-1 rounded flex items-center gap-1.5 ${filterLabel === l ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>
                <span className={`inline-block w-2 h-2 rounded-full ${labelColor(l).split(' ')[0]}`} />
                {l}
              </button>
            ))}
          </>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <h1 className="text-xl font-semibold text-zinc-100 mr-auto">Tasks</h1>
            {/* View toggle */}
            <div className="flex bg-zinc-800 rounded-lg p-0.5 text-sm">
              <button onClick={() => setView('list')} className={`px-3 py-1 rounded-md transition-colors ${view === 'list' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>List</button>
              <button onClick={() => setView('board')} className={`px-3 py-1 rounded-md transition-colors ${view === 'board' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>Board</button>
            </div>
            <button onClick={() => setShowAddForm(v => !v)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">
              + New task
            </button>
          </div>

          {/* Search + filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="flex-1 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | '')}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-400 focus:outline-none">
              <option value="">All priorities</option>
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'date' | 'priority' | 'manual')}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-400 focus:outline-none">
              <option value="date">Sort: Due date</option>
              <option value="priority">Sort: Priority</option>
              <option value="manual">Sort: Manual</option>
            </select>
          </div>

          {/* Add task form */}
          {showAddForm && (
            <div className="mb-5 p-4 bg-zinc-900 border border-zinc-700 rounded-xl space-y-3">
              <input
                autoFocus value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Task description..."
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none"
              />
              <div className="flex gap-2 flex-wrap items-center">
                <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none" />
                <input value={newProject} onChange={e => setNewProject(e.target.value)} placeholder="Project..."
                  list="proj-list"
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none w-28" />
                <datalist id="proj-list">{projects.map(p => <option key={p} value={p} />)}</datalist>
                <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority | '')}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none">
                  <option value="">No priority</option>
                  {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                </select>
                <select value={newRecurrence} onChange={e => setNewRecurrence(e.target.value as Recurrence | '')}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-400 focus:outline-none">
                  <option value="">No recurrence</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button onClick={addTask} disabled={isAdding || !newTask.trim()}
                  className="ml-auto px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white text-xs rounded-lg">
                  {isAdding ? 'Saving...' : 'Add task'}
                </button>
              </div>
            </div>
          )}

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-indigo-600/10 border border-indigo-500/30 rounded-lg">
              <span className="text-sm text-indigo-300">{selectedIds.size} selected</span>
              <div className="flex gap-2 ml-auto">
                <button onClick={() => bulkAction('complete')} className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded">Complete all</button>
                <button onClick={() => bulkAction('archive')} className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded">Archive all</button>
                {projects.length > 0 && (
                  <select onChange={e => { if (e.target.value) bulkAction(e.target.value); }}
                    className="text-xs bg-zinc-700 border border-zinc-600 rounded px-2 text-zinc-300 focus:outline-none">
                    <option value="">Move to project...</option>
                    {projects.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
                <button onClick={() => setSelectedIds(new Set())} className="text-xs px-2 py-1 text-zinc-500 hover:text-zinc-300">✕ Clear</button>
              </div>
            </div>
          )}

          {/* Select all */}
          {filtered.length > 0 && view === 'list' && (
            <button onClick={selectAll} className="text-[11px] text-zinc-600 hover:text-zinc-400 mb-3">
              Select all ({filtered.length})
            </button>
          )}

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              {sections.map(({ title, color, items }) => {
                if (items.length === 0) return null;
                return (
                  <div key={title} className="mb-6">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${color || 'text-zinc-500'}`}>{title} <span className="text-zinc-700 font-normal normal-case">{items.length}</span></h3>
                    <SortableContext items={items.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {items.map(task => (
                          <SortableTask
                            key={task.id}
                            task={task}
                            subtasks={subtasks[task.id] ?? []}
                            selectedIds={selectedIds}
                            onToggleSelect={toggleSelect}
                            onToggleStatus={handleToggleStatus}
                            onArchive={handleArchive}
                            onAddSubtask={handleAddSubtask}
                            onUpdateNotes={handleUpdateNotes}
                            onUpdatePriority={handleUpdatePriority}
                            onUpdateLabels={handleUpdateLabels}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center py-16 text-zinc-600 text-sm">
                  {search || filterPriority || filterLabel ? 'No tasks match your filters.' : 'No tasks yet.'}
                </p>
              )}
            </DndContext>
          )}

          {/* ── BOARD VIEW ── */}
          {view === 'board' && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'active', label: 'To Do', items: active_, accent: 'border-zinc-700' },
                { key: 'in_progress', label: 'In Progress', items: inProgress_, accent: 'border-indigo-500/50' },
                { key: 'completed', label: 'Done', items: completed_, accent: 'border-emerald-500/50' },
              ].map(col => (
                <div key={col.key} className={`border rounded-xl p-3 ${col.accent} bg-zinc-900/30`}>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-1">
                    {col.label} <span className="text-zinc-600 font-normal">{col.items.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {col.items.map(task => (
                      <KanbanCard key={task.id} task={task} onStatusChange={handleStatusChange} />
                    ))}
                    {col.items.length === 0 && (
                      <p className="text-[11px] text-zinc-700 text-center py-4">Empty</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
