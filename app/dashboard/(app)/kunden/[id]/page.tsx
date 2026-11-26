'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import KundenAkte from '@/components/crm/KundenAkte';

export default function KundeDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <Suspense fallback={<div className="card text-sm text-gray-500">Lädt…</div>}>
      <KundenAkte id={params.id} />
    </Suspense>
  );
}
