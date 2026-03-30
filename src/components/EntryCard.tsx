'use client';

import { useState } from 'react';
import { Entry } from '@/lib/types';

const typeIcons: Record<string, string> = {
  thought: '💡',
  task: '✅',
  journal: '📝',
  plan: '🎯',
};

const typeColors: Record<string, string> = {
  thought: 'border-amber-500/30 bg-amber-500/5',
  task: 'border-emerald-500/30 bg-emerald-500/5',
  journal: 'border-blue-500/30 bg-blue-500/5',
  plan: 'border-purple-500/30 bg-purple-500/5',
};

const tagColors: Record<string, string> = {
  thought: 'bg-amber-500/10 text-amber-400',
  task: 'bg-emerald-500/10 text-emerald-400',
  journal: 'bg-blue-500/10 text-blue-400',
  plan: 'bg-purple-500/10 text-purple-400',
};

interface EntryCardProps {
  entry: Entry;
  onToggleComplete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onShowConnections?: (entry: Entry) => void;
}

export default function EntryCard({ entry, onToggleComplete, onArchive, onShowConnections }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const timeAgo = getTimeAgo(entry.created_at);

  return (
    <div
      className={`border rounded-lg p-4 transition-all cursor-pointer hover:border-zinc-500 ${typeColors[entry.type]} ${
        entry.status === 'completed' ? 'opacity-50' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5 shrink-0">{typeIcons[entry.type]}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-zinc-200 text-sm leading-relaxed ${entry.status === 'completed' ? 'line-through' : ''}`}>
            {entry.content}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${tagColors[entry.type]}`}
              >
                {tag}
              </span>
            ))}
            <span className="text-[11px] text-zinc-600 ml-auto shrink-0">{timeAgo}</span>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-center gap-2">
              {entry.type === 'task' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete?.(entry.id);
                  }}
                  className="text-xs px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  {entry.status === 'completed' ? 'Reopen' : 'Complete'}
                </button>
              )}
              {entry.connections.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowConnections?.(entry);
                  }}
                  className="text-xs px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  {entry.connections.length} connection{entry.connections.length !== 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive?.(entry.id);
                }}
                className="text-xs px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors ml-auto"
              >
                Archive
              </button>
            </div>
          )}
        </div>

        {entry.priority && entry.type === 'task' && (
          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
            P{entry.priority}
          </span>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
