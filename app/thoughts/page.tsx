'use client';

import { useState, useEffect, useCallback } from 'react';
import { Entry } from '@/lib/types';

const tagColors = [
  'bg-zinc-800 text-zinc-400',
  'bg-indigo-500/10 text-indigo-400',
  'bg-amber-500/10 text-amber-400',
];

export default function ThoughtsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedForConnections, setSelectedForConnections] = useState<Entry | null>(null);
  const [connectionEntries, setConnectionEntries] = useState<Entry[]>([]);
  const [convertMenu, setConvertMenu] = useState<string | null>(null);
  const [newThought, setNewThought] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchEntries = useCallback(async () => {
    const res = await fetch('/api/entries?type=thought&limit=100');
    if (res.ok) setEntries(await res.json());
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const toggleFavorite = async (entry: Entry) => {
    await fetch('/api/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, is_favorited: !entry.is_favorited }),
    });
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, is_favorited: !e.is_favorited } : e));
  };

  const convertTo = async (entry: Entry, type: 'task' | 'plan') => {
    await fetch('/api/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, type }),
    });
    setConvertMenu(null);
    await fetchEntries();
  };

  const showConnections = async (entry: Entry) => {
    setSelectedForConnections(entry);
    if (entry.connections.length > 0) {
      const res = await fetch(`/api/connections?ids=${entry.connections.join(',')}`);
      if (res.ok) setConnectionEntries(await res.json());
    } else {
      setConnectionEntries([]);
    }
  };

  const addThought = async () => {
    if (!newThought.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newThought }),
      });
      const analysis = await analyzeRes.json();
      await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newThought,
          type: 'thought',
          tags: analysis.tags,
          embedding_summary: analysis.summary,
          connections: analysis.connections,
          status: 'active',
        }),
      });
      setNewThought('');
      await fetchEntries();
    } finally {
      setIsAdding(false);
    }
  };

  const displayed = showFavoritesOnly ? entries.filter(e => e.is_favorited) : entries;

  return (
    <div className="flex h-screen">
      {/* Left sidebar */}
      <aside className="w-44 shrink-0 border-r border-zinc-800/50 p-3">
        <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">View</h3>
        <button
          onClick={() => setShowFavoritesOnly(false)}
          className={`w-full text-left text-sm px-2 py-1.5 rounded mb-0.5 ${!showFavoritesOnly ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
        >All thoughts</button>
        <button
          onClick={() => setShowFavoritesOnly(true)}
          className={`w-full text-left text-sm px-2 py-1.5 rounded ${showFavoritesOnly ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
        >⭐ Favorites</button>

        <div className="mt-6">
          <p className="text-[11px] text-zinc-600 px-2">{entries.length} thoughts</p>
          <p className="text-[11px] text-zinc-600 px-2">{entries.filter(e => e.is_favorited).length} starred</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold text-zinc-100 mb-6">Thoughts</h1>

          {/* Quick add */}
          <div className="mb-8 flex gap-2">
            <input
              value={newThought}
              onChange={e => setNewThought(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addThought()}
              placeholder="Capture a thought..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={addThought}
              disabled={!newThought.trim() || isAdding}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white text-sm rounded-lg"
            >
              {isAdding ? 'Thinking...' : 'Save'}
            </button>
          </div>

          {/* Idea board - masonry grid */}
          {displayed.length === 0 ? (
            <p className="text-center py-16 text-zinc-600 text-sm">No thoughts yet.</p>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
              {displayed.map(entry => (
                <div
                  key={entry.id}
                  className="break-inside-avoid border border-zinc-800 rounded-xl p-4 bg-zinc-900/30 hover:border-zinc-700 transition-colors"
                >
                  <p className="text-sm text-zinc-200 leading-relaxed mb-3">{entry.content}</p>

                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {entry.tags.map((tag, i) => (
                        <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full ${tagColors[i % tagColors.length]}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 pt-2 border-t border-zinc-800/50">
                    {/* Favorite */}
                    <button
                      onClick={() => toggleFavorite(entry)}
                      className={`text-sm px-2 py-1 rounded transition-colors ${
                        entry.is_favorited ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                      title={entry.is_favorited ? 'Unstar' : 'Star'}
                    >
                      {entry.is_favorited ? '★' : '☆'}
                    </button>

                    {/* Connections */}
                    {entry.connections.length > 0 && (
                      <button
                        onClick={() => showConnections(entry)}
                        className="text-[11px] px-2 py-1 rounded text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      >
                        🔗 {entry.connections.length}
                      </button>
                    )}

                    {/* Convert */}
                    <div className="relative ml-auto">
                      <button
                        onClick={() => setConvertMenu(convertMenu === entry.id ? null : entry.id)}
                        className="text-[11px] px-2 py-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                      >
                        Convert ▾
                      </button>
                      {convertMenu === entry.id && (
                        <div className="absolute right-0 bottom-7 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden text-sm min-w-[120px]">
                          <button
                            onClick={() => convertTo(entry, 'task')}
                            className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-zinc-300"
                          >✅ Make task</button>
                          <button
                            onClick={() => convertTo(entry, 'plan')}
                            className="w-full text-left px-3 py-2 hover:bg-zinc-700 text-zinc-300"
                          >🎯 Make plan</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Connection panel */}
      {selectedForConnections && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedForConnections(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200">Connected thoughts</h2>
              <button onClick={() => setSelectedForConnections(null)} className="text-zinc-500 hover:text-zinc-300 text-lg">&times;</button>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-zinc-300">{selectedForConnections.content}</p>
            </div>
            {connectionEntries.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-4">No connections found.</p>
            ) : (
              <div className="space-y-2">
                {connectionEntries.map(c => (
                  <div key={c.id} className="border border-zinc-700/50 rounded-lg p-3">
                    <p className="text-sm text-zinc-300">{c.content}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 capitalize">{c.type}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close convert menu on outside click */}
      {convertMenu && <div className="fixed inset-0 z-0" onClick={() => setConvertMenu(null)} />}
    </div>
  );
}
