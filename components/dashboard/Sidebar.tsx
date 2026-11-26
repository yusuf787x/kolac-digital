'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Ellipsis, LogOut, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { listContracts, listInvoices, listOpenActivities } from '@/lib/firestore';
import { isOverdue, tsToMillis } from '@/lib/utils';
import type { Contract } from '@/lib/types';
import Logo from '@/components/Logo';
import { MOBIL_HAUPT, NAVIGATION, bereichFuer, unterpunktAktiv, type Bereich } from './navigation';

type Zaehler = Partial<Record<string, number>>;

/**
 * Überfällige Rechnungen, Aufgaben und Verträge als rote Zähler.
 * Einmal beim Start und wenn der Tab wieder sichtbar wird (höchstens alle
 * 2 Minuten). Früher lud die Leiste bei jedem Seitenwechsel alles neu.
 */
function useZaehler(aktiv: boolean): Zaehler {
  const [zaehler, setZaehler] = useState<Zaehler>({});
  const zuletzt = useRef(0);

  const laden = useCallback(async () => {
    if (Date.now() - zuletzt.current < 2 * 60 * 1000) return;
    zuletzt.current = Date.now();
    const now = Date.now();
    const [invoices, acts, contracts] = await Promise.all([
      listInvoices().catch(() => []),
      listOpenActivities().catch(() => []),
      listContracts().catch(() => [] as Contract[]),
    ]);
    setZaehler({
      rechnungen: invoices.filter(
        (inv) => inv.status !== 'paid' && inv.status !== 'partially_paid' && isOverdue(inv.status, inv.dueDate.toDate()),
      ).length,
      vertrieb: acts.filter((a) => a.dueDate && a.dueDate.toMillis() < now).length,
      angebote: contracts.filter((c) => {
        if (c.status !== 'sent' || !c.reminderEnabled) return false;
        const sent = tsToMillis(c.sentAt);
        return !!sent && now > sent + c.reminderDays * 24 * 60 * 60 * 1000;
      }).length,
    });
  }, []);

  useEffect(() => {
    if (!aktiv) return;
    laden();
    const onVisible = () => document.visibilityState === 'visible' && laden();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [aktiv, laden]);

  return zaehler;
}

function Zahl({ n, className = '' }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span
      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold leading-none text-white tabular-nums ${className}`}
    >
      {n > 99 ? '99+' : n}
    </span>
  );
}

function initialen(email?: string | null): string {
  const name = (email ?? '').split('@')[0] ?? '';
  const parts = name.split(/[._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? 'K') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const zaehler = useZaehler(!!user);
  const aktuell = bereichFuer(pathname);
  const [offen, setOffen] = useState<Set<string>>(() => new Set(aktuell ? [aktuell.key] : []));
  const [mehr, setMehr] = useState(false);
  const [letzterBereich, setLetzterBereich] = useState(aktuell?.key);

  // Beim Wechsel in einen anderen Bereich diesen aufklappen und das Menü am Handy schließen.
  if (aktuell?.key !== letzterBereich) {
    setLetzterBereich(aktuell?.key);
    setMehr(false);
    if (aktuell && !offen.has(aktuell.key)) setOffen(new Set([...offen, aktuell.key]));
  }

  useEffect(() => {
    document.body.style.overflow = mehr ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mehr]);

  const umschalten = (key: string) =>
    setOffen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const mobilHaupt = MOBIL_HAUPT.map((k) => NAVIGATION.find((b) => b.key === k)!).filter(Boolean);
  const mehrAktiv = !!aktuell && !MOBIL_HAUPT.includes(aktuell.key);
  const mehrZaehler = NAVIGATION.filter((b) => !MOBIL_HAUPT.includes(b.key)).reduce((s, b) => s + (zaehler[b.key] ?? 0), 0);

  return (
    <>
      {/* Desktop: Seitenleiste auf dem Grund, aktiver Bereich als weiße Kapsel */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-[248px] md:flex-col" aria-label="Hauptnavigation">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link href="/dashboard" className="block" aria-label="Zum Überblick">
            <Logo width={132} height={33} priority />
          </Link>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
          <ul className="space-y-0.5">
            {NAVIGATION.map((b) => (
              <BereichZeile
                key={b.key}
                b={b}
                pathname={pathname}
                aktiv={aktuell?.key === b.key}
                aufgeklappt={offen.has(b.key)}
                onUmschalten={() => umschalten(b.key)}
                zahl={zaehler[b.key]}
              />
            ))}
          </ul>
        </nav>

        {user && (
          <div className="shrink-0 px-3 pb-3 pt-2">
            <div className="flex items-center gap-3 rounded-[10px] px-2 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--k-brand)] text-xs font-semibold text-white shadow-[var(--k-shadow-knopf)]">
                {initialen(user.email)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">Kolac Digital</span>
                <span className="block truncate text-xs text-gray-500">{user.email}</span>
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-gray-500 hover:bg-white/70 hover:text-gray-900"
                title="Abmelden"
              >
                <LogOut size={16} strokeWidth={1.75} aria-hidden />
                <span className="sr-only">Abmelden</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Handy: alle Bereiche hinter „Mehr“ */}
      {mehr && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMehr(false)} aria-hidden="true" />}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] bg-white shadow-[var(--k-shadow-overlay)] transition-transform duration-300 md:hidden ${
          mehr ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
        style={{ maxHeight: '85vh', transitionTimingFunction: 'var(--k-ease-feder)' }}
        role="dialog"
        aria-label="Alle Bereiche"
        aria-hidden={!mehr}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <span className="text-[15px] font-semibold text-gray-900">Alle Bereiche</span>
          <button
            type="button"
            onClick={() => setMehr(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Menü schließen"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-3 pb-3" style={{ maxHeight: 'calc(85vh - 7.5rem)' }}>
          <ul className="space-y-1">
            {NAVIGATION.map((b) => {
              const Icon = b.icon;
              const aktiv = aktuell?.key === b.key;
              return (
                <li key={b.key} className="rounded-[14px] bg-gray-50 p-1.5">
                  <Link
                    href={b.href}
                    className={`flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium ${aktiv ? 'bg-white text-gray-900 shadow-[var(--k-shadow-knopf)]' : 'text-gray-800'}`}
                  >
                    <Icon size={18} strokeWidth={aktiv ? 1.9 : 1.6} className={aktiv ? 'text-[var(--k-brand)]' : 'text-gray-500'} aria-hidden />
                    <span className="flex-1 truncate">{b.label}</span>
                    <Zahl n={zaehler[b.key]} />
                  </Link>
                  {b.unterpunkte && b.unterpunkte.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 px-2 pb-1 pt-1.5">
                      {b.unterpunkte.map((u) => (
                        <Link
                          key={u.href}
                          href={u.href}
                          className={`rounded-full border px-3 py-1.5 text-[13px] ${
                            unterpunktAktiv(pathname, u, b.unterpunkte!)
                              ? 'border-[var(--k-brand-line)] bg-[var(--k-brand-tint)] font-medium text-[var(--k-brand-dunkel)]'
                              : 'border-gray-200 bg-white text-gray-700'
                          }`}
                        >
                          {u.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {user && (
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] border border-gray-200 text-[15px] font-medium text-red-700"
            >
              <LogOut size={16} strokeWidth={1.75} aria-hidden /> Abmelden
            </button>
          )}
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>

      {/* Handy: schwebende Leiste unten (wie wagenpuls) */}
      <nav
        className="fixed inset-x-3 z-30 rounded-[22px] border border-gray-200/80 bg-white/90 shadow-[var(--k-shadow-schwebend)] backdrop-blur-xl md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
        aria-label="Schnellnavigation"
      >
        <div className="flex h-[60px] items-center px-1.5">
          {mobilHaupt.map((b) => {
            const Icon = b.icon;
            const aktiv = aktuell?.key === b.key;
            return (
              <Link
                key={b.key}
                href={b.href}
                className={`relative flex h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] text-[11px] font-medium ${
                  aktiv ? 'bg-[var(--k-brand-tint)] text-[var(--k-brand-dunkel)]' : 'text-gray-600'
                }`}
              >
                <span className="relative">
                  <Icon size={20} strokeWidth={aktiv ? 1.9 : 1.6} aria-hidden />
                  <Zahl n={zaehler[b.key]} className="absolute -right-2.5 -top-1.5" />
                </span>
                <span className="max-w-full truncate px-1">{b.kurz ?? b.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMehr(true)}
            className={`relative flex h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] text-[11px] font-medium ${
              mehrAktiv ? 'bg-[var(--k-brand-tint)] text-[var(--k-brand-dunkel)]' : 'text-gray-600'
            }`}
            aria-label="Alle Bereiche öffnen"
            aria-expanded={mehr}
          >
            <span className="relative">
              <Ellipsis size={20} strokeWidth={1.75} aria-hidden />
              <Zahl n={mehrZaehler} className="absolute -right-2.5 -top-1.5" />
            </span>
            <span>Mehr</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function BereichZeile({
  b,
  pathname,
  aktiv,
  aufgeklappt,
  onUmschalten,
  zahl,
}: {
  b: Bereich;
  pathname: string;
  aktiv: boolean;
  aufgeklappt: boolean;
  onUmschalten: () => void;
  zahl?: number;
}) {
  const Icon = b.icon;
  const hatUnter = (b.unterpunkte?.length ?? 0) > 1;
  return (
    <li>
      <div
        data-aktiv={aktiv}
        className={`dash-nav-link flex h-10 items-center rounded-[10px] text-sm ${aktiv ? 'font-medium text-gray-900' : 'text-gray-700'}`}
      >
        <Link href={b.href} className="flex h-full min-w-0 flex-1 items-center gap-3 px-2.5" aria-current={aktiv ? 'page' : undefined}>
          <Icon size={18} strokeWidth={aktiv ? 1.9 : 1.6} className={aktiv ? 'text-[var(--k-brand)]' : 'text-gray-500'} aria-hidden />
          <span className="truncate">{b.label}</span>
          <Zahl n={zahl} className="ml-auto" />
        </Link>
        {hatUnter && (
          <button
            type="button"
            onClick={onUmschalten}
            className="flex h-full w-8 shrink-0 items-center justify-center text-gray-400 hover:text-gray-700"
            aria-label={aufgeklappt ? `${b.label} zuklappen` : `${b.label} aufklappen`}
            aria-expanded={aufgeklappt}
          >
            <ChevronDown size={15} strokeWidth={1.75} className={`transition-transform duration-150 ${aufgeklappt ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {hatUnter && aufgeklappt && (
        <ul className="ml-[21px] my-1 space-y-0.5 border-l border-gray-300/70 pl-2">
          {b.unterpunkte!.map((u) => {
            const on = unterpunktAktiv(pathname, u, b.unterpunkte!);
            return (
              <li key={u.href}>
                <Link
                  href={u.href}
                  className={`flex h-8 items-center rounded-[8px] px-2.5 text-[13.5px] transition-colors ${
                    on ? 'bg-white/80 font-medium text-gray-900' : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'
                  }`}
                  aria-current={on ? 'page' : undefined}
                >
                  <span className="truncate">{u.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
