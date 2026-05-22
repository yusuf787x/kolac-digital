'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  seedEmailTemplates,
  updateEmailTemplate,
} from '@/lib/firestore';
import { TEMPLATE_PLACEHOLDERS } from '@/lib/sales';
import type { EmailTemplate } from '@/lib/types';

export default function VorlagenPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    listEmailTemplates()
      .then(setTemplates)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const n = await seedEmailTemplates();
      if (n === 0)
        alert('Es existieren bereits Vorlagen – keine Seed-Daten angelegt.');
      load();
    } catch (err) {
      console.error(err);
      alert('Seed fehlgeschlagen.');
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (t: EmailTemplate) => {
    if (!window.confirm(`Vorlage "${t.name}" löschen?`)) return;
    try {
      await deleteEmailTemplate(t.id);
      load();
    } catch (err) {
      console.error(err);
      alert('Löschen fehlgeschlagen.');
    }
  };

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setModalOpen(true);
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/vertrieb"
            className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block"
          >
            ← Zum Board
          </Link>
          <h1 className="text-3xl font-semibold text-gray-900">
            E-Mail-Vorlagen
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {templates.length}{' '}
            {templates.length === 1 ? 'Vorlage' : 'Vorlagen'}
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <button
              onClick={handleSeed}
              className="btn-secondary"
              disabled={seeding}
            >
              {seeding ? 'Lädt…' : 'Standard-Vorlagen anlegen'}
            </button>
          )}
          <button onClick={openNew} className="btn-primary">
            + Neue Vorlage
          </button>
        </div>
      </header>

      <div className="card mb-6 bg-gray-50">
        <p className="text-sm font-medium text-gray-700 mb-2">
          Verfügbare Platzhalter
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
          {TEMPLATE_PLACEHOLDERS.map((p) => (
            <span key={p.token}>
              <code className="text-brand-blue">{p.token}</code> – {p.description}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card text-sm text-gray-500">Lädt…</div>
      ) : templates.length === 0 ? (
        <div className="card text-sm text-gray-500">
          Noch keine Vorlagen. Lege Standard-Vorlagen an oder erstelle eine
          neue.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {t.name}
                  </p>
                  <p className="text-sm text-gray-700 mt-0.5">{t.subject}</p>
                  <p className="text-xs text-gray-500 mt-2 whitespace-pre-line line-clamp-3">
                    {t.body}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button
                    onClick={() => openEdit(t)}
                    className="text-sm text-brand-blue hover:underline"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        template={editing}
        onSaved={() => load()}
      />
    </div>
  );
}

function TemplateModal({
  open,
  onClose,
  template,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  template: EmailTemplate | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Felder beim Öffnen mit der gewählten Vorlage befüllen.
  const [boundId, setBoundId] = useState<string | null>(null);
  if (open && boundId !== (template?.id ?? '__new__')) {
    setBoundId(template?.id ?? '__new__');
    setName(template?.name ?? '');
    setSubject(template?.subject ?? '');
    setBody(template?.body ?? '');
    setError(null);
  }
  if (!open && boundId !== null) setBoundId(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError('Name, Betreff und Text sind Pflichtfelder.');
      return;
    }
    setSaving(true);
    try {
      if (template) {
        await updateEmailTemplate(template.id, {
          name: name.trim(),
          subject: subject.trim(),
          body,
        });
      } else {
        await createEmailTemplate({
          name: name.trim(),
          subject: subject.trim(),
          body,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Erstansprache"
          />
        </div>
        <div>
          <label className="label">Betreff</label>
          <input
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Digitale Sichtbarkeit für {{firma}}"
          />
        </div>
        <div>
          <label className="label">Nachrichtentext</label>
          <textarea
            className="input font-mono text-[13px]"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={saving}
          >
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
