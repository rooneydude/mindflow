'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/tasks', label: 'Tasks', icon: '✅' },
  { href: '/journal', label: 'Journal', icon: '📝' },
  { href: '/habits', label: 'Habits', icon: '🔥' },
  { href: '/insights', label: 'More', icon: '📊' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {items.map(item => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-lg transition-colors ${
              active ? 'text-indigo-400' : 'text-zinc-500'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[9px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
