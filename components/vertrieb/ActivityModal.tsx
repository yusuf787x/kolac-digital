'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import Modal from '@/components/ui/Modal';
import { createActivity } from '@/lib/firestore';
import { ACTIVITY_TYPES } from '@/lib/sales';
import type { ActivityType } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  dealId: string;
  /** Vorausgewählter Typ (z.B. "anruf" bei Quick-Add). */
  presetType?: ActivityType;
  onSaved: () => void;
}

function nowLocalInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function ActivityModal({
  open,
  onClose,
  dealId,
  presetType,
  onSaved,
}: Props) {
  const [type, setType] = useState<ActivityType>(presetType ?? 'anruf');
  const [description, setDescription] = useState('');
  const [when, setWhen] = useState(nowLocalInput());
  const [dueDate, setDueDate] = useState('');
  const [completed, setCompleted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // presetType ändert sich, wenn das Modal für einen anderen Quick-Button
  // erneut geöffnet wird.
  const [lastPreset, setLastPreset] = useState(presetType);
  if (open && presetType !== lastPreset) {
    setLastPreset(presetType);
    if (presetType) setType(presetType);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!description.trim()) {
      setError('Bitte eine Beschreibung angeben.');
      return;
    }
    setSaving(true);
    try {
      await createActivity({
        dealId,
        type,
        description: description.trim(),
        emailSubject: null,
        emailBody: null,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        completed,
        completedAt: completed ? Timestamp.now() : null,
        createdAt: when ? Timestamp.fromDate(new Date(when)) : undefined,
      });
      // Felder zurücksetzen
      setDescription('');
      setDueDate('');
      setCompleted(true);
      setWhen(nowLocalInput());
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
    <Modal open={open} onClose={onClose} title="Aktivität hinzufügen">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="label">Typ</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.icon} {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Beschreibung</label>
          <textarea
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Was ist passiert / geplant?"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Datum + Uhrzeit</label>
            <input
              className="input"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Fällig (Follow-up)</label>
            <input
              className="input"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
          />
          Erledigt
        </label>

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
            {saving ? 'Speichern…' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
