import { cookies } from 'next/headers';
import Link from 'next/link';
import AuthCard, { Notice } from '@/components/seo/portal/AuthCard';
import { sha256 } from '@/lib/portal/access';
import { inspectLink } from '@/lib/portal/login';
import { NONCE_COOKIE } from '@/lib/portal/session';

export const dynamic = 'force-dynamic';

const REASONS = {
  expired: 'Dieser Link ist abgelaufen. Er gilt eine Stunde.',
  used: 'Dieser Link wurde schon benutzt. Jeder Link funktioniert nur einmal.',
  invalid: 'Dieser Link ist ungültig.',
} as const;

/**
 * Landeseite des Magic Links. Der Link wird hier nur angesehen, nicht
 * verbraucht: eingeloest wird erst per Knopf (POST), damit Mail-Scanner
 * ihn nicht vorab entwerten. Auf einem anderen Geraet als dem, auf dem
 * der Link angefordert wurde, fragen wir die E-Mail-Adresse ab.
 */
export default async function PortalAnmeldenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  const code = q.code ?? '';
  const nonce = (await cookies()).get(NONCE_COOKIE)?.value;
  const state = await inspectLink(code, nonce ? sha256(nonce) : null);

  if (!state.ok) {
    return (
      <AuthCard title="Link nicht mehr gültig">
        <Notice tone="error">{REASONS[state.reason]}</Notice>
        <Link href="/portal/login" className="btn-primary w-full h-11 text-base">
          Neuen Link anfordern
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Anmelden">
      {q.fehler === 'adresse' && (
        <Notice tone="error">
          Diese Adresse passt nicht zum Link. Bitte nutzen Sie die Adresse, an die die Mail ging.
        </Notice>
      )}
      <form action="/api/portal/login-complete" method="post" className="space-y-4">
        <input type="hidden" name="code" value={code} />
        {state.sameDevice ? (
          <p className="text-sm text-gray-600 leading-relaxed">Ein Klick, und Sie sind angemeldet.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 leading-relaxed">
              Sie öffnen den Link auf einem anderen Gerät. Bitte bestätigen Sie zur Sicherheit Ihre E-Mail-Adresse.
            </p>
            <div>
              <label htmlFor="email" className="label">
                E-Mail-Adresse
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                enterKeyHint="go"
                required
                autoFocus
                className="input text-base sm:text-sm h-11"
              />
            </div>
          </>
        )}
        <button type="submit" className="btn-primary w-full h-11 text-base">
          Jetzt anmelden
        </button>
      </form>
    </AuthCard>
  );
}
