'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import Modal from '@/components/ui/Modal';
import { createCustomer, createDeal, updateDeal } from '@/lib/firestore';
import { DEAL_SOURCES, PIPELINE_STAGES } from '@/lib/sales';
import type {
  Customer,
  Deal,
  DealSource,
  DealStage,
  Salutation,
} from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  /** Bestehende Kunden für das Dropdown. */
  customers: Customer[];
  /** Im Edit-Modus: der zu bearbeitende Deal. */
  deal?: Deal | null;
  /** Optional vorausgewählter Kunde (z.B. von der Kundenseite). */
  presetCustomerId?: string;
  /** Wird nach erfolgreichem Speichern mit der Deal-ID aufgerufen. */
  onSaved: (dealId: string) => void;
  /** Wird aufgerufen, wenn inline ein neuer Kunde angelegt wurde. */
  onCustomerCreated?: () => void;
}

const SALUTATIONS: Salutation[] = ['Herr', 'Frau', 'Divers'];

export default function DealFormModal({
  open,
  onClose,
  mode,
  customers,
  deal,
  presetCustomerId,
  onSaved,
  onCustomerCreated,
}: Props) {
  const [customerId, setCustomerId] = useState(
    deal?.customerId ?? presetCustomerId ?? '',
  );
  const [title, setTitle] = useState(deal?.title ?? '');
  const [value, setValue] = useState(
    deal?.value != null ? String(deal.value) : '',
  );
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? 'kontaktiert');
  const [source, setSource] = useState<DealSource>(deal?.source ?? 'sonstiges');
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    deal?.expectedCloseDate
      ? deal.expectedCloseDate.toDate().toISOString().slice(0, 10)
      : '',
  );
  const [notes, setNotes] = useState(deal?.notes ?? '');

  // Inline-Kundenanlage
  const [newCustomer, setNewCustomer] = useState(false);
  const [nc, setNc] = useState({
    company: '',
    salutation: 'Herr' as Salutation,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (!title.trim()) {
      setError('Bitte einen Deal-Titel angeben.');
      return;
    }

    setSaving(true);
    try {
      let resolvedCustomerId = customerId;

      // Inline neuen Kunden anlegen
      if (mode === 'create' && newCustomer) {
        if (!nc.company.trim() && !nc.lastName.trim()) {
          setError('Bitte mindestens Firma oder Nachname des Kunden angeben.');
          setSaving(false);
          return;
        }
        resolvedCustomerId = await createCustomer({
          company: nc.company.trim(),
          salutation: nc.salutation,
          firstName: nc.firstName.trim(),
          lastName: nc.lastName.trim(),
          street: '',
          zip: '',
          city: '',
          email: nc.email.trim(),
          phone: nc.phone.trim(),
        });
        onCustomerCreated?.();
      }

      if (!resolvedCustomerId) {
        setError('Bitte einen Kunden auswählen oder neu anlegen.');
        setSaving(false);
        return;
      }

      const parsedValue =
        value.trim() === '' ? null : Number(value.replace(',', '.'));
      if (parsedValue != null && Number.isNaN(parsedValue)) {
        setError('Dealwert ist keine gültige Zahl.');
        setSaving(false);
        return;
      }

      const payload = {
        customerId: resolvedCustomerId,
        title: title.trim(),
        value: parsedValue,
        stage,
        source,
        expectedCloseDate: expectedCloseDate
          ? Timestamp.fromDate(new Date(expectedCloseDate))
          : null,
        notes: notes.trim(),
      };

      if (mode === 'edit' && deal) {
        await updateDeal(deal.id, payload);
        onSaved(deal.id);
      } else {
        const id = await createDeal({ ...payload, lostReason: null });
        onSaved(id);
      }
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
      title={mode === 'edit' ? 'Deal bearbeiten' : 'Neuer Deal'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Kunde */}
        {mode === 'create' && !newCustomer && (
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Kunde</label>
              <button
                type="button"
                onClick={() => setNewCustomer(true)}
                className="text-xs text-brand-blue hover:underline font-medium mb-1.5"
              >
                + Neuen Kunden anlegen
              </button>
            </div>
            <select
              className="input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">— Kunde wählen —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company || `${c.firstName} ${c.lastName}`.trim() || c.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'create' && newCustomer && (
          <div className="rounded-lg border border-gray-200 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Neuer Kunde
              </span>
              <button
                type="button"
                onClick={() => setNewCustomer(false)}
                className="text-xs text-gray-500 hover:underline"
              >
                Bestehenden Kunden wählen
              </button>
            </div>
            <input
              className="input"
              placeholder="Firma"
              value={nc.company}
              onChange={(e) => setNc({ ...nc, company: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                className="input"
                value={nc.salutation}
                onChange={(e) =>
                  setNc({ ...nc, salutation: e.target.value as Salutation })
                }
              >
                {SALUTATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Vorname"
                value={nc.firstName}
                onChange={(e) => setNc({ ...nc, firstName: e.target.value })}
              />
              <input
                className="input"
                placeholder="Nachname"
                value={nc.lastName}
                onChange={(e) => setNc({ ...nc, lastName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                type="email"
                placeholder="E-Mail"
                value={nc.email}
                onChange={(e) => setNc({ ...nc, email: e.target.value })}
              />
              <input
                className="input"
                placeholder="Telefon"
                value={nc.phone}
                onChange={(e) => setNc({ ...nc, phone: e.target.value })}
              />
            </div>
          </div>
        )}

        {mode === 'edit' && (
          <p className="text-xs text-gray-500">
            Kunde:{' '}
            {customers.find((c) => c.id === customerId)?.company ?? '—'} (nicht
            änderbar)
          </p>
        )}

        {/* Titel */}
        <div>
          <label className="label">Deal-Titel</label>
          <input
            className="input"
            placeholder="z.B. Website Redesign"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Dealwert (EUR)</label>
            <input
              className="input"
              inputMode="decimal"
              placeholder="optional"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Pipeline-Stufe</label>
            <select
              className="input"
              value={stage}
              onChange={(e) => setStage(e.target.value as DealStage)}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Erwartetes Abschlussdatum</label>
            <input
              className="input"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Quelle</label>
            <select
              className="input"
              value={source}
              onChange={(e) => setSource(e.target.value as DealSource)}
            >
              {DEAL_SOURCES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Notizen</label>
          <textarea
            className="input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            {saving ? 'Speichern…' : mode === 'edit' ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
