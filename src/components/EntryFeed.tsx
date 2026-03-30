'use client';

import { Entry } from '@/lib/types';
import EntryCard from './EntryCard';

interface EntryFeedProps {
  entries: Entry[];
  onToggleComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onShowConnections: (entry: Entry) => void;
}

export default function EntryFeed({ entries, onToggleComplete, onArchive, onShowConnections }: EntryFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-600 text-sm">No entries yet. Start typing above to capture your first thought.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onToggleComplete={onToggleComplete}
          onArchive={onArchive}
          onShowConnections={onShowConnections}
        />
      ))}
    </div>
  );
}
