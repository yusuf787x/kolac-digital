'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bulkCreateLeads, listLeads } from '@/lib/firestore';
import type { Lead } from '@/lib/types';

const normalizePhone = (p?: string): string =>
  (p ?? '').replace(/[^\d+]/g, '');

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
/**
 * Header-Aliase, alle case-insensitive gegen `[a-z0-9]`-normalisiert.
 * Enthaelt alle typischen Outscraper- / Apify- / Google-Places-CSV-Spalten
 * plus deutsche Excel-Uebersetzungen.
 */
const FIELD_ALIASES: Record<string, string> = {
  // Firma
  name: 'company',
  firma: 'company',
  businessname: 'company',
  title: 'company',
  company: 'company',
  // Ansprechpartner
  owner: 'contactName',
  inhaber: 'contactName',
  contact: 'contactName',
  contactname: 'contactName',
  ownername: 'contactName',
  // Telefon
  telefon: 'phone',
  tel: 'phone',
  phonenumber: 'phone',
  phone: 'phone',
  phone1: 'phone',
  // E-Mail (Outscraper: email_1, email_2, email_3 — wir nehmen die erste)
  mail: 'email',
  email: 'email',
  email1: 'email',
  // Website (Outscraper nennt es "site")
  url: 'website',
  domain: 'website',
  website: 'website',
  site: 'website',
  // Branche
  branche: 'category',
  type: 'category',
  kategorie: 'category',
  category: 'category',
  subtypes: 'category',
  categories: 'category',
  maintype: 'category',
  // Adresse
  strasse: 'street',
  adresse: 'street',
  address: 'street',
  street: 'street',
  fulladdress: 'street',
  // PLZ
  plz: 'zip',
  postcode: 'zip',
  postalcode: 'zip',
  zip: 'zip',
  zipcode: 'zip',
  // Stadt
  ort: 'city',
  stadt: 'city',
  city: 'city',
  // Rating
  googlerating: 'rating',
  sterne: 'rating',
  rating: 'rating',
  // Reviews
  reviews: 'reviewCount',
  bewertungen: 'reviewCount',
  reviewcount: 'reviewCount',
  reviewscount: 'reviewCount',
  // Google-Maps-URL (Outscraper: "url" ist meist Website, "google_maps_link"
  // oder "google_id" identifiziert den Maps-Eintrag)
  mapsurl: 'googleMapsUrl',
  googleurl: 'googleMapsUrl',
  googlemapsurl: 'googleMapsUrl',
  googlemapslink: 'googleMapsUrl',
  googlemap: 'googleMapsUrl',
  // Notizen (Outscraper: "about" ist die Business-Beschreibung, "query"
  // ist die urspruengliche Search-Query — beides packen wir in notes)
  notiz: 'notes',
  notizen: 'notes',
  description: 'notes',
  notes: 'notes',
  about: 'notes',
  query: 'notes',
};

/**
 * Grobes Mapping von englischen Google-Business-Types auf unsere
 * deutschen Kategorien. Bei Outscraper kommt "type" meist als
 * "hair_salon", "dentist", "physiotherapist" usw.
 */
const CATEGORY_MAP: Record<string, string> = {
  hair_salon: 'Friseur',
  hairsalon: 'Friseur',
  hairdresser: 'Friseur',
  friseur: 'Friseur',
  barber: 'Barbier',
  barber_shop: 'Barbier',
  barbershop: 'Barbier',
  beauty_salon: 'Kosmetik',
  beautysalon: 'Kosmetik',
  cosmetics_store: 'Kosmetik',
  nail_salon: 'Nagelstudio',
  nailsalon: 'Nagelstudio',
  physical_therapist: 'Physio',
  physiotherapist: 'Physio',
  physiotherapy: 'Physio',
  dentist: 'Zahnarzt',
  dental_clinic: 'Zahnarzt',
  doctor: 'Arztpraxis',
  medical_clinic: 'Arztpraxis',
  general_practitioner: 'Arztpraxis',
  alternative_medicine_practitioner: 'Heilpraktiker',
  contractor: 'Handwerker',
  plumber: 'Handwerker',
  electrician: 'Handwerker',
  roofing_contractor: 'Handwerker',
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  coffee_shop: 'Cafe',
  store: 'Einzelhandel',
  clothing_store: 'Einzelhandel',
  car_repair: 'Werkstatt',
  auto_repair_shop: 'Werkstatt',
};

/**
 * Mapping anwenden mit Fallback: unbekannten Type als Klartext
 * durchreichen (Nutzer kann in der Detail-Page manuell aendern).
 */
function mapCategory(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Outscraper trennt oft mehrere Typen mit Komma oder Pipe
  const first = raw
    .split(/[,|]/)[0]
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z_]/g, '_');
  if (!first) return raw.trim();
  return CATEGORY_MAP[first] ?? raw.split(/[,|]/)[0].trim();
}

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
  // Toleranter CSV-Parser: Semikolon oder Komma, Anfuehrungszeichen fuer
  // Felder mit Trennzeichen. Funktioniert fuer Excel-Exports (Semikolon)
  // und Outscraper-/Apify-Standard (Komma). Kollabiert bei Duplikat-
  // Headern (z.B. wenn subtypes UND type beide auf category mappen): der
  // spaetere Wert gewinnt, ausser der spaetere ist leer.
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
      const val = parts[idx]?.trim() ?? '';
      if (!field || !val) return;
      // "Don't overwrite with empty" ist schon durch !val abgedeckt.
      // Bei Konflikt (mehrere Header mappen auf gleiches Feld): erste
      // gefuellte Version gewinnt — verhindert dass eine leere subtypes
      // die category ueberschreibt.
      if (!row[field]) row[field] = val;
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
      // Category ueber Type-Mapping durchreichen (englische Google-Types
      // → deutsche Kategorien).
      category: mapCategory(row.category),
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
  const [skipped, setSkipped] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [defaultCategory, setDefaultCategory] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

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
    setSkipped(0);
    try {
      // Duplikat-Check auf Basis von Telefonnummer + Firmenname:
      // gleiche Nummer ODER gleicher Firmenname+Ort → skip.
      let existingPhones = new Set<string>();
      let existingKeys = new Set<string>();
      if (skipDuplicates) {
        const all = await listLeads();
        existingPhones = new Set(
          all
            .map((l) => normalizePhone(l.phone))
            .filter((p) => p.length >= 5),
        );
        existingKeys = new Set(
          all.map((l) =>
            `${l.company}|${l.city ?? ''}`.toLowerCase().trim(),
          ),
        );
      }

      const seenPhones = new Set<string>();
      const seenKeys = new Set<string>();
      let localSkipped = 0;

      const leads: Array<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>> = [];
      for (const r of rows) {
        const phone = normalizePhone(r.phone);
        const key = `${r.company}|${r.city ?? ''}`.toLowerCase().trim();
        if (skipDuplicates) {
          if (phone.length >= 5 && existingPhones.has(phone)) {
            localSkipped++;
            continue;
          }
          if (existingKeys.has(key)) {
            localSkipped++;
            continue;
          }
          // Auch Duplikate innerhalb der importierten Datei filtern
          if (phone.length >= 5 && seenPhones.has(phone)) {
            localSkipped++;
            continue;
          }
          if (seenKeys.has(key)) {
            localSkipped++;
            continue;
          }
        }
        if (phone) seenPhones.add(phone);
        seenKeys.add(key);

        // Auto-Klassifizierung des Website-Alters: keine Site → hot Lead.
        const websiteAge: Lead['websiteAge'] = r.website
          ? 'unbekannt'
          : 'keine';

        leads.push({
          company: r.company,
          contactName: r.contactName,
          phone: r.phone,
          email: r.email,
          website: r.website,
          websiteAge,
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
        });
      }

      const n = await bulkCreateLeads(leads);
      setImported(n);
      setSkipped(localSkipped);
      setTimeout(() => router.push('/dashboard/vertrieb/leads'), 1600);
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
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Duplikate überspringen (gleiche Telefonnummer oder gleiche
            Firma+Ort)
          </label>
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
                    <th className="text-left px-2 py-1.5">Website</th>
                    <th className="text-left px-2 py-1.5">Rating</th>
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
                      <td className="px-2 py-1.5">
                        {r.website ? (
                          <span className="text-xs text-gray-500 truncate max-w-[120px] inline-block">
                            {r.website}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700 font-medium">
                            keine 🔥
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-xs">
                        {r.rating != null
                          ? `${r.rating.toFixed(1)}★ (${r.reviewCount ?? 0})`
                          : '—'}
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
          {imported} Lead{imported === 1 ? '' : 's'} importiert
          {skipped > 0 && ` (${skipped} Duplikat${skipped === 1 ? '' : 'e'} übersprungen)`}
          . Weiterleitung…
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
