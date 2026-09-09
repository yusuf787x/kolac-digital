'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listBlogTopics, createBlogTopic } from '@/lib/firestore';
import { SEED_BLOG_TOPICS } from '@/lib/blog-seed-topics';

/**
 * Einmalige Seite, um die Start-Themen in die Warteschlange zu legen.
 * Themen, die schon vorhanden sind (gleicher Titel), werden
 * uebersprungen. Mehrfaches Ausfuehren legt also nichts doppelt an.
 */
export default function SeedTopicsPage() {
  const [existing, setExisting] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{ added: number; skipped: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const topics = await listBlogTopics();
    setExisting(topics.map((t) => t.title));
  };

  useEffect(() => {
    load()
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const missing = SEED_BLOG_TOPICS.filter((t) => !existing.includes(t.title));

  const run = async () => {
    setRunning(true);
    let added = 0;
    let skipped = SEED_BLOG_TOPICS.length - missing.length;
    try {
      for (let i = 0; i < missing.length; i++) {
        const t = missing[i];
        await createBlogTopic({
          title: t.title,
          angle: t.angle,
          category: t.category,
          targetKeywords: t.targetKeywords,
          priority: existing.length + i + 1,
          status: 'open',
          generatedPostId: null,
        });
        added++;
      }
      setDone({ added, skipped });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/blog"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zum Blog
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          Start-Themen laden
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Legt {SEED_BLOG_TOPICS.length} vorbereitete Themen in die
          Warteschlange. Bereits vorhandene Titel werden übersprungen.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {done && (
        <div className="card mb-4 bg-green-50 border-green-200 text-sm text-green-900">
          {done.added} Themen hinzugefügt, {done.skipped} übersprungen.
        </div>
      )}

      <div className="card mb-4">
        <p className="text-sm text-gray-700 mb-3">
          {missing.length === 0
            ? 'Alle Start-Themen sind bereits angelegt.'
            : `${missing.length} von ${SEED_BLOG_TOPICS.length} Themen fehlen noch.`}
        </p>
        <button
          onClick={run}
          disabled={running || missing.length === 0}
          className="btn-primary"
        >
          {running ? 'Lädt…' : `${missing.length} Themen anlegen`}
        </button>
      </div>

      <div className="space-y-2">
        {SEED_BLOG_TOPICS.map((t) => {
          const already = existing.includes(t.title);
          return (
            <div key={t.title} className={`card ${already ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{t.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{t.angle}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t.category} · {t.targetKeywords.join(' · ')}
                  </p>
                </div>
                {already && (
                  <span className="text-xs text-gray-500 shrink-0">
                    vorhanden
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
