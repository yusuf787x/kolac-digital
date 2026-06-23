'use client';

import { useEffect, useState } from 'react';
import {
  listContractTypes,
  createContractType,
  updateContractType,
  deleteContractType,
  seedContractTypes,
} from '@/lib/firestore';
import type { ContractType } from '@/lib/types';

export default function ContractTypesManager() {
  const [types, setTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [shortLabel, setShortLabel] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    const list = await listContractTypes();
    setTypes(list);
  };

  useEffect(() => {
    (async () => {
      await seedContractTypes();
      await reload();
      setLoading(false);
    })();
  }, []);

  const handleAdd = async () => {
    if (!label.trim() || !shortLabel.trim()) return;
    setSaving(true);
    try {
      await createContractType({
        label: label.trim(),
        shortLabel: shortLabel.trim(),
        description: description.trim(),
        active: true,
      });
      setLabel('');
      setShortLabel('');
      setDescription('');
      await reload();
      setMessage('Hinzugefügt.');
      setTimeout(() => setMessage(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: ContractType) => {
    await updateContractType(t.id, { active: !t.active });
    await reload();
  };

  const remove = async (t: ContractType) => {
    if (!confirm(`Vertragstyp "${t.label}" löschen?`)) return;
    await deleteContractType(t.id);
    await reload();
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Lädt Vertragstypen…</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
        {types.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-3 px-3 py-2 bg-white"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {t.label}{' '}
                <span className="text-xs text-gray-500 font-normal">
                  ({t.shortLabel})
                </span>
              </p>
              {t.description && (
                <p className="text-xs text-gray-500 truncate">
                  {t.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={t.active}
                  onChange={() => toggleActive(t)}
                  className="h-4 w-4 accent-blue-600"
                />
                aktiv
              </label>
              <button
                onClick={() => remove(t)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
        {types.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-500 bg-white">
            Noch keine Typen.
          </li>
        )}
      </ul>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Bezeichnung</label>
          <input
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z.B. NDA"
          />
        </div>
        <div>
          <label className="label">Kürzel</label>
          <input
            className="input"
            value={shortLabel}
            onChange={(e) => setShortLabel(e.target.value)}
            placeholder="z.B. NDA"
          />
        </div>
        <div>
          <label className="label">Beschreibung (optional)</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="kurze Beschreibung"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleAdd}
          disabled={saving || !label.trim() || !shortLabel.trim()}
          className="btn-secondary"
        >
          {saving ? 'Speichern…' : '+ Typ hinzufügen'}
        </button>
        {message && <span className="text-sm text-gray-700">{message}</span>}
      </div>
    </div>
  );
}
