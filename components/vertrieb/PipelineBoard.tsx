'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Timestamp } from 'firebase/firestore';
import DealCard from './DealCard';
import { createActivity, updateDeal } from '@/lib/firestore';
import { ALL_STAGES, stageLabel } from '@/lib/sales';
import { formatEUR } from '@/lib/utils';
import type { Customer, Deal, DealStage } from '@/lib/types';

interface Props {
  deals: Deal[];
  customers: Map<string, Customer>;
  overdueDealIds: Set<string>;
  lastContact: Map<string, Date>;
  /** Wird nach einer Stufenänderung aufgerufen, um Daten neu zu laden. */
  onChange: () => void;
}

export default function PipelineBoard({
  deals,
  customers,
  overdueDealIds,
  lastContact,
  onChange,
}: Props) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const activeDeal = deals.find((d) => d.id === activeId) ?? null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const dealId = String(active.id);
    const newStage = String(over.id) as DealStage;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    const oldStage = deal.stage;

    try {
      await updateDeal(dealId, { stage: newStage });
      // Stufenwechsel automatisch in der Timeline protokollieren.
      await createActivity({
        dealId,
        type: 'notiz',
        description: `Stufe geändert: ${stageLabel(oldStage)} → ${stageLabel(newStage)}`,
        emailSubject: null,
        emailBody: null,
        dueDate: null,
        completed: true,
        completedAt: Timestamp.now(),
      });
      onChange();

      if (newStage === 'abgeschlossen') {
        const wantInvoice = window.confirm(
          'Deal abgeschlossen! 🎉 Möchtest du direkt eine Rechnung erstellen?',
        );
        if (wantInvoice) {
          router.push(`/dashboard/rechnungen/neu?customerId=${deal.customerId}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Stufe konnte nicht aktualisiert werden.');
      onChange();
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {ALL_STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.key);
          const sum = stageDeals.reduce((acc, d) => acc + (d.value ?? 0), 0);
          return (
            <Column
              key={stage.key}
              id={stage.key}
              label={stage.label}
              color={stage.color}
              count={stageDeals.length}
              sum={sum}
            >
              {stageDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  customer={customers.get(deal.customerId)}
                  overdue={overdueDealIds.has(deal.id)}
                  lastContact={lastContact.get(deal.id) ?? null}
                />
              ))}
            </Column>
          );
        })}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <DealCard
            deal={activeDeal}
            customer={customers.get(activeDeal.customerId)}
            overdue={overdueDealIds.has(activeDeal.id)}
            lastContact={lastContact.get(activeDeal.id) ?? null}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  id,
  label,
  color,
  count,
  sum,
  children,
}: {
  id: string;
  label: string;
  color: string;
  count: number;
  sum: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      <div
        className="rounded-t-lg px-3 py-2 text-white"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{label}</span>
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-medium">
            {count}
          </span>
        </div>
        <p className="text-xs text-white/80">{formatEUR(sum)}</p>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-b-lg border border-t-0 border-gray-200 p-2 transition-colors min-h-[60vh] ${
          isOver ? 'bg-blue-50' : 'bg-gray-50'
        }`}
      >
        {children}
        {count === 0 && (
          <p className="px-1 py-4 text-center text-xs text-gray-400">
            Keine Deals
          </p>
        )}
      </div>
    </div>
  );
}
