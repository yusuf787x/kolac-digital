'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getJson } from '@/components/seo/admin/api';
import ReportView from '@/components/seo/portal/ReportView';
import type { PortalData } from '@/lib/seo/view';

/**
 * Vorschau des Kundenportals mit denselben Komponenten. Zeigt auch noch
 * nicht freigegebene Monate, Massnahmen aber nur, wenn sie veroeffentlicht
 * sind, also genau das, was der Kunde nach der Freigabe sehen wird.
 */
export default function SeoPreviewPage() {
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <PreviewInner />
    </Suspense>
  );
}

function PreviewInner() {
  const { id } = useParams<{ id: string }>();
  const month = useSearchParams().get('monat') ?? '';
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    getJson<PortalData>(`/api/seo/preview?customerId=${id}&month=${month}`)
      .then(setData)
      .catch((err) => setError((err as Error).message));
  }, [id, month]);

  if (error) return <div className="card text-sm text-red-700">{error}</div>;
  if (!data) return <div className="card text-sm text-gray-500">Lädt Vorschau…</div>;
  return (
    <div className="mx-auto max-w-5xl">
      <ReportView data={data} monthBaseHref={`/dashboard/seo/${id}/vorschau?monat=`} preview />
    </div>
  );
}
