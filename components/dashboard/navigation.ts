// Die Seitenleiste als Baum (Vorbild: wagenpuls, components/shell/navigation.ts).
// Ein Bereich, darunter die Wege, die man täglich geht. Aufgeklappt ist der
// Bereich, in dem man gerade ist; die anderen klappen per Pfeil auf.
import type { LucideIcon } from 'lucide-react';
import {
  FileSignature,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  SquareCheckBig,
  Users,
  Wallet,
} from 'lucide-react';

export type Unterpunkt = {
  href: string;
  label: string;
  /** Nur exakter Treffer zählt als aktiv (z. B. „Alle Rechnungen“ neben „/rechnungen/mahnwesen“). */
  exakt?: boolean;
};

export type Bereich = {
  key: string;
  href: string;
  label: string;
  /** Kurzform für die untere Leiste am Handy. */
  kurz?: string;
  icon: LucideIcon;
  /** Weitere Pfade, die zu diesem Bereich gehören (z. B. /termine unter Vertrieb). */
  auch?: string[];
  unterpunkte?: Unterpunkt[];
};

export const NAVIGATION: Bereich[] = [
  { key: 'ueberblick', href: '/dashboard', label: 'Überblick', icon: LayoutDashboard },
  { key: 'aufgaben', href: '/dashboard/aufgaben', label: 'Aufgaben', icon: SquareCheckBig },
  {
    key: 'kunden',
    href: '/dashboard/kunden',
    label: 'Kontakte & Kunden',
    kurz: 'Kunden',
    icon: Users,
    unterpunkte: [
      { href: '/dashboard/kunden/leads', label: 'SEO-Leads' },
      { href: '/dashboard/kunden', label: 'Alle Kontakte', exakt: true },
      { href: '/dashboard/kunden/neu', label: 'Neuer Kontakt' },
    ],
  },
  {
    key: 'vertrieb',
    href: '/dashboard/vertrieb',
    label: 'Vertrieb',
    icon: Handshake,
    auch: ['/dashboard/termine'],
    unterpunkte: [
      { href: '/dashboard/vertrieb', label: 'Pipeline', exakt: true },
      { href: '/dashboard/vertrieb/deals', label: 'Deals' },
      { href: '/dashboard/vertrieb/outreach', label: 'Outreach' },
      { href: '/dashboard/termine', label: 'Termine' },
      { href: '/dashboard/vertrieb/vorlagen', label: 'Mail-Vorlagen' },
    ],
  },
  {
    key: 'angebote',
    href: '/dashboard/angebote',
    label: 'Angebote & Verträge',
    kurz: 'Angebote',
    icon: FileSignature,
    auch: ['/dashboard/vertraege'],
    unterpunkte: [
      { href: '/dashboard/angebote', label: 'Angebote' },
      { href: '/dashboard/vertraege', label: 'Verträge' },
    ],
  },
  {
    key: 'rechnungen',
    href: '/dashboard/rechnungen',
    label: 'Rechnungen',
    icon: Receipt,
    unterpunkte: [
      { href: '/dashboard/rechnungen', label: 'Alle Rechnungen', exakt: true },
      { href: '/dashboard/rechnungen/mahnwesen', label: 'Mahnwesen' },
      { href: '/dashboard/rechnungen/gocardless', label: 'Lastschrift' },
    ],
  },
  {
    key: 'buchhaltung',
    href: '/dashboard/ausgaben',
    label: 'Buchhaltung',
    icon: Wallet,
    auch: ['/dashboard/fahrten', '/dashboard/berichte'],
    unterpunkte: [
      { href: '/dashboard/ausgaben', label: 'Ausgaben' },
      { href: '/dashboard/fahrten', label: 'Fahrten' },
      { href: '/dashboard/berichte', label: 'Berichte', exakt: true },
      { href: '/dashboard/berichte/ustva', label: 'Umsatzsteuer' },
    ],
  },
  {
    key: 'marketing',
    href: '/dashboard/seo',
    label: 'Marketing',
    icon: Megaphone,
    auch: ['/dashboard/blog'],
    unterpunkte: [
      { href: '/dashboard/seo', label: 'SEO-Kunden', exakt: true },
      { href: '/dashboard/seo/aufgaben', label: 'SEO-Aufgaben' },
      { href: '/dashboard/blog', label: 'Blog', exakt: true },
      { href: '/dashboard/blog/statistik', label: 'Blog-Statistik' },
    ],
  },
  {
    key: 'einstellungen',
    href: '/dashboard/einstellungen',
    label: 'Einstellungen',
    kurz: 'Optionen',
    icon: Settings,
    unterpunkte: [
      { href: '/dashboard/einstellungen', label: 'Allgemein', exakt: true },
      { href: '/dashboard/einstellungen/mails', label: 'E-Mails' },
    ],
  },
];

/** Die vier Bereiche in der unteren Leiste am Handy, der Rest liegt hinter „Mehr“. */
export const MOBIL_HAUPT = ['ueberblick', 'aufgaben', 'kunden', 'rechnungen'];

const startsWithPath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Bereich zum aktuellen Pfad (längster Treffer gewinnt, „/dashboard“ nur exakt). */
export function bereichFuer(pathname: string): Bereich | undefined {
  let best: { b: Bereich; len: number } | undefined;
  for (const b of NAVIGATION) {
    const paths = [b.href, ...(b.auch ?? []), ...(b.unterpunkte ?? []).map((u) => u.href)];
    for (const p of paths) {
      const hit = p === '/dashboard' ? pathname === '/dashboard' : startsWithPath(pathname, p);
      if (hit && (!best || p.length > best.len)) best = { b, len: p.length };
    }
  }
  return best?.b;
}

export function unterpunktAktiv(pathname: string, u: Unterpunkt, geschwister: Unterpunkt[]): boolean {
  if (u.exakt) {
    // Exakt, außer für Detailseiten, die keinem anderen Unterpunkt gehören (z. B. /kunden/abc).
    if (pathname === u.href) return true;
    if (!startsWithPath(pathname, u.href)) return false;
    return !geschwister.some((g) => g !== u && startsWithPath(pathname, g.href));
  }
  return startsWithPath(pathname, u.href);
}
