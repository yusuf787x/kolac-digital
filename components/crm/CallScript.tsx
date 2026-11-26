'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Check, Copy, Phone } from 'lucide-react';
import { createActivity, listCustomers, updateActivity, updateCustomer } from '@/lib/firestore';
import type { CallStatus, Customer } from '@/lib/types';
import { CALL_STATUS_LABELS, callQueueSort, inCallQueue, type PublicSeoCheck } from '@/lib/crm';
import { BRANCHENPROFILE, baueLeitfaden } from '@/lib/crm-scripts';
import { FUNNEL_MEETING_URL } from '@/lib/seo-check/funnel';

interface Props {
  customer: Customer;
  vorname?: string;
  check?: PublicSeoCheck;
  domain: string;
  /** Offene Anruf-Aufgaben dieser Akte, werden beim Ergebnis erledigt. */
  openTaskIds: string[];
  onLogged: () => void;
}

const morgen10 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
};

/** Leitfaden für den Anruf bei einem SEO-Lead plus Ergebnis mit einem Klick. */
export default function CallScript({ customer, vorname, check, domain, openTaskIds, onLogged }: Props) {
  const router = useRouter();
  const [branche, setBranche] = useState(customer.branche ?? 'andere');
  const [notiz, setNotiz] = useState('');
  const [spaeterAm, setSpaeterAm] = useState('');
  const [saving, setSaving] = useState<CallStatus | null>(null);
  const [fertig, setFertig] = useState<string | null>(null);
  const [kopiert, setKopiert] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Offen, solange der Lead in der Anruf-Liste ist; bleibt nach dem Speichern offen (für „Nächster Lead“).
  const [offen, setOffen] = useState(() => inCallQueue(customer));

  const l = useMemo(() => baueLeitfaden({ customer, vorname, check, branche, domain }), [customer, vorname, check, branche, domain]);
  const versuche = customer.callAttempts ?? 0;

  const kopieren = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setKopiert(key);
    setTimeout(() => setKopiert(null), 1500);
  };

  const ergebnis = async (status: CallStatus) => {
    if (status === 'spaeter' && !spaeterAm) {
      setError('Wann sollst du anrufen? Datum und Uhrzeit wählen.');
      return;
    }
    setSaving(status);
    setError(null);
    const now = Timestamp.now();
    const versuch = versuche + 1;
    const text = {
      neu: '',
      'nicht-erreicht': `Nicht erreicht (Versuch ${versuch})`,
      spaeter: `Erreicht, Rückruf verabredet am ${new Date(spaeterAm).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}`,
      termin: 'Erreicht, Termin gelegt',
      'kein-interesse': 'Erreicht, kein Interesse',
      bearbeitet: '',
    }[status];
    try {
      await createActivity({
        customerId: customer.id,
        type: 'anruf',
        description: notiz.trim() ? `${text}. ${notiz.trim()}` : text,
        emailSubject: null,
        emailBody: null,
        dueDate: null,
        completed: true,
        completedAt: now,
      });
      await Promise.all(openTaskIds.map((id) => updateActivity(id, { completed: true, completedAt: now })));

      const stage = ({ termin: 'termin', 'nicht-erreicht': 'kontaktiert', spaeter: 'gesprochen', 'kein-interesse': 'verloren' } as const)[status as 'termin'];
      const patch: Parameters<typeof updateCustomer>[1] = { callStatus: status, callAttempts: versuch, branche, ...(stage ? { leadStage: stage } : {}) };
      if (status === 'nicht-erreicht') {
        const next = morgen10();
        patch.nextStep = versuch >= 3 ? 'Letzter Versuch, danach Mail oder WhatsApp schicken' : `Nochmal anrufen (Versuch ${versuch + 1})`;
        patch.nextStepAt = Timestamp.fromDate(next);
        await createActivity({
          customerId: customer.id,
          type: 'anruf',
          description: patch.nextStep,
          emailSubject: null,
          emailBody: null,
          dueDate: Timestamp.fromDate(next),
          completed: false,
          completedAt: null,
        });
      } else if (status === 'spaeter') {
        const at = new Date(spaeterAm);
        patch.nextStep = 'Anrufen, wie verabredet';
        patch.nextStepAt = Timestamp.fromDate(at);
        await createActivity({
          customerId: customer.id,
          type: 'anruf',
          description: 'Anrufen, wie verabredet',
          emailSubject: null,
          emailBody: null,
          dueDate: Timestamp.fromDate(at),
          completed: false,
          completedAt: null,
        });
      } else if (status === 'termin') {
        patch.lifecycle = 'interessent';
        patch.nextStep = 'Termin vorbereiten: Bericht und Karte ansehen';
        patch.nextStepAt = null;
      } else if (status === 'kein-interesse') {
        patch.lifecycle = 'verloren';
        patch.nextStep = '';
        patch.nextStepAt = null;
      }
      await updateCustomer(customer.id, patch);
      setNotiz('');
      setFertig(text);
      onLogged();
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setSaving(null);
    }
  };

  const naechster = async () => {
    const alle = await listCustomers();
    const queue = alle.filter((c) => c.id !== customer.id && inCallQueue(c)).sort(callQueueSort);
    if (queue[0]) router.push(`/dashboard/kunden/${queue[0].id}`);
    else router.push('/dashboard/kunden?filter=anrufen');
  };

  return (
    <details className="card p-0 group" open={offen} onToggle={(e) => setOffen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-4 sm:px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--k-brand-tint)] text-[var(--k-brand)]">
          <Phone size={16} strokeWidth={1.9} aria-hidden />
        </span>
        <span className="text-base font-semibold text-gray-900">Anruf-Leitfaden</span>
        <span className="text-xs text-gray-500">
          Ziel: Termin legen · {CALL_STATUS_LABELS[customer.callStatus ?? 'neu']}
          {versuche ? ` · ${versuche} Versuch${versuche === 1 ? '' : 'e'}` : ''}
        </span>
        {customer.phone && (
          <a
            href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            className="btn-primary ml-auto text-sm"
          >
            {customer.phone} anrufen
          </a>
        )}
      </summary>

      <div className="border-t border-gray-100 px-4 pb-5 pt-4 sm:px-5 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-gray-500" htmlFor="cs-branche">
            Branche
          </label>
          <select id="cs-branche" className="input w-auto py-1.5 text-sm" value={branche} onChange={(e) => setBranche(e.target.value)}>
            {BRANCHENPROFILE.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
          {!customer.phone && <span className="text-xs text-amber-700">Keine Nummer in der Akte: auf der Website nachsehen.</span>}
        </div>

        {l.tipp && <p className="rounded-[10px] bg-[var(--k-brand-tint)] px-3 py-2 text-sm text-[var(--k-brand-dunkel)]">{l.tipp}</p>}

        <ol className="space-y-4">
          {l.abschnitte.map((a, i) => (
            <li key={a.titel} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">{i + 1}</span>
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm font-semibold text-gray-900">{a.titel}</p>
                {a.zeilen.map((z, j) => (
                  <p key={j} className="text-[15px] leading-relaxed text-gray-800">
                    „{z}“
                  </p>
                ))}
                {a.hinweis && <p className="text-xs text-gray-500">{a.hinweis}</p>}
              </div>
            </li>
          ))}
        </ol>

        <details className="rounded-[12px] border border-gray-200">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium text-gray-900">Einwände und Antworten ({l.einwaende.length})</summary>
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {l.einwaende.map((e) => (
              <li key={e.frage} className="px-3 py-2.5">
                <p className="text-sm font-medium text-gray-900">{e.frage}</p>
                <p className="mt-0.5 text-sm text-gray-700">„{e.antwort}“</p>
              </li>
            ))}
          </ul>
        </details>

        <div className="grid gap-2 sm:grid-cols-3">
          <KopierKnopf label="Mailbox-Text" aktiv={kopiert === 'mailbox'} onClick={() => kopieren('mailbox', l.mailbox)} />
          {l.whatsapp && <KopierKnopf label="WhatsApp nach Fehlversuch" aktiv={kopiert === 'wa'} onClick={() => kopieren('wa', l.whatsapp!)} />}
          {l.mail && <KopierKnopf label="Mail nach Fehlversuch" aktiv={kopiert === 'mail'} onClick={() => kopieren('mail', `Betreff: ${l.mail!.betreff}\n\n${l.mail!.text}`)} />}
        </div>

        <div className="rounded-[14px] bg-gray-50 p-3 sm:p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Ergebnis des Anrufs</p>
          <textarea
            className="input"
            rows={2}
            placeholder="Notiz: was wurde gesagt, Antworten auf die Fragen, Zahlen"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            aria-label="Notiz zum Anruf"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-primary" disabled={!!saving} onClick={() => ergebnis('termin')}>
              {saving === 'termin' ? 'Speichert…' : 'Termin gelegt'}
            </button>
            <button type="button" className="btn-secondary" disabled={!!saving} onClick={() => ergebnis('nicht-erreicht')}>
              {saving === 'nicht-erreicht' ? 'Speichert…' : 'Nicht erreicht'}
            </button>
            <span className="inline-flex items-center gap-1.5">
              <input
                type="datetime-local"
                className="input w-auto py-1.5 text-sm"
                value={spaeterAm}
                onChange={(e) => setSpaeterAm(e.target.value)}
                aria-label="Rückruf am"
              />
              <button type="button" className="btn-secondary" disabled={!!saving} onClick={() => ergebnis('spaeter')}>
                {saving === 'spaeter' ? 'Speichert…' : 'Später anrufen'}
              </button>
            </span>
            <button type="button" className="ml-auto text-sm text-gray-500 hover:text-red-700" disabled={!!saving} onClick={() => ergebnis('kein-interesse')}>
              Kein Interesse
            </button>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          {fertig && (
            <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2">
              <span className="text-sm text-emerald-900">✓ Gespeichert: {fertig}</span>
              {fertig.includes('Termin') && (
                <a href={FUNNEL_MEETING_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-900 underline">
                  Termin im Kalender eintragen
                </a>
              )}
              <button type="button" onClick={naechster} className="btn-primary ml-auto text-sm">
                Nächster Lead →
              </button>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

function KopierKnopf({ label, aktiv, onClick }: { label: string; aktiv: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-secondary justify-start gap-2 text-sm">
      {aktiv ? <Check size={15} className="text-emerald-600" aria-hidden /> : <Copy size={15} className="text-gray-500" aria-hidden />}
      {aktiv ? 'Kopiert' : label}
    </button>
  );
}
