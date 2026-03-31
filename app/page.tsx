'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import StreamInput from '@/components/StreamInput';
import EntryFeed from '@/components/EntryFeed';
import Sidebar from '@/components/Sidebar';
import ConnectionPanel from '@/components/ConnectionPanel';
import DailySummaryComponent from '@/components/DailySummary';
import { Entry, EntryType, DailySummary } from '@/lib/types';

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<EntryType | 'all'>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [connectionEntries, setConnectionEntries] = useState<Entry[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeFilter !== 'all') params.set('type', activeFilter);
    if (activeTag) params.set('tag', activeTag);

    const res = await fetch(`/api/entries?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data);
    }
  }, [activeFilter, activeTag]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    fetch('/api/summary')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setDailySummary(data); });
  }, []);

  const handleSubmit = async (content: string) => {
    setIsProcessing(true);
    try {
      // Step 1: AI analysis
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const analysis = await analyzeRes.json();

      // Step 2: Save entry with AI metadata
      const saveRes = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          type: analysis.type,
          tags: analysis.tags,
          embedding_summary: analysis.summary,
          priority: analysis.priority,
          connections: analysis.connections,
          due_date: analysis.due_date || null,
          project: analysis.project || null,
          mood: analysis.mood || null,
        }),
      });

      if (saveRes.ok) {
        const newEntry = await saveRes.json();
        setEntries((prev) => [newEntry, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save entry:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleComplete = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    const newStatus = entry.status === 'completed' ? 'active' : 'completed';
    const res = await fetch('/api/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });

    if (res.ok) {
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
  };

  const handleArchive = async (id: string) => {
    const res = await fetch('/api/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_archived: true }),
    });

    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleShowConnections = async (entry: Entry) => {
    if (entry.connections.length === 0) return;
    setSelectedEntry(entry);

    const res = await fetch(`/api/connections?ids=${entry.connections.join(',')}`);
    if (res.ok) {
      const data = await res.json();
      setConnectionEntries(data);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/summary', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDailySummary(data);
      }
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const entryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entries.length };
    for (const entry of entries) {
      counts[entry.type] = (counts[entry.type] || 0) + 1;
    }
    return counts;
  }, [entries]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [entries]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌊</span>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">MindFlow</h1>
          </div>
          <span className="text-xs text-zinc-600">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Input */}
        <div className="mb-6">
          <StreamInput onSubmit={handleSubmit} isProcessing={isProcessing} />
        </div>

        {/* Daily Summary */}
        <div className="mb-6">
          <DailySummaryComponent
            summary={dailySummary}
            onGenerate={handleGenerateSummary}
            isGenerating={isGeneratingSummary}
          />
        </div>

        {/* Content area */}
        <div className="flex flex-col lg:flex-row gap-6">
          <Sidebar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            entryCounts={entryCounts}
            allTags={allTags}
            activeTag={activeTag}
            onTagClick={setActiveTag}
          />

          <div className="flex-1 min-w-0">
            <EntryFeed
              entries={entries}
              onToggleComplete={handleToggleComplete}
              onArchive={handleArchive}
              onShowConnections={handleShowConnections}
            />
          </div>
        </div>
      </main>

      {/* Connection Panel Modal */}
      {selectedEntry && (
        <ConnectionPanel
          entry={selectedEntry}
          connections={connectionEntries}
          onClose={() => {
            setSelectedEntry(null);
            setConnectionEntries([]);
          }}
        />
      )}
    </div>
  );
}
