'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS: { href: string; label: string }[] = [
  { href: '/', label: 'Menu' },
  { href: '/history', label: 'History' },
];

export default function SiteNav() {
  const pathname = usePathname();

  // Keep the full screen for an in-progress session.
  // (pathname keeps the trailing slash under trailingSlash: true.)
  if (pathname.startsWith('/exercise/') && pathname.includes('/session')) return null;

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 font-mono text-sm">
        <Link href="/" className="font-semibold text-slate-100 hover:text-sky-400">
          Vision Therapy
        </Link>
        <div className="flex gap-4">
          {LINKS.map(({ href, label }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={
                  active ? 'text-sky-400' : 'text-slate-400 hover:text-slate-100'
                }
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
