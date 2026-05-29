'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import Modal from '@/components/ui/Modal';
import RichTextEditor from './RichTextEditor';
import { authedFetch } from '@/lib/api-client';
import { createActivity } from '@/lib/firestore';
import { replacePlaceholders } from '@/lib/sales';
import type { Customer, Deal, EmailTemplate } from '@/lib/types';

/** Klartext mit Zeilenumbrüchen -> simples HTML für den Editor. */
function plainToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\n/g, '<br/>');
}

interface Props {
  open: boolean;
  onClose: () => void;
  deal: Deal;
  customer: Customer | null;
  templates: EmailTemplate[];
  onSent: () => void;
}

export default function EmailComposerModal({
  open,
  onClose,
  deal,
  customer,
  templates,
  onSent,
}: Props) {
  const [to, setTo] = useState(customer?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Empfänger nachziehen, wenn der Kunde erst nach dem Mount geladen wurde.
  const [seededTo, setSeededTo] = useState(false);
  if (open && !seededTo && customer?.email && !to) {
    setTo(customer.email);
    setSeededTo(true);
  }

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const ctx = { customer, deal };
    setSubject(replacePlaceholders(tpl.subject, ctx));
    // Vorlagen sind Plaintext in Firestore – für den Rich-Editor umwandeln.
    setMessage(plainToHtml(replacePlaceholders(tpl.body, ctx)));
  };

  /** Nur sichtbarer Text – verhindert "leere" Nachrichten, die nur aus
   *  unsichtbaren HTML-Tags bestehen. */
  const hasContent = (html: string) =>
    html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!to.trim() || !subject.trim() || !hasContent(message)) {
      setError('Empfänger, Betreff und Nachricht sind Pflichtfelder.');
      return;
    }
    setSending(true);
    try {
      const res = await authedFetch('/api/email/deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: message }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'E-Mail konnte nicht gesendet werden.');
      }

      // Versand als Aktivität protokollieren.
      await createActivity({
        dealId: deal.id,
        type: 'email',
        description: `E-Mail an ${to.trim()} gesendet`,
        emailSubject: subject.trim(),
        emailBody: message,
        dueDate: null,
        completed: true,
        completedAt: Timestamp.now(),
      });

      setSubject('');
      setMessage('');
      setTemplateId('');
      onSent();
      onClose();
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="E-Mail senden"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSend} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Empfänger</label>
            <input
              className="input"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Vorlage laden</label>
            <select
              className="input"
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">— Keine Vorlage —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Betreff</label>
          <input
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Nachricht</label>
          <RichTextEditor
            value={message}
            onChange={setMessage}
            placeholder="Schreibe deine Nachricht… (Bilder kannst du direkt per Einfügen aus der Zwischenablage reinziehen)"
          />
        </div>

        <p className="text-xs text-gray-500">
          Absender: yusuf@kolac-digital.de · Signatur (mit Logo &amp; Foto) wird
          automatisch unten angehängt.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={sending}
          >
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sendet…' : '✉️ Senden'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
