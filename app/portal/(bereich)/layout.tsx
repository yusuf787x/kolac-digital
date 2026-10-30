import Logo from '@/components/Logo';
import PortalNav from '@/components/seo/portal/PortalNav';
import { requirePortalSession } from '@/lib/portal/session';

export const dynamic = 'force-dynamic';

export default async function PortalBereichLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalSession();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 pt-3">
            <div className="flex min-w-0 items-center gap-3">
              <Logo width={120} height={30} priority />
              <span className="hidden h-5 w-px bg-gray-200 sm:block" aria-hidden />
              <span className="truncate text-sm font-medium text-gray-700">{session.client.displayName}</span>
            </div>
            <form action="/api/portal/logout" method="post">
              <button type="submit" className="whitespace-nowrap rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 pointer-coarse:py-2.5">
                Abmelden
              </button>
            </form>
          </div>
          <PortalNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-gray-500 sm:px-6">
        Angemeldet als {session.email} · Fragen?{' '}
        <a className="underline" href="mailto:yusuf@kolac-digital.de">
          yusuf@kolac-digital.de
        </a>{' '}
        ·{' '}
        <a className="underline" href="/datenschutz.html">
          Datenschutz
        </a>
      </footer>
    </>
  );
}
