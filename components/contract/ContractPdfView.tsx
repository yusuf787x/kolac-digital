'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { ContractField } from '@/lib/types';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface Props {
  pdfUrl: string;
  fields: ContractField[];
  /**
   * Kundenstadt aus dem Snapshot — wird im Ort/Datum-Field-Overlay als
   * Vorschau angezeigt, damit der Kunde sieht was beim Signieren
   * automatisch eingesetzt wird.
   */
  customerCity?: string;
}

/**
 * Read-only PDF-Anzeige fuer den Kunden im Signing-Flow.
 *
 * Single-Page-Ansicht mit Blaetter-Navigation:
 *   - Grosse, gut lesbare Darstellung (max 900px auf desktop)
 *   - Prev/Next-Buttons, Seiten-Zaehler, Springen zur Signatur-Seite
 *   - Tastatur: ArrowLeft/PageUp = vorherige, ArrowRight/PageDown = naechste
 *
 * Yusufs Unterschrift ist bereits im PDF eingebettet — der Kunde sieht,
 * dass der andere schon signiert hat. Die Field-Overlays zeigen wo er
 * selbst noch unterschreibt bzw. wo das Datum eingesetzt wird.
 */
export default function ContractPdfView({
  pdfUrl,
  fields,
  customerCity,
}: Props) {
  // Vorschau fuer das Ort/Datum-Overlay: "Bünde, den 15.11.2025"
  const previewDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const datePreview = customerCity
    ? `${customerCity}, den ${previewDate}`
    : `den ${previewDate}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(800);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      setPageWidth(Math.min(900, w - 8));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const onLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  const goPrev = useCallback(
    () => setCurrentPage((p) => Math.max(1, p - 1)),
    [],
  );
  const goNext = useCallback(
    () => setCurrentPage((p) => Math.min(numPages || 1, p + 1)),
    [numPages],
  );

  // Tastatur-Steuerung. Nicht triggern wenn User in einem Input/
  // contentEditable tippt (z.B. Namensfeld).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  // Signaturseite ist die Seite mit dem customer_signature-Feld —
  // Shortcut fuer den Kunden, damit er direkt hinspringen kann.
  const signaturePage = fields.find(
    (f) => f.type === 'customer_signature',
  )?.page;

  const pageFields = fields.filter((f) => f.page === currentPage);

  return (
    <div ref={containerRef} className="space-y-3">
      <PdfToolbar
        currentPage={currentPage}
        numPages={numPages}
        onPrev={goPrev}
        onNext={goNext}
        onJumpToSignature={
          signaturePage && signaturePage !== currentPage
            ? () => setCurrentPage(signaturePage)
            : undefined
        }
        signaturePage={signaturePage}
      />

      <div className="flex justify-center">
        <div className="relative bg-white border border-gray-200 rounded shadow-sm inline-block">
          <Document
            file={pdfUrl}
            onLoadSuccess={onLoad}
            loading={
              <div
                className="flex items-center justify-center text-sm text-gray-500"
                style={{ width: pageWidth, height: pageWidth * 1.414 }}
              >
                Lade PDF…
              </div>
            }
            error={
              <div className="p-8 text-sm text-red-700">
                PDF konnte nicht geladen werden.
              </div>
            }
          >
            {numPages > 0 && (
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            )}
          </Document>
          {pageFields.map((f, i) => (
            <PreviewField key={i} field={f} datePreview={datePreview} />
          ))}
        </div>
      </div>

      {/* Zweite Toolbar unten — bei langen Dokumenten praktisch, damit
          man nach dem Lesen nicht wieder hochscrollen muss. */}
      {numPages > 1 && (
        <PdfToolbar
          currentPage={currentPage}
          numPages={numPages}
          onPrev={goPrev}
          onNext={goNext}
          onJumpToSignature={
            signaturePage && signaturePage !== currentPage
              ? () => setCurrentPage(signaturePage)
              : undefined
          }
          signaturePage={signaturePage}
        />
      )}
    </div>
  );
}

interface ToolbarProps {
  currentPage: number;
  numPages: number;
  onPrev: () => void;
  onNext: () => void;
  onJumpToSignature?: () => void;
  signaturePage?: number;
}

function PdfToolbar({
  currentPage,
  numPages,
  onPrev,
  onNext,
  onJumpToSignature,
  signaturePage,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Vorherige Seite"
        >
          ← Vorherige
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={numPages > 0 && currentPage >= numPages}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Naechste Seite"
        >
          Nächste →
        </button>
      </div>

      <div className="text-sm text-gray-700 tabular-nums">
        Seite <span className="font-semibold">{currentPage}</span> von{' '}
        <span className="font-semibold">{numPages || '…'}</span>
      </div>

      <div className="flex items-center gap-2">
        {onJumpToSignature && signaturePage && (
          <button
            type="button"
            onClick={onJumpToSignature}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-blue-300 bg-blue-50 text-sm text-blue-700 hover:bg-blue-100"
          >
            → Zur Unterschrift (Seite {signaturePage})
          </button>
        )}
      </div>
    </div>
  );
}

function PreviewField({
  field,
  datePreview,
}: {
  field: ContractField;
  datePreview: string;
}) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${field.x * 100}%`,
    top: `${field.y * 100}%`,
    width: `${field.width * 100}%`,
    height: `${field.height * 100}%`,
  };

  if (field.type === 'kolac_signature') {
    return (
      <div style={style}>
        <img
          src="/images/unterschrift-yusuf.png"
          alt="Unterschrift Yusuf Kolac"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  if (field.type === 'customer_signature') {
    return (
      <div
        style={{ ...style, border: '2px dashed #2563eb' }}
        className="flex items-center justify-center text-[10px] text-blue-700 bg-blue-50/40"
      >
        Deine Unterschrift kommt hier hin
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div
        style={{ ...style, border: '1px dashed #d97706' }}
        className="flex items-center justify-center text-[10px] text-amber-700 bg-amber-50/40"
        title="Wird beim Unterschreiben automatisch eingesetzt."
      >
        {datePreview}
      </div>
    );
  }

  return null;
}
