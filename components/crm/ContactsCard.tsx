'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { Contact, Customer } from '@/lib/types';
import {
  createContact,
  deleteContact,
  personName,
  updateContact,
  type ContactInput,
} from '@/lib/crm';

interface Props {
  customer: Customer;
  contacts: Contact[];
  onChanged: () => void;
}

const EMPTY = { firstName: '', lastName: '', role: '', email: '', phone: '', notes: '' };

/** Hauptansprechpartner (aus dem Kunden) plus beliebig viele weitere. */
export default function ContactsCard({ customer, contacts, onChanged }: Props) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mainName = personName(customer);

  const startNew = () => {
    setForm(EMPTY);
    setError(null);
    setEditing('new');
  };

  const startEdit = (c: Contact) => {
    setForm({ firstName: c.firstName, lastName: c.lastName, role: c.role, email: c.email, phone: c.phone, notes: c.notes });
    setError(null);
    setEditing(c.id);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() && !form.lastName.trim()) {
      setError('Bitte mindestens einen Namen eintragen.');
      return;
    }
    setSaving(true);
    setError(null);
    const data: ContactInput = {
      customerId: customer.id,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
    };
    try {
      if (editing === 'new') await createContact(data);
      else if (editing) await updateContact(editing, data);
      setEditing(null);
      onChanged();
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Contact) => {
    if (!confirm(`${personName(c) || 'Ansprechpartner'} aus der Akte entfernen?`)) return;
    try {
      await deleteContact(c.id);
      setEditing(null);
      onChanged();
    } catch (err) {
      setError(`Löschen fehlgeschlagen: ${(err as Error).message}`);
    }
  };

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">
          Ansprechpartner <span className="text-gray-400 font-normal">({(mainName || customer.email ? 1 : 0) + contacts.length})</span>
        </h2>
        {editing !== 'new' && (
          <button type="button" onClick={startNew} className="text-sm text-brand-blue hover:underline font-medium">
            + Hinzufügen
          </button>
        )}
      </div>

      <ul className="space-y-3">
        {(mainName || customer.email || customer.phone) && (
          <li className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{mainName || '—'}</p>
                <p className="text-xs text-gray-500">Hauptansprechpartner</p>
              </div>
              <Link href={`/dashboard/kunden/${customer.id}/edit`} className="text-xs text-gray-500 hover:text-gray-900">
                Bearbeiten
              </Link>
            </div>
            <ContactLines email={customer.email} phone={customer.phone} />
          </li>
        )}

        {contacts.map((c) =>
          editing === c.id ? (
            <li key={c.id}>
              <ContactForm form={form} setForm={setForm} onSubmit={save} onCancel={() => setEditing(null)} onDelete={() => remove(c)} saving={saving} error={error} />
            </li>
          ) : (
            <li key={c.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{personName(c) || '—'}</p>
                  {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
                </div>
                <button type="button" onClick={() => startEdit(c)} className="text-xs text-gray-500 hover:text-gray-900">
                  Bearbeiten
                </button>
              </div>
              <ContactLines email={c.email} phone={c.phone} />
              {c.notes && <p className="mt-1.5 text-xs text-gray-600 whitespace-pre-line">{c.notes}</p>}
            </li>
          ),
        )}

        {editing === 'new' && (
          <li>
            <ContactForm form={form} setForm={setForm} onSubmit={save} onCancel={() => setEditing(null)} saving={saving} error={error} />
          </li>
        )}
      </ul>

      {!mainName && !customer.email && !customer.phone && contacts.length === 0 && editing !== 'new' && (
        <p className="text-sm text-gray-500">Noch kein Ansprechpartner. Wer ist dein Kontakt in der Firma?</p>
      )}
    </section>
  );
}

function ContactLines({ email, phone }: { email?: string; phone?: string }) {
  if (!email && !phone) return null;
  return (
    <div className="mt-2 space-y-1 text-sm">
      {email && (
        <a href={`mailto:${email}`} className="block truncate text-brand-blue hover:underline">
          {email}
        </a>
      )}
      {phone && (
        <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="block text-gray-700 hover:text-gray-900">
          {phone}
        </a>
      )}
    </div>
  );
}

function ContactForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  onDelete,
  saving,
  error,
}: {
  form: typeof EMPTY;
  setForm: (f: typeof EMPTY) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
  error: string | null;
}) {
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-brand-blue/40 bg-blue-50/40 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="Vorname" value={form.firstName} onChange={set('firstName')} autoFocus aria-label="Vorname" />
        <input className="input" placeholder="Nachname" value={form.lastName} onChange={set('lastName')} aria-label="Nachname" />
      </div>
      <input className="input" placeholder="Rolle, z. B. Geschäftsführer" value={form.role} onChange={set('role')} aria-label="Rolle" />
      <input className="input" type="email" placeholder="E-Mail" value={form.email} onChange={set('email')} aria-label="E-Mail" />
      <input className="input" type="tel" placeholder="Telefon" value={form.phone} onChange={set('phone')} aria-label="Telefon" />
      <textarea className="input" rows={2} placeholder="Notiz zur Person" value={form.notes} onChange={set('notes')} aria-label="Notiz" />
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? 'Speichern…' : 'Speichern'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">
          Abbrechen
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete} className="ml-auto text-xs text-red-600 hover:underline">
            Entfernen
          </button>
        )}
      </div>
    </form>
  );
}
