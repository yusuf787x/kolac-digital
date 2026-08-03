'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createCallScriptVersion,
  getActiveCallScript,
} from '@/lib/firestore';
import type { CallScript } from '@/lib/types';
import ScriptEditor from '@/components/vertrieb/ScriptEditor';

export default function NewCallScriptVersionPage() {
  const router = useRouter();
  const [base, setBase] = useState<CallScript | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveCallScript()
      .then(setBase)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card text-sm text-gray-500">Laedt…</div>;

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertrieb/skript"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurueck zum Skript
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">
          Neue Skript-Version
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Startet als Kopie der aktuell aktiven Version (V
          {base?.version ?? '—'}). Beim Speichern wird die neue Version
          <strong> sofort aktiv</strong>, die alte wird archiviert.
        </p>
      </header>

      <ScriptEditor
        initial={{
          blocks: base?.blocks ?? [],
          objections: base?.objections ?? [],
          note: '',
        }}
        submitLabel="Als neue Version speichern & aktivieren"
        onSubmit={async (data) => {
          await createCallScriptVersion(data);
          router.push('/dashboard/vertrieb/skript');
        }}
        onCancel={() => router.push('/dashboard/vertrieb/skript')}
      />
    </div>
  );
}
