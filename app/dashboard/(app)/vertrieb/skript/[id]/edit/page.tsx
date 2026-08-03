'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getCallScript, updateCallScript } from '@/lib/firestore';
import type { CallScript } from '@/lib/types';
import ScriptEditor from '@/components/vertrieb/ScriptEditor';

export default function EditCallScriptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [script, setScript] = useState<CallScript | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCallScript(params.id)
      .then(setScript)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="card text-sm text-gray-500">Laedt…</div>;
  if (!script)
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        Skript nicht gefunden.
      </div>
    );

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
          Skript V{script.version} bearbeiten
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Speichern aendert diese Version in-place. Fuer echte
          A/B-Tests lieber eine <strong>neue Version</strong> anlegen.
        </p>
      </header>

      <ScriptEditor
        initial={{
          blocks: script.blocks,
          objections: script.objections,
          note: script.note ?? '',
        }}
        submitLabel="Speichern"
        onSubmit={async (data) => {
          await updateCallScript(script.id, data);
          router.push('/dashboard/vertrieb/skript');
        }}
        onCancel={() => router.push('/dashboard/vertrieb/skript')}
      />
    </div>
  );
}
