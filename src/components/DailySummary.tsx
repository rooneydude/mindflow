'use client';

import { DailySummary as DailySummaryType } from '@/lib/types';

interface DailySummaryProps {
  summary: DailySummaryType | null;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function DailySummary({ summary, onGenerate, isGenerating }: DailySummaryProps) {
  if (!summary) {
    return (
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full border border-dashed border-zinc-700 rounded-lg p-4 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
      >
        {isGenerating ? 'Generating daily summary...' : 'Generate today\'s summary'}
      </button>
    );
  }

  return (
    <div className="border border-zinc-700/50 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">🌅</span>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Today&apos;s Summary</h3>
        {summary.mood && (
          <span className="ml-auto text-[11px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
            {summary.mood}
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed">{summary.summary}</p>
    </div>
  );
}
