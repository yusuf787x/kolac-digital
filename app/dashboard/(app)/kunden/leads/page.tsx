'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import { createActivity, listCustomers, updateCustomer } from '@/lib/firestore';
import { isOwnActivity, LEAD_STAGE_LABEL, leadStageOf, leadStagePatch, listActivitiesByCustomer } from '@/lib/crm';
import type { Customer, LeadStage } from '@/lib/types';
import { tsToMillis } from '@/lib/utils';
import { authedFetch } from '@/lib/api-client';
import LeadBoard, { leadAt, type LeadItem } from '@/components/crm/LeadBoard';
import KundenAkte from '@/components/crm/KundenAkte';

/**
 * Akten ohne gesetzte Spalte, die als „Neu“ gelten, aber schon eine eigene Notiz,
 * einen Anruf oder eine Mail haben: einmalig weiterschieben (gesprochen bzw. kontaktiert).
 */
async function bereinigeNeue(customers: Customer[]): Promise<Map<string, LeadStage>> {
  const kandidaten = customers.filter((c) => !c.leadStage && leadStageOf(c) === 'neu');
  const moves = new Map<string, LeadStage>();
  await Promise.all(
    kandidaten.map(async (c) => {
      const acts = (await listActivitiesByCustomer(c.id).catch(() => [])).filter(isOwnActivity);
      if (acts.length === 0) return;
      const stage: LeadStage = acts.every((a) => a.type === 'email') ? 'kontaktiert' : 'gesprochen';
      await updateCustomer(c.id, { leadStage: stage });
      moves.set(c.id, stage);
    }),
  );
  return moves;
}

export default function SeoLeadsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Neue SEO-Checks als Akten anlegen (serverseitig höchstens alle 10 Minuten).
      await authedFetch('/api/crm/sync', { method: 'POST' }).catch(() => null);
      const list = await listCustomers();
      const moves = await bereinigeNeue(list);
      setCustomers(moves.size ? list.map((c) => (moves.has(c.id) ? { ...c, leadStage: moves.get(c.id) } : c)) : list);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo<LeadItem[]>(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return customers.flatMap((c) => {
      const stage = leadStageOf(c);
      if (!stage) return [];
      const due =
        (stage === 'kontaktiert' || stage === 'gesprochen') &&
        (c.callStatus === 'nicht-erreicht' || c.callStatus === 'spaeter') &&
        !!c.nextStepAt &&
        tsToMillis(c.nextStepAt) <= end.getTime();
      return [{ customer: c, stage, at: leadAt(c), due }];
    });
  }, [customers]);

  const neu = items.filter((i) => i.stage === 'neu').length;

  const move = async (c: Customer, stage: LeadStage) => {
    const from = leadStageOf(c);
    const patch = leadStagePatch(c, stage);
    setCustomers((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
    try {
      await updateCustomer(c.id, patch);
      await createActivity({
        customerId: c.id,
        type: 'notiz',
        description: `Lead-Status: ${from ? LEAD_STAGE_LABEL[from] : 'ohne'} → ${LEAD_STAGE_LABEL[stage]}`,
        emailSubject: null,
        emailBody: null,
        dueDate: null,
        completed: true,
        completedAt: Timestamp.now(),
        auto: true,
      });
    } catch (err) {
      setError(`Verschieben fehlgeschlagen: ${(err as Error).message}`);
      load();
    }
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>SEO-Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Lädt …'
              : neu > 0
                ? `${neu} neue${neu === 1 ? 'r' : ''} Lead${neu === 1 ? '' : 's'} zum Anrufen. Links die neuesten, ziehen oder über das Menü verschieben.`
                : 'Keine neuen Leads. Ziehen oder über das Menü verschieben.'}
          </p>
        </div>
        <Link href="/dashboard/kunden" className="btn-secondary">
          Alle Kontakte
        </Link>
      </header>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[50vh] w-64 shrink-0 animate-pulse rounded-xl bg-gray-100 lg:flex-1" />
          ))}
        </div>
      ) : (
        <LeadBoard items={items} onMove={move} onOpen={setOpenId} />
      )}

      {openId && (
        <AktePopup
          id={openId}
          onClose={() => {
            setOpenId(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/** Akte als Fenster über dem Board: Klick daneben, Escape oder „Schließen“ führt zurück. */
function AktePopup({ id, onClose }: { id: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Kundenakte">
      <button type="button" aria-label="Schließen" className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-6xl overflow-y-auto bg-[var(--k-canvas,#f1f3f6)] p-4 shadow-2xl sm:p-6">
        <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
          <KundenAkte key={id} id={id} embedded onClose={onClose} />
        </Suspense>
      </div>
    </div>
  );
}
