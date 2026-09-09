'use client';

import { useRef, useState } from 'react';
import { uploadFile, deleteFile } from '@/lib/firestore';
import {
  optimizeImage,
  buildImagePath,
  formatBytes,
} from '@/lib/image-optimize';

interface Props {
  /** Aktuelle Bild-URL, leer wenn noch keins hinterlegt ist. */
  value: string;
  onChange: (url: string) => void;
  /** Wird fuer den Dateinamen genutzt. */
  slug: string;
  /** Alternativtext, nur fuer die Vorschau. */
  alt?: string;
}

/**
 * Bild auswaehlen, im Browser verkleinern, hochladen, fertig.
 *
 * Das Bild landet in Firebase Storage unter blog/. Die zurueckgegebene
 * Download-Adresse ist oeffentlich abrufbar, damit Besucher das Bild
 * sehen. Wer lieber ein Bild von woanders einbindet, kann die Adresse
 * weiterhin von Hand eintragen.
 */
export default function ImageUploadField({
  value,
  onChange,
  slug,
  alt,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const opt = await optimizeImage(file);
      const path = buildImagePath(slug || 'artikel', opt.extension);
      const url = await uploadFile(path, opt.blob);
      onChange(url);
      const saved = opt.originalBytes - opt.optimizedBytes;
      setInfo(
        saved > 0
          ? `Hochgeladen. Von ${formatBytes(opt.originalBytes)} auf ${formatBytes(
              opt.optimizedBytes,
            )} verkleinert${opt.width ? `, ${opt.width} mal ${opt.height} Pixel` : ''}.`
          : `Hochgeladen (${formatBytes(opt.optimizedBytes)}).`,
      );
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('quota-exceeded') || msg.includes('storage/quota')) {
        setError(
          'Der Speicherplatz bei Firebase ist voll. Entweder ein altes Bild löschen oder Firebase auf den Blaze-Tarif umstellen. Bis dahin kannst du unten eine Bild-Adresse von Hand eintragen.',
        );
      } else if (msg.includes('unauthorized') || msg.includes('permission')) {
        setError(
          'Kein Zugriff auf den Speicher. Bitte einmal ab- und wieder anmelden.',
        );
      } else {
        setError(`Hochladen fehlgeschlagen: ${msg}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeImage = async () => {
    if (!confirm('Bild entfernen?')) return;
    // Nur eigene Uploads aus dem Speicher loeschen, fremde Adressen
    // werden lediglich aus dem Artikel entfernt.
    const path = decodeStoragePath(value);
    if (path) {
      try {
        await deleteFile(path);
      } catch (err) {
        console.warn('Datei konnte nicht entfernt werden:', err);
      }
    }
    onChange('');
    setInfo(null);
  };

  return (
    <div>
      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={alt || 'Titelbild'}
            className="w-full max-h-64 object-cover rounded-lg border border-gray-200"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="btn-secondary text-xs"
            >
              {busy ? 'Lädt…' : 'Anderes Bild'}
            </button>
            <button
              type="button"
              onClick={removeImage}
              disabled={busy}
              className="btn-secondary text-xs text-red-600 hover:bg-red-50"
            >
              Entfernen
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => !busy && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            dragOver
              ? 'border-brand-blue bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          {busy ? (
            <span className="text-sm text-gray-600">
              Bild wird verkleinert und hochgeladen…
            </span>
          ) : (
            <>
              <span className="text-2xl" aria-hidden="true">
                🖼️
              </span>
              <span className="text-sm font-medium text-gray-700">
                Bild hierher ziehen oder klicken
              </span>
              <span className="text-xs text-gray-500 text-center">
                Wird automatisch auf 1600 Pixel verkleinert und
                komprimiert. JPG, PNG oder WebP.
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          // Zuruecksetzen, damit dieselbe Datei erneut gewaehlt werden kann.
          e.target.value = '';
        }}
      />

      {info && (
        <p className="mt-2 text-xs text-green-700">{info}</p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-700">{error}</p>
      )}

      <details className="mt-2">
        <summary className="text-xs text-gray-500 cursor-pointer">
          Bild-Adresse von Hand eintragen
        </summary>
        <input
          className="input mt-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…  oder  /images/blog/…"
        />
      </details>
    </div>
  );
}

/** Holt den Speicherpfad aus einer Firebase-Download-Adresse. */
function decodeStoragePath(url: string): string | null {
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}
