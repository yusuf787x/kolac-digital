'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  listCustomers,
  listDeals,
  listExpenses,
  listEmailTemplates,
  listInvoices,
  listQuotes,
} from '@/lib/firestore';
import type {
  Customer,
  Deal,
  EmailTemplate,
  Expense,
  Invoice,
  Quote,
} from '@/lib/types';
import { stageDef } from '@/lib/sales';
import { formatEUR, formatDateDE } from '@/lib/utils';

type Group =
  | 'Kunden'
  | 'Deals'
  | 'Angebote'
  | 'Rechnungen'
  | 'Ausgaben'
  | 'Vorlagen';

interface SearchResult {
  id: string;
  group: Group;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
}

interface Indexed {
  result: SearchResult;
  haystack: string;
}

const GROUP_ORDER: Group[] = [
  'Kunden',
  'Deals',
  'Angebote',
  'Rechnungen',
  'Ausgaben',
  'Vorlagen',
];

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState<Indexed[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [customers, deals, quotes, invoices, expenses, templates] =
        await Promise.all([
          listCustomers(),
          listDeals(),
          listQuotes(),
          listInvoices(),
          listExpenses(),
          listEmailTemplates(),
        ]);
      setIndex(
        buildIndex({ customers, deals, quotes, invoices, expenses, templates }),
      );
      setLoaded(true);
    } catch (err) {
      console.error('GlobalSearch load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery('');
    setSelected(0);
    // Daten bei jedem Öffnen frisch laden, damit neue Einträge auftauchen.
    loadData();
  }, [loadData]);

  // Globaler Shortcut ⌘K / Strg+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            setQuery('');
            setSelected(0);
            loadData();
          }
          return !v;
        });
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loadData]);

  // Fokus + Body-Scroll-Lock, solange offen
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as SearchResult[];
    const terms = q.split(/\s+/);
    return index
      .filter((e) => terms.every((t) => e.haystack.includes(t)))
      .slice(0, 40)
      .map((e) => e.result);
  }, [index, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const go = useCallback(
    (r: SearchResult) => {
      setOpen(false);
      router.push(r.href);
    },
    [router],
  );

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[selected];
      if (r) go(r);
    }
  };

  // Ausgewähltes Element ins Sichtfeld scrollen
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${selected}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected, open]);

  return (
    <>
      {/* Trigger-Leiste */}
      <button
        type="button"
        onClick={openPalette}
        className="flex w-full max-w-md items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
      >
        <span className="text-base">🔍</span>
        <span className="flex-1 text-left">
          Suchen – Kunden, Deals, Rechnungen…
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-400">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 px-4">
              <span className="text-base text-gray-400">🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onListKeyDown}
                placeholder="Suche nach allem…"
                className="w-full py-3.5 text-sm outline-none placeholder-gray-400"
              />
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                aria-label="Schließen"
              >
                ×
              </button>
            </div>

            <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
              {!query.trim() ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  {loading && !loaded
                    ? 'Lädt Daten…'
                    : 'Tippe, um Kunden, Deals, Rechnungen, Angebote, Ausgaben und Vorlagen zu durchsuchen.'}
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  {loading ? 'Lädt…' : 'Keine Treffer.'}
                </p>
              ) : (
                <GroupedResults
                  results={results}
                  selected={selected}
                  onHover={setSelected}
                  onSelect={go}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GroupedResults({
  results,
  selected,
  onHover,
  onSelect,
}: {
  results: SearchResult[];
  selected: number;
  onHover: (i: number) => void;
  onSelect: (r: SearchResult) => void;
}) {
  // Flache Liste in Gruppenreihenfolge -> globaler Index für Tastatur-Nav
  let flatIdx = -1;
  return (
    <>
      {GROUP_ORDER.map((group) => {
        const items = results.filter((r) => r.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group} className="mb-1">
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              {group}
            </p>
            {items.map((r) => {
              flatIdx += 1;
              const idx = flatIdx;
              const active = idx === selected;
              return (
                <button
                  key={r.id}
                  data-idx={idx}
                  onMouseEnter={() => onHover(idx)}
                  onClick={() => onSelect(r)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left ${
                    active ? 'bg-brand-blue/10' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-base">{r.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {r.title}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {r.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ===================================================================
// Index-Aufbau
// ===================================================================

function buildIndex(data: {
  customers: Customer[];
  deals: Deal[];
  quotes: Quote[];
  invoices: Invoice[];
  expenses: Expense[];
  templates: EmailTemplate[];
}): Indexed[] {
  const { customers, deals, quotes, invoices, expenses, templates } = data;
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const nameOf = (id: string) => {
    const c = customerMap.get(id);
    if (!c) return 'Unbekannter Kunde';
    return (
      c.company || `${c.firstName} ${c.lastName}`.trim() || c.email || 'Kunde'
    );
  };

  const out: Indexed[] = [];
  const add = (result: SearchResult, extra: (string | undefined)[]) => {
    out.push({
      result,
      haystack: [result.title, result.subtitle, ...extra]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    });
  };

  customers.forEach((c) => {
    const title =
      c.company || `${c.firstName} ${c.lastName}`.trim() || c.email || 'Kunde';
    const subtitle =
      [`${c.firstName} ${c.lastName}`.trim(), c.city, c.email]
        .filter(Boolean)
        .join(' · ') || '—';
    add(
      {
        id: `c-${c.id}`,
        group: 'Kunden',
        icon: '👥',
        title,
        subtitle,
        href: `/dashboard/kunden/${c.id}`,
      },
      [c.phone, c.email, c.firstName, c.lastName, c.city, c.taxId],
    );
  });

  deals.forEach((d) => {
    add(
      {
        id: `d-${d.id}`,
        group: 'Deals',
        icon: '🔄',
        title: d.title || 'Deal',
        subtitle: `${nameOf(d.customerId)} · ${stageDef(d.stage).label}${
          d.value != null ? ` · ${formatEUR(d.value)}` : ''
        }`,
        href: `/dashboard/vertrieb/${d.id}`,
      },
      [nameOf(d.customerId), d.notes, stageDef(d.stage).label],
    );
  });

  quotes.forEach((q) => {
    add(
      {
        id: `q-${q.id}`,
        group: 'Angebote',
        icon: '📋',
        title: `${q.quoteNumber} · ${nameOf(q.customerId)}`,
        subtitle: `${formatDateDE(q.quoteDate.toDate())} · ${formatEUR(q.totalAmount)}`,
        href: `/dashboard/angebote/${q.id}`,
      },
      [nameOf(q.customerId), q.quoteNumber],
    );
  });

  invoices.forEach((inv) => {
    add(
      {
        id: `i-${inv.id}`,
        group: 'Rechnungen',
        icon: '📄',
        title: `${inv.invoiceNumber ?? 'Entwurf'} · ${nameOf(inv.customerId)}`,
        subtitle: `${formatDateDE(inv.invoiceDate.toDate())} · ${formatEUR(inv.totalAmount)}`,
        href: `/dashboard/rechnungen/${inv.id}`,
      },
      [nameOf(inv.customerId), inv.invoiceNumber ?? 'entwurf'],
    );
  });

  expenses.forEach((e) => {
    add(
      {
        id: `e-${e.id}`,
        group: 'Ausgaben',
        icon: '💸',
        title: e.description || e.supplier || 'Ausgabe',
        subtitle: `${e.supplier ? `${e.supplier} · ` : ''}${e.category} · ${formatEUR(e.amount)}`,
        href: `/dashboard/ausgaben`,
      },
      [e.supplier, e.category],
    );
  });

  templates.forEach((t) => {
    add(
      {
        id: `t-${t.id}`,
        group: 'Vorlagen',
        icon: '✉️',
        title: t.name,
        subtitle: t.subject,
        href: `/dashboard/vertrieb/vorlagen`,
      },
      [t.subject, t.body],
    );
  });

  return out;
}
