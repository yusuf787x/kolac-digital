'use client';

import { useState } from 'react';
import RichTextArea from '@/components/quote/RichTextArea';
import type {
  CallScript,
  CallScriptBlock,
  CallScriptObjection,
} from '@/lib/types';

interface Props {
  initial: Pick<CallScript, 'blocks' | 'objections' | 'note'>;
  submitLabel: string;
  onSubmit: (data: Pick<CallScript, 'blocks' | 'objections' | 'note'>) => Promise<void>;
  onCancel?: () => void;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Gemeinsamer Editor fuer Skript-Bearbeitung und Neu-Version.
 * Bloecke haben Titel + Rich-Body (Fett/Bullets), Einwaende haben
 * Trigger + Antwort.
 */
export default function ScriptEditor({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [note, setNote] = useState(initial.note ?? '');
  const [blocks, setBlocks] = useState<CallScriptBlock[]>(
    () =>
      [...initial.blocks]
        .sort((a, b) => a.order - b.order)
        .map((b) => ({ ...b })) ?? [],
  );
  const [objections, setObjections] = useState<CallScriptObjection[]>(
    () => initial.objections.map((o) => ({ ...o })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addBlock = () =>
    setBlocks((prev) => [
      ...prev,
      {
        id: newId(),
        title: 'Neuer Block',
        body: '',
        order: prev.length,
      },
    ]);
  const updateBlock = (idx: number, patch: Partial<CallScriptBlock>) =>
    setBlocks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  const moveBlock = (idx: number, dir: -1 | 1) =>
    setBlocks((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((b, i) => ({ ...b, order: i }));
    });
  const removeBlock = (idx: number) =>
    setBlocks((prev) =>
      prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, order: i })),
    );

  const addObjection = () =>
    setObjections((prev) => [
      ...prev,
      { id: newId(), trigger: '', response: '' },
    ]);
  const updateObj = (idx: number, patch: Partial<CallScriptObjection>) =>
    setObjections((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  const removeObj = (idx: number) =>
    setObjections((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        note: note.trim(),
        blocks: blocks.map((b, i) => ({
          id: b.id,
          title: b.title.trim() || `Block ${i + 1}`,
          body: b.body,
          order: i,
        })),
        objections: objections
          .filter((o) => o.trigger.trim() || o.response.trim())
          .map((o) => ({
            id: o.id,
            trigger: o.trigger.trim(),
            response: o.response,
          })),
      });
    } catch (err) {
      console.error(err);
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <label className="label">Version-Notiz (optional)</label>
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z.B. „V2 — kuerzerer Einstieg, Nutzen frueher"
        />
      </div>

      <div className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Skript-Bloecke
          </h2>
          <button
            type="button"
            onClick={addBlock}
            className="text-sm text-brand-blue hover:underline"
          >
            + Block hinzufuegen
          </button>
        </div>
        {blocks.length === 0 && (
          <p className="text-xs text-gray-500 italic">
            Noch keine Bloecke. „+ Block hinzufuegen" klicken.
          </p>
        )}
        {blocks.map((b, idx) => (
          <div
            key={b.id}
            className="border border-gray-200 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <input
                className="input flex-1"
                value={b.title}
                onChange={(e) => updateBlock(idx, { title: e.target.value })}
                placeholder="Titel (z.B. Einstieg, Pitch, Termin)"
              />
              <button
                type="button"
                onClick={() => moveBlock(idx, -1)}
                disabled={idx === 0}
                className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveBlock(idx, 1)}
                disabled={idx === blocks.length - 1}
                className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeBlock(idx)}
                className="text-xs text-red-600 hover:underline"
              >
                Entfernen
              </button>
            </div>
            <RichTextArea
              value={b.body}
              onChange={(v) => updateBlock(idx, { body: v })}
              placeholder="Body (fett / Bullets ueber die Toolbar)"
              minHeight={100}
            />
          </div>
        ))}
      </div>

      <div className="card space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Einwand-Behandlung
          </h2>
          <button
            type="button"
            onClick={addObjection}
            className="text-sm text-brand-blue hover:underline"
          >
            + Einwand hinzufuegen
          </button>
        </div>
        {objections.length === 0 && (
          <p className="text-xs text-gray-500 italic">
            Noch keine Einwaende hinterlegt.
          </p>
        )}
        {objections.map((o, idx) => (
          <div
            key={o.id}
            className="border border-gray-200 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <input
                className="input flex-1"
                value={o.trigger}
                onChange={(e) => updateObj(idx, { trigger: e.target.value })}
                placeholder={'Kunden-Aussage (z.B. „Zu teuer")'}
              />
              <button
                type="button"
                onClick={() => removeObj(idx)}
                className="text-xs text-red-600 hover:underline"
              >
                Entfernen
              </button>
            </div>
            <RichTextArea
              value={o.response}
              onChange={(v) => updateObj(idx, { response: v })}
              placeholder="Antwort-Vorschlag (fett/Bullets moeglich)"
              minHeight={80}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="card bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={saving}
          >
            Abbrechen
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Speichere…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
