'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Phone } from 'lucide-react';
import type { Customer, LeadStage } from '@/lib/types';
import { customerName, domainOf, LEAD_STAGES } from '@/lib/crm';
import { tsToMillis } from '@/lib/utils';

export interface LeadItem {
  customer: Customer;
  stage: LeadStage;
  /** Neuester SEO-Check bzw. Anlage der Akte. */
  at: number;
  /** Neuer Anrufversuch ist heute fällig oder überfällig. */
  due: boolean;
}

interface Props {
  items: LeadItem[];
  onMove: (customer: Customer, stage: LeadStage) => void;
  /** Akte im Pop-up öffnen. */
  onOpen: (customerId: string) => void;
}

function wannText(ms: number): string {
  if (!ms) return '';
  const tage = Math.floor((new Date().setHours(23, 59, 59, 999) - ms) / 86400000);
  if (tage <= 0) return 'heute';
  if (tage === 1) return 'gestern';
  if (tage < 30) return `vor ${tage} Tagen`;
  return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function LeadBoard({ items, onMove, onOpen }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobilStage, setMobilStage] = useState<LeadStage>('neu');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const byStage = (stage: LeadStage) => items.filter((i) => i.stage === stage).sort((a, b) => b.at - a.at);
  const active = items.find((i) => i.customer.id === activeId) ?? null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const item = items.find((i) => i.customer.id === String(e.active.id));
    const stage = String(e.over.id) as LeadStage;
    if (item && item.stage !== stage) onMove(item.customer, stage);
  };

  return (
    <>
      {/* Handy: eine Spalte, Wechsel über die Knöpfe, Verschieben über das Menü an der Karte. */}
      <div className="md:hidden">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {LEAD_STAGES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setMobilStage(s.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                mobilStage === s.key ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              {s.label} <span className="opacity-60">{byStage(s.key).length}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {byStage(mobilStage).map((i) => (
            <LeadCard key={i.customer.id} item={i} onMove={onMove} onOpen={onOpen} draggable={false} />
          ))}
          {byStage(mobilStage).length === 0 && <Empty stage={mobilStage} />}
        </div>
      </div>

      <div className="hidden md:block">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {LEAD_STAGES.map((s) => {
              const list = byStage(s.key);
              return (
                <Column key={s.key} id={s.key} label={s.label} hint={s.hint} color={s.color} count={list.length}>
                  {list.map((i) => (
                    <LeadCard key={i.customer.id} item={i} onMove={onMove} onOpen={onOpen} draggable />
                  ))}
                  {list.length === 0 && <Empty stage={s.key} />}
                </Column>
              );
            })}
          </div>
          <DragOverlay>{active ? <LeadCard item={active} onMove={onMove} onOpen={onOpen} draggable={false} overlay /> : null}</DragOverlay>
        </DndContext>
      </div>
    </>
  );
}

function Empty({ stage }: { stage: LeadStage }) {
  return (
    <p className="px-1 py-6 text-center text-xs text-gray-400">
      {stage === 'neu' ? 'Keine neuen SEO-Leads. Alles abgearbeitet.' : 'Noch niemand hier.'}
    </p>
  );
}

function Column({
  id,
  label,
  hint,
  color,
  count,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section className="flex w-64 shrink-0 flex-col lg:w-auto lg:min-w-56 lg:flex-1">
      <header className="mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
          <h2 className="text-sm font-semibold text-gray-900">{label}</h2>
          <span className="ml-auto text-xs font-medium text-gray-500">{count}</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      </header>
      <div
        ref={setNodeRef}
        className={`min-h-[60vh] flex-1 space-y-2 rounded-xl border p-2 transition-colors ${
          isOver ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function LeadCard({
  item,
  onMove,
  onOpen,
  draggable,
  overlay,
}: {
  item: LeadItem;
  onMove: (customer: Customer, stage: LeadStage) => void;
  onOpen: (customerId: string) => void;
  draggable: boolean;
  overlay?: boolean;
}) {
  const { customer: c } = item;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: c.id,
    disabled: !draggable || overlay,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const name = customerName(c);
  const domain = domainOf(c);
  const person = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      onClick={() => {
        if (!overlay) onOpen(c.id);
      }}
      className={`card cursor-pointer p-3 transition-shadow hover:shadow-md ${isDragging ? 'opacity-40' : ''} ${
        overlay ? 'rotate-1 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-gray-900">{name}</p>
        <span className="shrink-0 text-[11px] text-gray-400">{wannText(item.at)}</span>
      </div>
      {(person || (domain && domain !== name)) && (
        <p className="mt-0.5 truncate text-xs text-gray-500">{[person, domain !== name ? domain : ''].filter(Boolean).join(' · ')}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {c.wantsCall && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">möchte Rückruf</span>}
        {item.due && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">heute anrufen</span>}
        {!c.phone && item.stage === 'neu' && <span className="text-[11px] text-gray-400">Nummer auf der Website suchen</span>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {c.phone ? (
          <a
            href={`tel:${c.phone.replace(/\s+/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
          >
            <Phone size={12} aria-hidden /> {c.phone}
          </a>
        ) : (
          <span />
        )}
        {!overlay && (
          <select
            aria-label={`${name} verschieben`}
            value={item.stage}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onMove(c, e.target.value as LeadStage)}
            className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] text-gray-600"
          >
            {LEAD_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

export function leadAt(c: Customer): number {
  // Datum des SEO-Checks zählt; Akten aus der Übernahme sind jünger als ihr Check.
  return tsToMillis(c.seoCheckAt) || tsToMillis(c.createdAt);
}
