'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  listInvoices,
  listOpenActivities,
  listContracts,
} from '@/lib/firestore';
import { tsToMillis } from '@/lib/utils';
import { isOverdue } from '@/lib/utils';
import type { Contract } from '@/lib/types';
import Logo from '@/components/Logo';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badgeCount?: number;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/aufgaben', label: 'Aufgaben', icon: '✅' },
  { href: '/dashboard/kunden', label: 'Kunden', icon: '👥' },
  { href: '/dashboard/vertrieb', label: 'Vertrieb', icon: '🔄' },
  { href: '/dashboard/angebote', label: 'Angebote', icon: '📋' },
  { href: '/dashboard/vertraege', label: 'Verträge', icon: '✍️' },
  { href: '/dashboard/rechnungen', label: 'Rechnungen', icon: '📄' },
  { href: '/dashboard/ausgaben', label: 'Ausgaben', icon: '💸' },
  { href: '/dashboard/berichte', label: 'Berichte', icon: '📈' },
  { href: '/dashboard/einstellungen', label: 'Einstellungen', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueActivityCount, setOverdueActivityCount] = useState(0);
  const [overdueContractCount, setOverdueContractCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    listInvoices()
      .then((invoices) => {
        const count = invoices.filter(
          (inv) =>
            inv.status !== 'paid' &&
            inv.status !== 'partially_paid' &&
            isOverdue(inv.status, inv.dueDate.toDate()),
        ).length;
        setOverdueCount(count);
      })
      .catch(() => setOverdueCount(0));

    listOpenActivities()
      .then((acts) => {
        const now = Date.now();
        const count = acts.filter(
          (a) => a.dueDate && a.dueDate.toMillis() < now,
        ).length;
        setOverdueActivityCount(count);
      })
      .catch(() => setOverdueActivityCount(0));

    listContracts()
      .then((contracts: Contract[]) => {
        const now = Date.now();
        const count = contracts.filter((c) => {
          if (c.status !== 'sent') return false;
          if (!c.reminderEnabled) return false;
          const sent = tsToMillis(c.sentAt);
          if (!sent) return false;
          const due = sent + c.reminderDays * 24 * 60 * 60 * 1000;
          return now > due;
        }).length;
        setOverdueContractCount(count);
      })
      .catch(() => setOverdueContractCount(0));
  }, [user, pathname]);

  /** Badge-Zahl für einen Menüpunkt (0 = kein Badge). */
  const badgeFor = (href: string): number => {
    if (href === '/dashboard/rechnungen') return overdueCount;
    if (href === '/dashboard/vertrieb') return overdueActivityCount;
    if (href === '/dashboard/vertraege') return overdueContractCount;
    return 0;
  };

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 md:border-r md:border-gray-200 md:bg-white md:z-30">
        <div className="px-6 py-6 border-b border-gray-100">
          <Link href="/dashboard" className="block">
            <Logo width={160} height={40} priority />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const badge = badgeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-blue text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </span>
                {badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="px-3 py-4 border-t border-gray-100">
            <div className="px-3 py-2 mb-2">
              <p className="text-xs text-gray-500">Eingeloggt als</p>
              <p className="text-sm text-gray-900 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Abmelden
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
        <div className="grid grid-cols-10">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const badge = badgeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 text-xs relative ${
                  active ? 'text-brand-blue' : 'text-gray-600'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="truncate max-w-full px-1">{item.label}</span>
                {badge > 0 && (
                  <span className="absolute top-1 right-2 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
