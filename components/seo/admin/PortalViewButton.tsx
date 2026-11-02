'use client';

import { useState } from 'react';
import { openPortalAsClient } from './api';

/**
 * Oeffnet das echte Kundenportal als dieser Kunde. Ohne month die
 * Startseite wie beim Kunden, mit month genau diesen Monat (bei einem
 * Entwurf mit Hinweis, dass der Kunde ihn noch nicht sieht).
 */
export default function PortalViewButton({ customerId, month }: { customerId: string; month?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      await openPortalAsClient(customerId, month);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className="btn-secondary" disabled={busy} onClick={open}>
        {busy ? 'Öffnet…' : 'Portal als Kunde öffnen'}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
