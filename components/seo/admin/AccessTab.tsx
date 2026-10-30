'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { listAccess, listLoginEvents } from '@/lib/seo/client';
import type { PortalAccess, PortalLoginEvent, SeoClient } from '@/lib/seo/types';
import { Banner, postJson } from './api';

const fmtDateTime = (ms: number) =>
  new Date(ms).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' });

function device(ua?: string): string {
  if (!ua) return 'unbekannt';
  const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'anderes Gerät';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return [os, browser].filter(Boolean).join(', ');
}

export default function AccessTab({ client }: { client: SeoClient }) {
  const [access, setAccess] = useState<PortalAccess[]>([]);
  const [events, setEvents] = useState<PortalLoginEvent[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, e] = await Promise.all([listAccess(client.customerId), listLoginEvents(client.customerId)]);
    setAccess(a.sort((x, y) => Number(y.active) - Number(x.active) || x.email.localeCompare(y.email)));
    setEvents(e);
  }, [client.customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: 'invite' | 'resend' | 'revoke', target: string, okText: string) => {
    setBusy(`${action}:${target}`);
    setMsg(null);
    try {
      await postJson('/api/seo/portal-access', { action, customerId: client.customerId, email: target });
      setMsg({ tone: 'success', text: okText });
      if (action === 'invite') setEmail('');
      await load();
    } catch (err) {
      setMsg({ tone: 'error', text: (err as Error).message });
    } finally {
      setBusy(null);
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      <form
        className="card space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          act('invite', email.trim(), `Einladung an ${email.trim()} verschickt.`);
        }}
      >
        <div>
          <label htmlFor="invite" className="font-semibold">
            Zum Portal einladen
          </label>
          <p className="text-sm text-gray-600">
            Die Adresse wird freigeschaltet und bekommt sofort eine Mail mit Anmelde-Link. Einloggen kann sich nur, wer hier steht.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="invite"
            type="email"
            required
            autoComplete="off"
            placeholder="inhaber@firma.de"
            className="input text-base sm:text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={!!busy}>
            {busy?.startsWith('invite') ? 'Sendet…' : 'Einladen'}
          </button>
        </div>
        {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      </form>

      <div className="card">
        <h3 className="mb-3 font-semibold">Zugänge</h3>
        {access.length === 0 ? (
          <p className="text-sm text-gray-600">Noch niemand eingeladen.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {access.map((a) => (
              <li key={a.email} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium break-all">{a.email}</span>
                    {a.active ? (
                      <span className="rounded-full bg-emerald-50 px-2 text-xs text-emerald-700">aktiv</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 text-xs text-gray-600">entzogen</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {a.lastLoginAt ? `Zuletzt angemeldet ${fmtDateTime(a.lastLoginAt.toMillis())}, ${a.loginCount ?? 0} Logins` : 'Noch nie angemeldet'}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {a.active ? (
                    <>
                      <button
                        className="btn-secondary px-2.5 py-1 text-xs"
                        disabled={!!busy}
                        onClick={() => act('resend', a.email, `Neuer Link an ${a.email} verschickt.`)}
                      >
                        Link senden
                      </button>
                      <button className="btn-secondary px-2.5 py-1 text-xs text-red-700" disabled={!!busy} onClick={() => setRevoking(a.email)}>
                        Zugang entziehen
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-secondary px-2.5 py-1 text-xs"
                      disabled={!!busy}
                      onClick={() => act('invite', a.email, `${a.email} wieder eingeladen.`)}
                    >
                      Wieder einladen
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 className="mb-1 font-semibold">Letzte Anmeldungen</h3>
        <p className="mb-3 text-xs text-gray-500">IP-Adressen gekürzt gespeichert, Einträge werden nach 90 Tagen gelöscht.</p>
        {events.length === 0 ? (
          <p className="text-sm text-gray-600">Noch keine Anmeldungen.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2">
                <span className="whitespace-nowrap tabular-nums">{fmtDateTime(e.at.toMillis())}</span>
                <span className="break-all">{e.email}</span>
                <span className="text-gray-500">
                  {device(e.userAgent)}
                  {e.ip ? `, ${e.ip}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!revoking} onClose={() => setRevoking(null)} title="Zugang entziehen?">
        <p className="text-sm text-gray-700">
          <strong>{revoking}</strong> wird sofort abgemeldet und kann sich nicht mehr anmelden. Du kannst die Adresse später wieder einladen.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setRevoking(null)}>
            Abbrechen
          </button>
          <button
            className="btn-primary bg-red-600 hover:bg-red-700"
            disabled={!!busy}
            onClick={() => revoking && act('revoke', revoking, `Zugang für ${revoking} entzogen.`)}
          >
            Zugang entziehen
          </button>
        </div>
      </Modal>
    </div>
  );
}
