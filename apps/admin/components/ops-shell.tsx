'use client';

import {
  Briefcase,
  CalendarPlus,
  ClipboardCheck,
  Map,
  Menu,
  MoreHorizontal,
  Package,
  Tag,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '../hooks/use-admin-session';
import { adminPublicEnv } from '../lib/env-banner';

const NAV = [
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/catalog', label: 'Catalog', icon: Tag },
  { href: '/people', label: 'People', icon: Users },
  { href: '/payments', label: 'Payments', icon: Wallet },
  { href: '/book', label: 'Book', icon: CalendarPlus },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dispatch', label: 'Dispatch', icon: Map },
  { href: '/closeout', label: 'Closeout', icon: ClipboardCheck },
  { href: '/more', label: 'More', icon: MoreHorizontal },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/inventory') return pathname === '/' || pathname.startsWith('/inventory');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OpsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      event.preventDefault();
      const search = document.querySelector<HTMLInputElement>('[data-ops-search]');
      search?.focus();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const name = profile?.full_name?.trim() || 'Admin';
  const title = NAV.find((item) => isActive(pathname, item.href))?.label ?? 'Ops';
  const env = adminPublicEnv();
  const showStaging = env !== 'production';

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-text">
      {showStaging ? (
        <div
          className="bg-warning-soft px-4 py-1 text-center text-xs font-bold text-warning"
          role="status"
        >
          STAGING
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <input id="ops-nav" type="checkbox" className="peer hidden" />
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col border-r border-border bg-surface peer-checked:flex md:flex">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/inventory" className="text-sm font-bold tracking-tight text-brand-strong">
              CARATOM Ops
            </Link>
            <label htmlFor="ops-nav" className="cursor-pointer md:hidden" aria-label="Close menu">
              <X size={18} />
            </label>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2" aria-label="Desk">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
                    active ? 'bg-brand-soft text-brand-strong' : 'text-text hover:bg-subtle'
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-h-full flex-1 flex-col md:pl-[220px]">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
            <label htmlFor="ops-nav" className="cursor-pointer md:hidden" aria-label="Open menu">
              <Menu size={20} />
            </label>
            <p className="flex-1 text-base font-bold text-strong">{title}</p>
            <p className="text-sm font-semibold text-text">{name}</p>
            <button
              type="button"
              className="text-xs font-semibold text-muted hover:text-brand-strong"
              onClick={() => {
                void signOut().then(() => router.replace('/login'));
              }}
            >
              Sign out
            </button>
          </header>
          <div className="px-4 pt-3 md:hidden">
            <p className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand-strong">Use desktop for ops</p>
          </div>
          <main className="flex-1 scroll-mt-16 px-4 py-5 md:px-6">{children}</main>
          {env === 'production' ? (
            <footer className="px-4 py-3 text-xs text-muted md:px-6">Production</footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}
