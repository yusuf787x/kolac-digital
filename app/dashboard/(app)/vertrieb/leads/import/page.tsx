'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bulkCreateLeads } from '@/lib/firestore';
import type { Lead } from '@/lib/types';

/**
 * Bulk-CSV-Import fuer Leads. Erwartet eine erste Zeile mit Headern.
 * Alle Header sind case-insensitive gemappt auf die Lead-Felder;
 * unbekannte Spalten werden ignoriert. Ideal fuer Exporte aus
 * Outscraper / Apify / Google-Places-API.
 *
 * Unterstuetzte Spalten (Aliases in Klammern):
 *   company (name, firma, businessname, title)
 *   contactName (owner, inhaber, contact)
 *   phone (telefon, tel, phonenumber)
 *   email (mail, e-mail)
 *   website (url, domain)
 *   category (branche, type, kategorie)
 *   street (strasse, adresse, address)
 *   zip (plz, postcode, postalcode)
 *   city (ort, stadt)
 *   rating (googlerating, sterne)
 *   reviewcount (reviews, bewertungen)
 *   googleMapsUrl (mapsurl, googleurl)
 *   notes (notiz, notizen, description)
 */
const FIELD_ALIASES: Record<string, string> = {
  name: 'company',
  firma: 'company',
  businessname: 'company',
  title: 'company',
  company: 'company',
  owner: 'contactName',
  inhaber: 'contactName',
  contact: 'contactName',
  contactname: 'contactName',
  telefon: 'phone',
  tel: 'phone',
  phonenumber: 'phone',
  phone: 'phone',
  mail: 'email',
  'e-mail': 'email',
  email: 'email',
  url: 'website',
  domain: 'website',
  website: 'website',
  branche: 'category',
  type: 'category',
  kategorie: 'category',
  category: 'category',
  strasse: 'street',
  adresse: 'street',
  address: 'street',
  street: 'street',
  plz: 'zip',
  postcode: 'zip',
  postalcode: 'zip',
  zip: 'zip',
  ort: 'city',
  stadt: 'city',
  city: 'city',
  googlerating: 'rating',
  sterne: 'rating',
  rating: 'rating',
  reviews: 'reviewCount',
  bewertungen: 'reviewCount',
  reviewcount: 'reviewCount',
  mapsurl: 'googleMapsUrl',
  googleurl: 'googleMapsUrl',
  googlemapsurl: 'googleMapsUrl',
  notiz: 'notes',
  notizen: 'notes',
  description: 'notes',
  notes: 'notes',
};

interface ParsedRow {
  company: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  category?: string;
  street?: string;
  zip?: string;
  city?: string;
  rating?: number;
  reviewCount?: number;
  googleMapsUrl?: string;
  notes?: string;
}

function parseCSV(text: string): ParsedRow[] {
  // Sehr toleranter CSV-Parser: Semikolon oder Komma, Anfuehrungszeichen
  // fuer Felder mit Trennzeichen. Fuer Excel-Exports (Semikolon) und
  // "normale" (Komma) faehig.
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = detectDelim(lines[0]);
  const headers = splitCsvLine(lines[0], delim).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9\-]/g, ''),
  );
  const out: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i], delim);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const field = FIELD_ALIASES[h];
      if (field && parts[idx] != null) row[field] = parts[idx].trim();
    });
    if (!row.company) continue;
    const rating = row.rating ? parseFloat(row.rating.replace(',', '.')) : undefined;
    const reviewCount = row.reviewCount ? parseInt(row.reviewCount, 10) : undefined;
    out.push({
      company: row.company,
      contactName: row.contactName || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      website: row.website || undefined,
      category: row.category || undefined,
      street: row.street || undefined,
      zip: row.zip || undefined,
      city: row.city || undefined,
      rating: Number.isFinite(rating) ? rating : undefined,
      reviewCount: Number.isFinite(reviewCount) ? reviewCount : undefined,
      googleMapsUrl: row.googleMapsUrl || undefined,
      notes: row.notes || undefined,
    });
  }
  return out;
}

function detectDelim(headerLine: string): string {
  const sc = (headerLine.match(/;/g) ?? []).length;
  const cc = (headerLine.match(/,/g) ?? []).length;
  return sc > cc ? ';' : ',';
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delim && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export default function LeadsImportPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultCategory, setDefaultCategory] = useState('');

  const rows = useMemo(() => parseCSV(rawText), [rawText]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setRawText(text);
  };

  const handleImport = async () => {
    if (rows.length === 0) {
      setError('Keine gültigen Zeilen im CSV gefunden. Zeile 1 muss Header enthalten.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const leads: Array<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>> =
        rows.map((r) => ({
          company: r.company,
          contactName: r.contactName,
          phone: r.phone,
          email: r.email,
          website: r.website,
          category: r.category || defaultCategory || undefined,
          street: r.street,
          zip: r.zip,
          city: r.city,
          rating: r.rating,
          reviewCount: r.reviewCount,
          googleMapsUrl: r.googleMapsUrl,
          notes: r.notes ?? '',
          status: 'kalt',
          source: 'csv_import',
          nextCallAt: null,
          lastContactAt: null,
        }));
      const n = await bulkCreateLeads(leads);
      setImported(n);
      setTimeout(() => router.push('/dashboard/vertrieb/leads'), 1200);
    } catch (err) {
      console.error(err);
      setError(`Import fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertrieb/leads"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Leads
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">CSV-Import</h1>
        <p className="mt-1 text-sm text-gray-500">
          Lade eine CSV-Datei hoch oder füge den Inhalt direkt ein. Erste
          Zeile muss die Header enthalten. Erwartete Spalten:
          <span className="font-mono text-xs">
            {' '}
            company, contactName, phone, email, website, category, street,
            zip, city, rating, reviewCount, googleMapsUrl, notes
          </span>
          . Aliase (Firma, Telefon, Ort, Branche, mapsurl, …) werden
          automatisch erkannt.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <div>
            <label className="label">CSV-Datei</label>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFile}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-blue file:text-white file:font-medium file:cursor-pointer"
            />
          </div>
          <div>
            <label className="label">Oder direkt einfügen</label>
            <textarea
              className="input font-mono text-xs min-h-[240px]"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Name;Telefon;Ort;Branche&#10;Friseursalon Bacic;0521 12345;Bielefeld;Friseur"
            />
          </div>
          <div>
            <label className="label">
              Standard-Branche (falls Spalte fehlt / leer)
            </label>
            <input
              className="input"
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              placeholder="z.B. Friseur"
            />
          </div>
        </div>

        <div className="card">
          <p className="text-sm font-medium text-gray-900 mb-2">
            Vorschau: {rows.length} Zeile{rows.length === 1 ? '' : 'n'} erkannt
          </p>
          {rows.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto text-sm">
              <table className="w-full">
                <thead className="text-xs uppercase text-gray-500 tracking-wider bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1.5">Firma</th>
                    <th className="text-left px-2 py-1.5">Ort</th>
                    <th className="text-left px-2 py-1.5">Telefon</th>
                    <th className="text-left px-2 py-1.5">Branche</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5">{r.company}</td>
                      <td className="px-2 py-1.5">{r.city ?? '—'}</td>
                      <td className="px-2 py-1.5">{r.phone ?? '—'}</td>
                      <td className="px-2 py-1.5">
                        {r.category ?? defaultCategory ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  … und {rows.length - 50} weitere.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Noch keine Vorschau. Datei hochladen oder Text einfügen.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="card mt-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {imported != null && (
        <div className="card mt-4 bg-green-50 border-green-200 text-sm text-green-800">
          {imported} Lead{imported === 1 ? '' : 's'} importiert. Weiterleitung…
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleImport}
          disabled={importing || rows.length === 0}
          className="btn-primary disabled:opacity-50"
        >
          {importing
            ? `Importiere ${rows.length}…`
            : `${rows.length} Lead${rows.length === 1 ? '' : 's'} importieren`}
        </button>
      </div>
    </div>
  );
}
