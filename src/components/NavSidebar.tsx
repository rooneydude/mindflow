'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Stream', icon: '🌊' },
  { href: '/tasks', label: 'Tasks', icon: '✅' },
  { href: '/journal', label: 'Journal', icon: '📝' },
  { href: '/thoughts', label: 'Thoughts', icon: '💡' },
  { href: '/plans', label: 'Plans', icon: '🎯' },
];

export default function NavSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 lg:w-52 shrink-0 border-r border-zinc-800/50 min-h-screen flex flex-col">
      <div className="p-4 lg:px-5 border-b border-zinc-800/50">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🌊</span>
          <span className="hidden lg:block text-base font-semibold text-zinc-100 tracking-tight">MindFlow</span>
        </Link>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 mt-2">
        {navItems.map((item) => {
          const active = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
