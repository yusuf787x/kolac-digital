'use client';

import { useState } from 'react';

interface Props {
  /** Wird beim Versand als "Quelle" im Mail-Body gesetzt. */
  source?: string;
}

export default function ContactForm({ source = 'Webseiten Landingpage' }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          message,
          source,
          website,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Versand fehlgeschlagen.');
      }
      setStatus('success');
      setName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-2xl">🎉</p>
        <p className="mt-2 text-base font-semibold text-green-900">
          Danke. Deine Anfrage ist bei mir.
        </p>
        <p className="mt-1 text-sm text-green-800">
          Ich melde mich innerhalb von 24 Stunden bei dir. Wenn es eilt, ruf
          gerne direkt an unter +49 176 95762018.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cf-name">
            Dein Name
          </label>
          <input
            id="cf-name"
            className="input"
            placeholder="Max Mustermann"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="cf-phone">
            Telefon
          </label>
          <input
            id="cf-phone"
            className="input"
            type="tel"
            placeholder="0151 ..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="cf-email">
          E Mail
        </label>
        <input
          id="cf-email"
          className="input"
          type="email"
          placeholder="du@firma.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <p className="mt-1 text-xs text-gray-500">
          Eine der beiden Angaben reicht. Mit Telefon geht es am schnellsten.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="cf-message">
          Worum geht es kurz?
        </label>
        <textarea
          id="cf-message"
          className="input"
          rows={4}
          placeholder="Zum Beispiel: Ich brauche eine neue Webseite für meine Werkstatt in Bielefeld."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {/* Honeypot: nur für Bots sichtbar */}
      <div className="hidden" aria-hidden="true">
        <label>
          Webseite (nicht ausfüllen)
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        {status === 'sending' ? 'Wird gesendet …' : 'Jetzt anfragen'}
      </button>

      <p className="text-center text-xs text-gray-500">
        Kostenlos und unverbindlich. Wir verkaufen dir nichts was du nicht
        brauchst.
      </p>
    </form>
  );
}
