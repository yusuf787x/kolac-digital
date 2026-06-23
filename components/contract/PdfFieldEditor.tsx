'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type {
  ContractField,
  ContractFieldType,
} from '@/lib/types';

// Worker liegt unter /public/pdf.worker.min.mjs — selbst gehostet,
// damit der Editor auch offline und ohne CDN-Abhängigkeit läuft.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfFieldEditorProps {
  pdfUrl: string;
  fields: ContractField[];
  onChange: (fields: ContractField[]) => void;
  /** Wenn true: Felder zeigen die "Kolac"-Unterschrift als Bildvorschau. */
  showKolacPreview?: boolean;
}

interface FieldTypeDef {
  type: ContractFieldType;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  defaultWidth: number;
  defaultHeight: number;
}

const FIELD_TYPES: FieldTypeDef[] = [
  {
    type: 'customer_signature',
    label: 'Kundenunterschrift',
    shortLabel: 'Kunde',
    color: '#1d4ed8',
    bgColor: 'rgba(37, 99, 235, 0.12)',
    defaultWidth: 0.28,
    defaultHeight: 0.05,
  },
  {
    type: 'kolac_signature',
    label: 'Deine Unterschrift',
    shortLabel: 'Yusuf',
    color: '#15803d',
    bgColor: 'rgba(34, 197, 94, 0.12)',
    defaultWidth: 0.28,
    defaultHeight: 0.05,
  },
  {
    type: 'date',
    label: 'Ort + Datum (auto)',
    shortLabel: 'Ort & Datum',
    color: '#b45309',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    defaultWidth: 0.32,
    defaultHeight: 0.03,
  },
];

const fieldDef = (t: ContractFieldType): FieldTypeDef =>
  FIELD_TYPES.find((f) => f.type === t) ?? FIELD_TYPES[0];

type DragState =
  | { kind: 'idle' }
  | {
      kind: 'placing';
      type: ContractFieldType;
    }
  | {
      kind: 'moving';
      index: number;
      offsetX: number; // pct innerhalb des Feldes
      offsetY: number;
    }
  | {
      kind: 'resizing';
      index: number;
      startW: number;
      startH: number;
      startX: number;
      startY: number;
    };

export default function PdfFieldEditor({
  pdfUrl,
  fields,
  onChange,
  showKolacPreview = true,
}: PdfFieldEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [drag, setDrag] = useState<DragState>({ kind: 'idle' });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      // Cap auf max 900px für lesbare Darstellung
      setPageWidth(Math.min(900, w - 8));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const onDocLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const pickType = (type: ContractFieldType) => {
    setDrag({ kind: 'placing', type });
  };

  // Klick auf eine Seite während "placing": Feld an Klickposition einfügen.
  const onPageClick = (
    e: React.MouseEvent<HTMLDivElement>,
    pageNumber: number,
  ) => {
    if (drag.kind !== 'placing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const def = fieldDef(drag.type);
    const newField: ContractField = {
      type: drag.type,
      page: pageNumber,
      x: Math.max(0, Math.min(1 - def.defaultWidth, x - def.defaultWidth / 2)),
      y: Math.max(
        0,
        Math.min(1 - def.defaultHeight, y - def.defaultHeight / 2),
      ),
      width: def.defaultWidth,
      height: def.defaultHeight,
    };
    onChange([...fields, newField]);
    setDrag({ kind: 'idle' });
  };

  // Drag-Move oder Resize verarbeiten.
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (drag.kind !== 'moving' && drag.kind !== 'resizing') return;
      // Wir brauchen die Bounding-Box der Page, auf der das Feld liegt.
      const field = fields[drag.kind === 'moving' ? drag.index : drag.index];
      if (!field) return;
      const pageEl = document.querySelector<HTMLDivElement>(
        `[data-pdf-page="${field.page}"]`,
      );
      if (!pageEl) return;
      const rect = pageEl.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      if (drag.kind === 'moving') {
        const next = [...fields];
        next[drag.index] = {
          ...field,
          x: Math.max(0, Math.min(1 - field.width, px - drag.offsetX)),
          y: Math.max(0, Math.min(1 - field.height, py - drag.offsetY)),
        };
        onChange(next);
      } else {
        const next = [...fields];
        const newW = Math.max(0.05, drag.startW + (px - drag.startX));
        const newH = Math.max(0.02, drag.startH + (py - drag.startY));
        next[drag.index] = {
          ...field,
          width: Math.min(1 - field.x, newW),
          height: Math.min(1 - field.y, newH),
        };
        onChange(next);
      }
    },
    [drag, fields, onChange],
  );

  const onMouseUp = useCallback(() => {
    if (drag.kind === 'moving' || drag.kind === 'resizing') {
      setDrag({ kind: 'idle' });
    }
  }, [drag]);

  useEffect(() => {
    if (drag.kind === 'moving' || drag.kind === 'resizing') {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [drag, onMouseMove, onMouseUp]);

  const startMove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    const field = fields[index];
    if (!field) return;
    const pageEl = document.querySelector<HTMLDivElement>(
      `[data-pdf-page="${field.page}"]`,
    );
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setDrag({
      kind: 'moving',
      index,
      offsetX: px - field.x,
      offsetY: py - field.y,
    });
  };

  const startResize = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    const field = fields[index];
    if (!field) return;
    const pageEl = document.querySelector<HTMLDivElement>(
      `[data-pdf-page="${field.page}"]`,
    );
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setDrag({
      kind: 'resizing',
      index,
      startW: field.width,
      startH: field.height,
      startX: px,
      startY: py,
    });
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const pages = useMemo(
    () => Array.from({ length: numPages }, (_, i) => i + 1),
    [numPages],
  );

  return (
    <div className="space-y-4">
      <div className="card p-4 sticky top-[68px] z-10 bg-white shadow-sm">
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
          Feld platzieren
        </p>
        <div className="flex flex-wrap gap-2">
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.type}
              type="button"
              onClick={() => pickType(ft.type)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                drag.kind === 'placing' && drag.type === ft.type
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
              }`}
              style={
                drag.kind === 'placing' && drag.type === ft.type
                  ? undefined
                  : { borderLeftWidth: 4, borderLeftColor: ft.color }
              }
            >
              + {ft.label}
            </button>
          ))}
          {drag.kind === 'placing' && (
            <button
              type="button"
              onClick={() => setDrag({ kind: 'idle' })}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-800"
            >
              Abbrechen
            </button>
          )}
        </div>
        {drag.kind === 'placing' && (
          <p className="mt-2 text-xs text-brand-blue">
            Klick auf die gewünschte Stelle im PDF zum Platzieren.
          </p>
        )}
      </div>

      <div ref={containerRef} className="space-y-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocLoad}
          loading={
            <div className="card text-sm text-gray-500">Lade PDF…</div>
          }
          error={
            <div className="card text-sm text-red-700 bg-red-50 border-red-200">
              PDF konnte nicht geladen werden.
            </div>
          }
        >
          {pages.map((p) => (
            <PageWrapper
              key={p}
              pageNumber={p}
              width={pageWidth}
              fields={fields.filter((f) => f.page === p)}
              fieldIndexes={fields
                .map((f, i) => (f.page === p ? i : -1))
                .filter((i) => i >= 0)}
              onClick={(e) => onPageClick(e, p)}
              onStartMove={startMove}
              onStartResize={startResize}
              onRemove={removeField}
              placing={drag.kind === 'placing'}
              showKolacPreview={showKolacPreview}
            />
          ))}
        </Document>
      </div>
    </div>
  );
}

interface PageWrapperProps {
  pageNumber: number;
  width: number;
  fields: ContractField[];
  fieldIndexes: number[];
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onStartMove: (e: React.MouseEvent, index: number) => void;
  onStartResize: (e: React.MouseEvent, index: number) => void;
  onRemove: (index: number) => void;
  placing: boolean;
  showKolacPreview: boolean;
}

function PageWrapper({
  pageNumber,
  width,
  fields,
  fieldIndexes,
  onClick,
  onStartMove,
  onStartResize,
  onRemove,
  placing,
  showKolacPreview,
}: PageWrapperProps) {
  return (
    <div className="flex justify-center">
      <div
        className="relative inline-block bg-white shadow-sm border border-gray-200 rounded overflow-hidden"
        data-pdf-page={pageNumber}
        onClick={onClick}
        style={{ cursor: placing ? 'crosshair' : 'default' }}
      >
        <Page
          pageNumber={pageNumber}
          width={width}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
        {fields.map((f, i) => {
          const def = fieldDef(f.type);
          const realIndex = fieldIndexes[i];
          const isKolac = f.type === 'kolac_signature' && showKolacPreview;
          return (
            <div
              key={`${realIndex}`}
              className="absolute group"
              style={{
                left: `${f.x * 100}%`,
                top: `${f.y * 100}%`,
                width: `${f.width * 100}%`,
                height: `${f.height * 100}%`,
                border: `2px dashed ${def.color}`,
                background: def.bgColor,
                cursor: 'move',
              }}
              onMouseDown={(e) => onStartMove(e, realIndex)}
            >
              {isKolac && (
                <img
                  src="/images/unterschrift-yusuf.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-90"
                />
              )}
              <span
                className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                style={{ background: def.color }}
              >
                {def.shortLabel}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(realIndex);
                }}
                className="absolute -top-5 -right-1 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:text-red-600 text-[12px] leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                title="Feld entfernen"
              >
                ×
              </button>
              <div
                className="absolute right-0 bottom-0 w-3 h-3 cursor-se-resize bg-white border border-gray-400"
                onMouseDown={(e) => onStartResize(e, realIndex)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
