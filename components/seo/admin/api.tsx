'use client';

import { authedFetch } from '@/lib/api-client';

/** POST an eine Admin-Route, wirft bei Fehlern mit der Meldung des Servers. */
export async function postJson<T = Record<string, unknown>>(url: string, body: unknown): Promise<T> {
  const res = await authedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
  return data as T;
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await authedFetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`);
  return data as T;
}

/** Oeffnet ein PDF aus einer geschuetzten Admin-Route in einem neuen Tab. */
export async function openPdf(url: string): Promise<void> {
  const win = window.open('', '_blank');
  const res = await authedFetch(url);
  if (!res.ok) {
    win?.close();
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'PDF konnte nicht geladen werden.');
  }
  const blobUrl = URL.createObjectURL(await res.blob());
  if (win) win.location.href = blobUrl;
  else window.location.href = blobUrl;
}

export function Banner({ tone, children }: { tone: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  const cls =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-blue-200 bg-blue-50 text-blue-900';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}
