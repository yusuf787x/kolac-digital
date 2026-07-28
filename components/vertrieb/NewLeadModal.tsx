'use client';

import { useState, type FormEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { createLead } from '@/lib/firestore';
import { LEAD_CATEGORIES } from '@/lib/types';

interface Props {
  onClose: () => void;
  onCreated: (id: string) => void;
}

/**
 * Kompaktes Modal fuer die schnelle Lead-Erfassung. Nur die
 * Muss-Felder + ein paar sinnvolle Defaults. Detail-Anpassung
 * (Kontakt-Historie, Rueckruf, Notizen) danach auf der Detail-Page.
 */
export default function NewLeadModal({ onClose, onCreated }: Props) {
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState<string>('');
  const [city, setCity] = useState('Bielefeld');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!company.trim()) {
      setError('Firma fehlt.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const id = await createLead({
        company: company.trim(),
        contactName: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        category: category || undefined,
        city: city.trim() || undefined,
        googleMapsUrl: googleMapsUrl.trim() || undefined,
        notes: notes.trim(),
        status: 'kalt',
        source: 'manuell',
        nextCallAt: null,
        lastContactAt: null,
      });
      onCreated(id);
    } catch (err) {
      console.error(err);
      setError(`Anlegen fehlgeschlagen: ${(err as Error).message}`);
      setSubmitting(false);
    }
    // Vermeide Unused-Import-Warning
    void Timestamp;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-lg">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Neuer Lead</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div>
            <label className="label">Firma *</label>
            <input
              className="input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="z.B. Friseursalon Bacic"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ansprechpartner</label>
              <input
                className="input"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Inhaber/in"
              />
            </div>
            <div>
              <label className="label">Branche</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">— wählen —</option>
                {LEAD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefon</label>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0521 …"
              />
            </div>
            <div>
              <label className="label">E-Mail</label>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@…"
                type="email"
              />
            </div>
          </div>

          <div>
            <label className="label">Website</label>
            <input
              className="input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ort</label>
              <input
                className="input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Google-Maps-Link</label>
              <input
                className="input"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/…"
              />
            </div>
          </div>

          <div>
            <label className="label">Notizen</label>
            <textarea
              className="input min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Website veraltet, letzte Änderung 2019 laut Impressum…"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={submitting}
            >
              Abbrechen
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Speichere…' : 'Lead anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
