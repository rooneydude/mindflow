'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Entry } from '@/lib/types';

const typeIcons: Record<string, string> = { thought: '💡', task: '✅', journal: '📝', plan: '🎯' };

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: '🏠' },
  { label: 'Tasks', href: '/tasks', icon: '✅' },
  { label: 'Journal', href: '/journal', icon: '📝' },
  { label: 'Thoughts', href: '/thoughts', icon: '💡' },
  { label: 'Plans', href: '/plans', icon: '🎯' },
  { label: 'Habits', href: '/habits', icon: '🔥' },
  { label: 'Insights', href: '/insights', icon: '📊' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Entry[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [aiMode, setAiMode] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<Entry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
        setQuery('');
        setResults([]);
        setAiAnswer('');
        setAiResults([]);
        setSelectedIdx(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Keyword search
  const search = useCallback(async (q: string) => {
    if (!q.trim() || aiMode) { setResults([]); return; }
    const res = await fetch(`/api/entries?limit=200`);
    if (!res.ok) return;
    const all: Entry[] = await res.json();
    const lower = q.toLowerCase();
    const matched = all.filter(e =>
      e.type !== 'journal' && (
        e.content.toLowerCase().includes(lower) ||
        e.tags.some(t => t.toLowerCase().includes(lower)) ||
        (e.project ?? '').toLowerCase().includes(lower) ||
        (e.notes ?? '').toLowerCase().includes(lower)
      )
    ).slice(0, 8);
    setResults(matched);
    setSelectedIdx(0);
  }, [aiMode]);

  useEffect(() => {
    if (!aiMode) {
      const timer = setTimeout(() => search(query), 200);
      return () => clearTimeout(timer);
    }
  }, [query, search, aiMode]);

  // AI search (on Enter)
  const aiSearch = async () => {
    if (!query.trim() || aiLoading) return;
    setAiLoading(true);
    setAiAnswer('');
    setAiResults([]);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnswer(data.answer);
        setAiResults(data.entries || []);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const matchingNav = query.trim()
    ? NAV_ITEMS.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_ITEMS;

  const allItems = aiMode
    ? aiResults.map(r => ({ type: 'entry' as const, entry: r }))
    : [
        ...matchingNav.map(n => ({ type: 'nav' as const, ...n })),
        ...results.map(r => ({ type: 'entry' as const, entry: r })),
      ];

  const handleSelect = (idx: number) => {
    const item = allItems[idx];
    if (!item) return;
    if (item.type === 'nav') {
      router.push(item.href);
    } else {
      const typeRoutes: Record<string, string> = { task: '/tasks', journal: '/journal', thought: '/thoughts', plan: '/plans' };
      router.push(typeRoutes[item.entry.type] || '/');
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (aiMode) aiSearch();
      else handleSelect(selectedIdx);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <button
            onClick={() => { setAiMode(v => !v); setAiAnswer(''); setAiResults([]); setResults([]); }}
            className={`text-sm px-2 py-0.5 rounded transition-colors ${aiMode ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
            title={aiMode ? 'Switch to keyword search' : 'Switch to AI search'}
          >
            {aiMode ? '✨ AI' : '⌘'}
          </button>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={aiMode ? 'Ask anything about your entries...' : 'Search entries, navigate...'}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* AI answer */}
          {aiMode && aiLoading && (
            <div className="px-4 py-6 text-center"><p className="text-sm text-zinc-500">Thinking...</p></div>
          )}
          {aiMode && aiAnswer && (
            <div className="px-4 py-3 bg-indigo-500/5 border-b border-zinc-800">
              <p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1">Answer</p>
              <p className="text-sm text-zinc-200 leading-relaxed">{aiAnswer}</p>
            </div>
          )}
          {aiMode && aiResults.length > 0 && (
            <div className="px-2 py-1.5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 mb-1">Related entries</p>
              {aiResults.map((r, i) => (
                <button key={r.id} onClick={() => handleSelect(i)}
                  className={`w-full flex items-start gap-2 px-3 py-2 rounded text-left transition-colors ${selectedIdx === i ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                  <span className="text-sm shrink-0 mt-0.5">{typeIcons[r.type]}</span>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{r.content}</p>
                    {r.project && <span className="text-[10px] text-zinc-600">{r.project}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {aiMode && !aiLoading && !aiAnswer && query && (
            <div className="px-4 py-6 text-center"><p className="text-sm text-zinc-600">Press Enter to search with AI</p></div>
          )}

          {/* Keyword mode */}
          {!aiMode && matchingNav.length > 0 && (
            <div className="px-2 py-1.5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 mb-1">Navigate</p>
              {matchingNav.map((n, i) => (
                <button key={n.href} onClick={() => handleSelect(i)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${selectedIdx === i ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                  <span>{n.icon}</span><span>{n.label}</span>
                </button>
              ))}
            </div>
          )}
          {!aiMode && results.length > 0 && (
            <div className="px-2 py-1.5 border-t border-zinc-800/50">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-2 mb-1">Entries</p>
              {results.map((r, i) => {
                const idx = matchingNav.length + i;
                return (
                  <button key={r.id} onClick={() => handleSelect(idx)}
                    className={`w-full flex items-start gap-2 px-3 py-2 rounded text-left transition-colors ${selectedIdx === idx ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50'}`}>
                    <span className="text-sm shrink-0 mt-0.5">{typeIcons[r.type]}</span>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{r.content}</p>
                      <div className="flex gap-1.5 mt-0.5">
                        {r.project && <span className="text-[10px] text-zinc-600">{r.project}</span>}
                        {r.tags.slice(0, 3).map(t => <span key={t} className="text-[10px] text-zinc-600">{t}</span>)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {!aiMode && query && results.length === 0 && matchingNav.length === 0 && (
            <div className="px-4 py-6 text-center"><p className="text-sm text-zinc-600">No results for &ldquo;{query}&rdquo;</p></div>
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-600">
          <span>↑↓ navigate</span>
          <span>↵ {aiMode ? 'ask AI' : 'select'}</span>
          <span>esc close</span>
          <span className="ml-auto">click ✨ for AI search</span>
        </div>
      </div>
    </div>
  );
}
