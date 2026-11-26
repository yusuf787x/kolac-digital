import localFont from 'next/font/local';
import { AuthProvider } from '@/lib/auth-context';
import './dashboard.css';

/** Geist, lokal im Projekt (kein Abruf bei Google), nur im Dashboard geladen. */
const geist = localFont({
  src: './schriften/geist-variable.woff2',
  display: 'swap',
  weight: '100 900',
  variable: '--font-geist',
});

/**
 * Firebase-Auth im Browser gibt es nur im Admin-Bereich. Marketing-Seiten
 * und das Kundenportal (/portal, serverseitige Session) laden das
 * Auth-SDK dadurch gar nicht erst.
 */
export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`dash ${geist.variable}`}>
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
