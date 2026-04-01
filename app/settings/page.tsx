'use client';

export default function SettingsPage() {
  const download = async (format: string) => {
    const res = await fetch(`/api/export?format=${format}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || `mindflow-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">Settings</h1>

        <div className="border border-zinc-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-zinc-200 mb-1">Export Data</h2>
          <p className="text-xs text-zinc-500 mb-4">Download all your entries including archived ones. Nothing is ever deleted.</p>
          <div className="flex gap-3">
            <button
              onClick={() => download('json')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg transition-colors"
            >
              Download JSON
            </button>
            <button
              onClick={() => download('csv')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg transition-colors"
            >
              Download CSV
            </button>
            <button
              onClick={() => download('markdown')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-lg transition-colors"
            >
              Download Markdown
            </button>
          </div>
        </div>

        <div className="border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-200 mb-1">About MindFlow</h2>
          <p className="text-xs text-zinc-500">AI-powered journal, planner, and task manager. Entries are never deleted — only archived.</p>
        </div>
      </div>
    </div>
  );
}
