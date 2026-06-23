'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { ContractField } from '@/lib/types';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface Props {
  pdfUrl: string;
  fields: ContractField[];
}

/**
 * Read-only PDF-Anzeige für den Kunden im Signing-Flow. Yusufs
 * Unterschrift wird schon eingeblendet, damit der Kunde sieht: der
 * andere hat bereits unterschrieben.
 */
export default function ContractPdfView({ pdfUrl, fields }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(800);
  const [numPages, setNumPages] = useState(0);

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
  }, []);

  const pages = useMemo(
    () => Array.from({ length: numPages }, (_, i) => i + 1),
    [numPages],
  );

  return (
    <div ref={containerRef} className="space-y-3">
      <Document
        file={pdfUrl}
        onLoadSuccess={onLoad}
        loading={<div className="text-sm text-gray-500">Lade PDF…</div>}
        error={
          <div className="text-sm text-red-700">
            PDF konnte nicht geladen werden.
          </div>
        }
      >
        {pages.map((p) => {
          const pageFields = fields.filter((f) => f.page === p);
          return (
            <div
              key={p}
              className="relative bg-white border border-gray-200 rounded inline-block mx-auto block"
            >
              <Page
                pageNumber={p}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
              {pageFields.map((f, i) => (
                <PreviewField key={i} field={f} />
              ))}
            </div>
          );
        })}
      </Document>
    </div>
  );
}

function PreviewField({ field }: { field: ContractField }) {
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
        className="flex items-center justify-center text-[10px] text-blue-700"
      >
        Deine Unterschrift kommt hier hin
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div
        style={{ ...style, border: '1px dashed #d97706' }}
        className="flex items-center justify-center text-[10px] text-amber-700"
      >
        Ort + Datum (automatisch)
      </div>
    );
  }

  return null;
}
