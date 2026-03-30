'use client';

import { useState, useRef, useEffect } from 'react';

interface StreamInputProps {
  onSubmit: (content: string) => void;
  isProcessing: boolean;
}

export default function StreamInput({ onSubmit, isProcessing }: StreamInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        const active = document.activeElement;
        if (active?.tagName !== 'TEXTAREA' && active?.tagName !== 'INPUT') {
          e.preventDefault();
          textareaRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed || isProcessing) return;
    onSubmit(trimmed);
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  return (
    <div className="relative">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-1 focus-within:border-zinc-500 transition-colors">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="What's on your mind? Type anything..."
          className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 resize-none p-3 pb-2 text-base leading-relaxed focus:outline-none min-h-[52px] max-h-[200px]"
          rows={1}
          disabled={isProcessing}
          autoFocus
        />
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-xs text-zinc-600">
            Press <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400 text-[10px]">/ </kbd> to focus &middot;{' '}
            <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-400 text-[10px]">⌘+Enter</kbd> to save
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isProcessing}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Thinking...
              </span>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
