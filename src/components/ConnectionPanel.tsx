'use client';

import { Entry } from '@/lib/types';

interface ConnectionPanelProps {
  entry: Entry;
  connections: Entry[];
  onClose: () => void;
}

export default function ConnectionPanel({ entry, connections, onClose }: ConnectionPanelProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-200">Connected Ideas</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg">&times;</button>
        </div>

        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-zinc-300">{entry.content}</p>
          <div className="flex gap-1.5 mt-2">
            {entry.tags.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">{t}</span>
            ))}
          </div>
        </div>

        {connections.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-4">No connections found.</p>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => (
              <div key={c.id} className="border border-zinc-700/50 rounded-lg p-3">
                <p className="text-sm text-zinc-300">{c.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-zinc-500 capitalize">{c.type}</span>
                  {c.tags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
