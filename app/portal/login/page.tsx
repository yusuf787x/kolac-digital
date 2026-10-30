import { redirect } from 'next/navigation';
import AuthCard, { Notice } from '@/components/seo/portal/AuthCard';
import { getPortalSession } from '@/lib/portal/session';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  adresse: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  'zu-viele': 'Zu viele Versuche. Bitte warten Sie eine Stunde und versuchen Sie es dann erneut.',
  abgelaufen: 'Dieser Link ist abgelaufen. Er gilt eine Stunde. Fordern Sie einfach einen neuen an.',
  benutzt: 'Dieser Link wurde schon benutzt. Jeder Link funktioniert nur einmal. Fordern Sie einfach einen neuen an.',
  link: 'Dieser Link ist ungültig. Fordern Sie einfach einen neuen an.',
  zugang: 'Für diese Adresse ist der Kundenbereich nicht freigeschaltet. Bitte sprechen Sie uns an.',
  technik: 'Die Anmeldung hat gerade nicht geklappt. Bitte fordern Sie einen neuen Link an.',
};

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (await getPortalSession()) redirect('/portal');
  const q = await searchParams;
  const error = q.fehler ? (ERRORS[q.fehler] ?? ERRORS.link) : null;

  return (
    <AuthCard title="Kundenbereich">
      {q.gesendet ? (
        <>
          <Notice tone="success">
            Wenn Ihre Adresse freigeschaltet ist, erhalten Sie in Kürze eine E-Mail mit einem Anmelde-Link.
          </Notice>
          <p className="text-sm text-gray-600 leading-relaxed">
            Der Link ist eine Stunde gültig. Bitte schauen Sie auch im Spam-Ordner nach. Keine Mail bekommen? Dann
            fordern Sie unten einfach einen neuen Link an.
          </p>
          <hr className="my-6 border-gray-200" />
        </>
      ) : (
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Geben Sie Ihre E-Mail-Adresse ein. Wir schicken Ihnen einen Link, mit dem Sie sich ohne Passwort anmelden.
        </p>
      )}
      {q.abgemeldet && !q.gesendet && <Notice tone="info">Sie wurden abgemeldet.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <form action="/api/portal/login-request" method="post" className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            E-Mail-Adresse
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            enterKeyHint="send"
            required
            className="input text-base sm:text-sm h-11"
            placeholder="name@firma.de"
          />
        </div>
        <button type="submit" className="btn-primary w-full h-11 text-base">
          Anmelde-Link schicken
        </button>
      </form>
    </AuthCard>
  );
}
