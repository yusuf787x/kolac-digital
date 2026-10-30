'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from '@/components/dashboard/Sidebar';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import PrivacyToggle from '@/components/dashboard/PrivacyToggle';
import { PrivacyProvider } from '@/lib/privacy-context';
import { OWNER_EMAIL } from '@/lib/owner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  // Portal-Kunden haben ebenfalls Firebase-Konten. Die Daten schuetzen
  // Rules und authenticate(), hier wird nur verhindert, dass ein
  // fremdes Konto ueberhaupt die Admin-Oberflaeche zu sehen bekommt.
  const isOwner =
    !!user && user.email?.toLowerCase() === OWNER_EMAIL && user.emailVerified;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/dashboard/login');
    } else if (!isOwner) {
      signOut().finally(() => router.replace('/dashboard/login'));
    }
  }, [user, loading, isOwner, signOut, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Laden…</div>
      </div>
    );
  }

  if (!user || !isOwner) {
    return null;
  }

  return (
    <PrivacyProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        {/* dashboard-main haelt unten Platz fuer die Mobile-Leiste plus die
            Home-Indicator-Zone, damit der letzte Button einer Seite nie
            darunter verschwindet. Auf Desktop faellt der Abstand weg. */}
        <main className="md:pl-64 dashboard-main">
          <div className="sticky top-0 z-20 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm px-4 sm:px-6 lg:px-8 py-3">
            <div className="max-w-7xl mx-auto flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <GlobalSearch />
              </div>
              <PrivacyToggle />
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </PrivacyProvider>
  );
}
