'use client';

import { EntryType } from '@/lib/types';

interface SidebarProps {
  activeFilter: EntryType | 'all';
  onFilterChange: (filter: EntryType | 'all') => void;
  entryCounts: Record<string, number>;
  allTags: string[];
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
}

const filters: { key: EntryType | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '✨' },
  { key: 'thought', label: 'Thoughts', icon: '💡' },
  { key: 'task', label: 'Tasks', icon: '✅' },
  { key: 'journal', label: 'Journal', icon: '📝' },
  { key: 'plan', label: 'Plans', icon: '🎯' },
];

export default function Sidebar({
  activeFilter,
  onFilterChange,
  entryCounts,
  allTags,
  activeTag,
  onTagClick,
}: SidebarProps) {
  return (
    <aside className="w-full lg:w-56 shrink-0">
      <div className="sticky top-6 space-y-6">
        <div>
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">Filter</h3>
          <div className="space-y-0.5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => onFilterChange(f.key)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activeFilter === f.key
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <span className="text-sm">{f.icon}</span>
                <span>{f.label}</span>
                <span className="ml-auto text-[11px] text-zinc-600">
                  {entryCounts[f.key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {allTags.slice(0, 20).map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagClick(activeTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                    activeTag === tag
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
