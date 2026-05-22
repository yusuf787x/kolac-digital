'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import type { Customer, Deal } from '@/lib/types';
import { formatEUR, formatDateDE } from '@/lib/utils';

interface Props {
  deal: Deal;
  customer?: Customer;
  /** Letzter Kontakt (z.B. neueste Aktivität) – optional. */
  lastContact?: Date | null;
  /** True, wenn eine Aktivität dieses Deals überfällig ist. */
  overdue?: boolean;
  /** Wird im DragOverlay genutzt, um Drag-Listener zu unterdrücken. */
  overlay?: boolean;
}

export default function DealCard({
  deal,
  customer,
  lastContact,
  overdue,
  overlay,
}: Props) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: deal.id, disabled: overlay });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const name =
    customer?.company ||
    `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim() ||
    'Unbekannter Kunde';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!overlay) router.push(`/dashboard/vertrieb/${deal.id}`);
      }}
      className={`group cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? 'opacity-40' : ''
      } ${overlay ? 'shadow-lg rotate-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 leading-snug">
          {name}
        </p>
        {overdue && (
          <span
            className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-red-500"
            title="Überfällige Aktivität"
          />
        )}
      </div>

      {deal.title && (
        <p className="mt-1 text-xs text-gray-600 line-clamp-2">{deal.title}</p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">
          {deal.value != null ? formatEUR(deal.value) : '—'}
        </span>
        {lastContact && (
          <span className="text-[11px] text-gray-400">
            {formatDateDE(lastContact)}
          </span>
        )}
      </div>
    </div>
  );
}
