'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, FilePlus, Plus, Receipt, UserPlus, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/dashboard/Sidebar';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import PrivacyToggle from '@/components/dashboard/PrivacyToggle';
import { bereichFuer } from '@/components/dashboard/navigation';
import { PrivacyProvider } from '@/lib/privacy-context';
import { OWNER_EMAIL } from '@/lib/owner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Portal-Kunden haben ebenfalls Firebase-Konten. Die Daten schuetzen
  // Rules und authenticate(), hier wird nur verhindert, dass ein
  // fremdes Konto ueberhaupt die Admin-Oberflaeche zu sehen bekommt.
  const isOwner = !!user && user.email?.toLowerCase() === OWNER_EMAIL;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/dashboard/login');
    } else if (!isOwner) {
      sessionStorage.setItem('kd_login_hinweis', 'Dieses Konto hat keinen Zugriff auf das Dashboard.');
      signOut().finally(() => router.replace('/dashboard/login'));
    }
  }, [user, loading, isOwner, signOut, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Laden…</div>
      </div>
    );
  }

  if (!user || !isOwner) {
    return null;
  }

  const bereich = bereichFuer(pathname);

  return (
    <PrivacyProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className="md:pl-[248px]">
          {/* Kopfzeile: Bereich links, Suche, „Neu“ und Datenschutz-Schalter rechts */}
          <header className="sticky top-0 z-20 bg-[var(--k-canvas)]/85 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-2 px-4 md:h-16 md:gap-3 md:px-6">
              {/* Am Handy fehlt die Seitenleiste: dort sagt die Kopfzeile, wo man ist. */}
              <span className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-gray-900 md:hidden">
                {bereich?.label ?? 'Dashboard'}
              </span>
              <div className="ml-auto shrink-0 md:ml-0 md:mr-auto">
                <GlobalSearch />
              </div>
              <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                <NeuMenu />
                <PrivacyToggle />
              </div>
            </div>
          </header>
          {/* dashboard-main haelt unten Platz fuer die schwebende Leiste am Handy. */}
          <main className="dashboard-main">
            <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-2 md:px-6 md:pt-3">{children}</div>
          </main>
        </div>
      </div>
    </PrivacyProvider>
  );
}

const NEU = [
  { href: '/dashboard/kunden/neu', label: 'Kontakt', icon: UserPlus },
  { href: '/dashboard/angebote/neu', label: 'Angebot', icon: FilePlus },
  { href: '/dashboard/rechnungen/neu', label: 'Rechnung', icon: Receipt },
  { href: '/dashboard/ausgaben/neu', label: 'Ausgabe', icon: Wallet },
];

/** Schnell etwas anlegen, egal auf welcher Seite man ist. */
function NeuMenu() {
  const [offen, setOffen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [pfad, setPfad] = useState(pathname);
  if (pfad !== pathname) {
    setPfad(pathname);
    setOffen(false);
  }

  useEffect(() => {
    if (!offen) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOffen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOffen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [offen]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--k-brand)] pl-3 pr-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),var(--k-shadow-knopf)] hover:bg-[var(--k-brand-dunkel)] md:pr-2.5"
        aria-haspopup="menu"
        aria-expanded={offen}
      >
        <Plus size={16} strokeWidth={2} aria-hidden />
        <span className="hidden sm:inline">Neu</span>
        <ChevronDown size={14} strokeWidth={2} className="hidden md:block opacity-80" aria-hidden />
        <span className="sr-only sm:hidden">Neu anlegen</span>
      </button>
      {offen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-52 rounded-[14px] border border-gray-200 bg-white p-1.5 shadow-[var(--k-shadow-overlay)]"
        >
          {NEU.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              className="flex h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-sm text-gray-800 hover:bg-gray-50"
            >
              <Icon size={16} strokeWidth={1.75} className="text-gray-500" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
