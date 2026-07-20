'use client';

import RichTextArea from '@/components/quote/RichTextArea';
import type { ContractAttachment } from '@/components/contract/TemplateContractPdf';

interface Props {
  attachments: ContractAttachment[];
  onChange: (next: ContractAttachment[]) => void;
}

/**
 * Editor fuer Vertrags-Anlagen. Jede Anlage wird im finalen PDF auf
 * einer neuen Seite als „ANLAGE N: [Titel]" gerendert. Anlagen kommen
 * NACH dem Signaturblock — das Signaturfeld sitzt weiterhin auf der
 * letzten Seite des Hauptteils, nicht auf der letzten Anlagen-Seite.
 */
export default function AttachmentsEditor({ attachments, onChange }: Props) {
  const add = () => {
    onChange([...attachments, { title: '', body: '' }]);
  };

  const update = (idx: number, patch: Partial<ContractAttachment>) => {
    const next = [...attachments];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(attachments.filter((_, i) => i !== idx));
  };

  const move = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= attachments.length) return;
    const next = [...attachments];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Anlagen</h3>
          <p className="text-xs text-gray-500">
            Optional. Jede Anlage startet auf einer neuen Seite nach dem
            Signaturblock (z.B. TOM beim AVV, Preisliste, technische
            Spezifikation).
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="text-sm text-brand-blue hover:underline font-medium"
        >
          + Anlage hinzufügen
        </button>
      </div>

      {attachments.length === 0 && (
        <p className="text-xs text-gray-400 italic">Keine Anlagen.</p>
      )}

      {attachments.map((att, idx) => (
        <div
          key={idx}
          className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
              Anlage {idx + 1}
            </span>
            <input
              className="input flex-1"
              value={att.title}
              onChange={(e) => update(idx, { title: e.target.value })}
              placeholder="Titel der Anlage, z.B. Technische und organisatorische Maßnahmen (TOM)"
            />
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
              title="Nach oben"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === attachments.length - 1}
              className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
              title="Nach unten"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-xs text-red-600 hover:underline"
            >
              Entfernen
            </button>
          </div>
          <RichTextArea
            value={att.body}
            onChange={(v) => update(idx, { body: v })}
            placeholder="Inhalt der Anlage…"
            minHeight={140}
          />
        </div>
      ))}
    </div>
  );
}
