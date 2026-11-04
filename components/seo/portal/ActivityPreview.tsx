'use client';

import { useState } from 'react';
import type { PortalActivity } from '@/lib/seo/view';
import { ActivityList } from './parts';

/**
 * Massnahmen im Monatsbericht: zuerst nur die neuesten, der Rest per Klick.
 * Haelt die Liste kurz, damit die Suchbegriffe darunter schnell erreichbar sind.
 */
export default function ActivityPreview({ items, initial = 4 }: { items: PortalActivity[]; initial?: number }) {
  const [open, setOpen] = useState(false);
  const hidden = items.length - initial;
  const visible = open || hidden <= 0 ? items : items.slice(0, initial);

  return (
    <div>
      <ActivityList items={visible} />
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-100 pointer-coarse:py-3"
        >
          {open ? 'Weniger anzeigen' : `${hidden} weitere ${hidden === 1 ? 'Maßnahme' : 'Maßnahmen'} anzeigen`}
          <span aria-hidden className={`text-base leading-none transition-transform ${open ? 'rotate-180' : ''}`}>
            ⌄
          </span>
        </button>
      )}
    </div>
  );
}
