import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Kundenbereich | Kolac Digital',
  description: 'Ihr persönlicher Kundenbereich bei Kolac Digital.',
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Kundenportal. Laedt bewusst keine externen Dienste (keine Fonts von
 * Dritten, kein Firebase-JS, keine Analyse). Login und Daten laufen
 * vollstaendig serverseitig, siehe lib/portal/.
 */
export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-gray-50 text-gray-900">{children}</div>;
}
