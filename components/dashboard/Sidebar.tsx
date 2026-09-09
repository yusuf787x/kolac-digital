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
  /** Kurzform fuer die schmale Bottom-Nav. */
  shortLabel?: string;
  icon: string;
  group: 'Allgemein' | 'Vertrieb' | 'Buchhaltung' | 'Marketing' | 'System';
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', group: 'Allgemein' },
  { href: '/dashboard/aufgaben', label: 'Aufgaben', icon: '✅', group: 'Allgemein' },
  { href: '/dashboard/kunden', label: 'Kunden', icon: '👥', group: 'Allgemein' },
  { href: '/dashboard/vertrieb', label: 'Vertrieb', icon: '🔄', group: 'Vertrieb' },
  { href: '/dashboard/vertrieb/leads', label: 'Leads', icon: '🎯', group: 'Vertrieb' },
  {
    href: '/dashboard/vertrieb/leads/pilot',
    label: 'Salespilot',
    icon: '🚀',
    group: 'Vertrieb',
  },
  { href: '/dashboard/vertrieb/skript', label: 'Skript', icon: '📝', group: 'Vertrieb' },
  {
    href: '/dashboard/vertrieb/call-log/auswertung',
    label: 'Call-Auswertung',
    shortLabel: 'Calls',
    icon: '📞',
    group: 'Vertrieb',
  },
  { href: '/dashboard/angebote', label: 'Angebote', icon: '📋', group: 'Buchhaltung' },
  { href: '/dashboard/vertraege', label: 'Verträge', icon: '✍️', group: 'Buchhaltung' },
  { href: '/dashboard/rechnungen', label: 'Rechnungen', icon: '📄', group: 'Buchhaltung' },
  { href: '/dashboard/ausgaben', label: 'Ausgaben', icon: '💸', group: 'Buchhaltung' },
  { href: '/dashboard/berichte', label: 'Berichte', icon: '📈', group: 'Buchhaltung' },
  { href: '/dashboard/blog', label: 'Blog', icon: '✍️', group: 'Marketing' },
  {
    href: '/dashboard/einstellungen',
    label: 'Einstellungen',
    shortLabel: 'Optionen',
    icon: '⚙️',
    group: 'System',
  },
];

/**
 * Die vier Eintraege, die auf dem Handy dauerhaft in der unteren Leiste
 * stehen. Alles andere liegt hinter dem Mehr-Button, damit die Leiste
 * einreihig bleibt und nichts verrutscht.
 */
const MOBILE_PRIMARY = [
  '/dashboard',
  '/dashboard/aufgaben',
  '/dashboard/rechnungen',
  '/dashboard/kunden',
];

const GROUP_ORDER: NavItem['group'][] = [
  'Allgemein',
  'Vertrieb',
  'Buchhaltung',
  'Marketing',
  'System',
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueActivityCount, setOverdueActivityCount] = useState(0);
  const [overdueContractCount, setOverdueContractCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Menue beim Navigieren schliessen.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Solange das Menue offen ist, den Hintergrund nicht mitscrollen lassen.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

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

  const primaryItems = MOBILE_PRIMARY.map(
    (href) => NAV_ITEMS.find((i) => i.href === href)!,
  ).filter(Boolean);

  // Summe aller Badges, die nicht in der Hauptleiste sichtbar sind.
  const hiddenBadgeTotal = NAV_ITEMS.filter(
    (i) => !MOBILE_PRIMARY.includes(i.href),
  ).reduce((sum, i) => sum + badgeFor(i.href), 0);

  // Aktiver Eintrag liegt hinter dem Mehr-Button?
  const moreIsActive = !MOBILE_PRIMARY.some((href) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href),
  );

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

      {/* Mobile: Vollbild-Menue hinter dem Mehr-Button */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-200 ${
          menuOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        role="dialog"
        aria-label="Alle Bereiche"
        aria-hidden={!menuOpen}
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">
            Alle Bereiche
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Menü schließen"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          className="overflow-y-auto overscroll-contain px-3 py-3"
          style={{
            maxHeight: 'calc(85vh - 8rem)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {GROUP_ORDER.map((group) => {
            const items = NAV_ITEMS.filter((i) => i.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-4 last:mb-0">
                <p className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {group}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => {
                    const active = isActive(item.href);
                    const badge = badgeFor(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium min-h-[52px] ${
                          active
                            ? 'bg-brand-blue text-white'
                            : 'bg-gray-50 text-gray-800 active:bg-gray-100'
                        }`}
                      >
                        <span className="text-lg shrink-0">{item.icon}</span>
                        <span className="truncate flex-1">{item.label}</span>
                        {badge > 0 && (
                          <span
                            className={`shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold ${
                              active
                                ? 'bg-white text-brand-blue'
                                : 'bg-red-500 text-white'
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {user && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="px-2 text-xs text-gray-500">Eingeloggt als</p>
              <p className="px-2 text-sm text-gray-900 truncate mb-2">
                {user.email}
              </p>
              <button
                onClick={() => signOut()}
                className="w-full px-3 py-3 rounded-xl text-sm font-medium text-red-600 bg-red-50 active:bg-red-100 min-h-[48px]"
              >
                Abmelden
              </button>
            </div>
          )}
        </div>

        {/* Platzhalter fuer die Home-Indicator-Zone auf dem iPhone */}
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>

      {/* Mobile Bottom Nav: immer einreihig, 4 feste Eintraege + Mehr */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5">
          {primaryItems.map((item) => {
            const active = isActive(item.href);
            const badge = badgeFor(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] relative ${
                  active ? 'text-brand-blue' : 'text-gray-600'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="truncate max-w-full px-1">
                  {item.shortLabel ?? item.label}
                </span>
                {badge > 0 && (
                  <span className="absolute top-1 right-[22%] inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}

          <button
            onClick={() => setMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] relative ${
              moreIsActive ? 'text-brand-blue' : 'text-gray-600'
            }`}
            aria-label="Alle Bereiche öffnen"
            aria-expanded={menuOpen}
          >
            <span className="text-lg leading-none">☰</span>
            <span>Mehr</span>
            {hiddenBadgeTotal > 0 && (
              <span className="absolute top-1 right-[22%] inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                {hiddenBadgeTotal}
              </span>
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
