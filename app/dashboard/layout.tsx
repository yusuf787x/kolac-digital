import { AuthProvider } from '@/lib/auth-context';

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
  return <AuthProvider>{children}</AuthProvider>;
}
