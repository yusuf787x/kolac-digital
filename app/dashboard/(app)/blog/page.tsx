'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import {
  listBlogPosts,
  listBlogTopics,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  createBlogTopic,
  updateBlogTopic,
  deleteBlogTopic,
} from '@/lib/firestore';
import type { BlogPost, BlogTopic, BlogCategory } from '@/lib/types';
import { BLOG_CATEGORIES } from '@/lib/types';
import { formatDateDE } from '@/lib/utils';
import { estimateReadingMinutes } from '@/lib/blog-markdown';
import { authedFetch } from '@/lib/api-client';

type Tab = 'posts' | 'topics';

export default function BlogDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [topics, setTopics] = useState<BlogTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Formular fuer ein neues Thema
  const [newTitle, setNewTitle] = useState('');
  const [newAngle, setNewAngle] = useState('');
  const [newCategory, setNewCategory] = useState<BlogCategory>(
    'Webseiten mit System',
  );
  const [newKeywords, setNewKeywords] = useState('');

  const refresh = async () => {
    const [p, t] = await Promise.all([listBlogPosts(), listBlogTopics()]);
    setPosts(p);
    setTopics(t);
  };

  useEffect(() => {
    refresh()
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const publishedCount = useMemo(
    () => posts.filter((p) => p.status === 'published').length,
    [posts],
  );
  const openTopics = useMemo(
    () => topics.filter((t) => t.status === 'open'),
    [topics],
  );

  const addTopic = async () => {
    if (!newTitle.trim()) return;
    try {
      await createBlogTopic({
        title: newTitle.trim(),
        angle: newAngle.trim(),
        category: newCategory,
        targetKeywords: newKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        priority: topics.length + 1,
        status: 'open',
        generatedPostId: null,
      });
      setNewTitle('');
      setNewAngle('');
      setNewKeywords('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /** Erzeugt aus einem Thema einen Entwurf und legt ihn an. */
  const generate = async (topic: BlogTopic) => {
    setGeneratingId(topic.id);
    setStatus('Artikel wird geschrieben. Das dauert ein bis zwei Minuten.');
    setError(null);
    try {
      const res = await authedFetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: topic.title,
          angle: topic.angle,
          category: topic.category,
          keywords: topic.targetKeywords,
          existingTitles: posts.map((p) => p.title),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const a = json.data;
      const postId = await createBlogPost({
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        tldr: a.tldr,
        body: a.body,
        category: topic.category,
        targetKeywords: a.targetKeywords ?? topic.targetKeywords,
        faq: a.faq ?? [],
        metaTitle: a.metaTitle,
        metaDescription: a.metaDescription,
        status: 'draft',
        heroEmoji: a.heroEmoji || '📄',
        readingMinutes: estimateReadingMinutes(a.body),
        source: 'ai',
        publishedAt: null,
      });
      await updateBlogTopic(topic.id, {
        status: 'generated',
        generatedPostId: postId,
      });
      setStatus('Entwurf ist fertig. Bitte prüfen und dann freigeben.');
      await refresh();
      router.push(`/dashboard/blog/${postId}`);
    } catch (err) {
      setError(`Erstellung fehlgeschlagen: ${(err as Error).message}`);
      setStatus(null);
    } finally {
      setGeneratingId(null);
    }
  };

  const togglePublish = async (p: BlogPost) => {
    const next = p.status === 'published' ? 'draft' : 'published';
    if (
      next === 'published' &&
      !confirm(`"${p.title}" jetzt veröffentlichen?`)
    )
      return;
    try {
      await updateBlogPost(p.id, {
        status: next,
        publishedAt:
          next === 'published'
            ? (p.publishedAt ?? Timestamp.fromDate(new Date()))
            : p.publishedAt,
      });
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removePost = async (p: BlogPost) => {
    if (!confirm(`"${p.title}" wirklich löschen?`)) return;
    await deleteBlogPost(p.id);
    await refresh();
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Blog</h1>
          <p className="mt-1 text-sm text-gray-500">
            {publishedCount} veröffentlicht · {posts.length - publishedCount}{' '}
            Entwürfe · {openTopics.length} Themen in der Warteschlange
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Blog ansehen
          </a>
          <Link href="/dashboard/blog/neu" className="btn-primary">
            + Artikel schreiben
          </Link>
        </div>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {status && (
        <div className="card mb-4 bg-blue-50 border-blue-200 text-sm text-blue-800">
          {status}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('posts')}
          className={tab === 'posts' ? 'btn-primary' : 'btn-secondary'}
        >
          Artikel ({posts.length})
        </button>
        <button
          onClick={() => setTab('topics')}
          className={tab === 'topics' ? 'btn-primary' : 'btn-secondary'}
        >
          Themen ({openTopics.length})
        </button>
      </div>

      {tab === 'posts' && (
        <>
          {posts.length === 0 ? (
            <div className="card text-sm text-gray-600">
              Noch keine Artikel. Leg ein Thema an und lass daraus einen
              Entwurf schreiben, oder schreib einen Artikel selbst.
            </div>
          ) : (
            <div className="card p-0 table-wrap">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3" data-wrap>
                      Titel
                    </th>
                    <th className="text-left px-4 py-3">Kategorie</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Quelle</th>
                    <th className="text-left px-4 py-3">Datum</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {posts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3" data-wrap>
                        <Link
                          href={`/dashboard/blog/${p.id}`}
                          className="font-medium text-gray-900 hover:text-brand-blue"
                        >
                          {p.heroEmoji} {p.title}
                        </Link>
                        <div className="text-xs text-gray-500 font-mono">
                          /blog/{p.slug}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{p.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            p.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {p.status === 'published'
                            ? 'veröffentlicht'
                            : 'Entwurf'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {p.source === 'ai' ? 'automatisch' : 'selbst'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {p.publishedAt
                          ? formatDateDE(p.publishedAt.toDate())
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => togglePublish(p)}
                          className="text-xs font-medium text-brand-blue hover:underline mr-3"
                        >
                          {p.status === 'published'
                            ? 'zurückziehen'
                            : 'freigeben'}
                        </button>
                        <button
                          onClick={() => removePost(p)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'topics' && (
        <>
          <section className="card mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Thema in die Warteschlange legen
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Arbeitstitel *</label>
                <input
                  className="input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Was kostet eine Webseite in Bielefeld?"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Worauf soll es hinauslaufen?</label>
                <input
                  className="input"
                  value={newAngle}
                  onChange={(e) => setNewAngle(e.target.value)}
                  placeholder="Ehrliche Preisspanne zeigen und erklären, wovon der Preis abhängt."
                />
              </div>
              <div>
                <label className="label">Kategorie</label>
                <select
                  className="input"
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as BlogCategory)
                  }
                >
                  {BLOG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  Zielbegriffe (mit Komma trennen)
                </label>
                <input
                  className="input"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="webseite kosten bielefeld, webagentur preise"
                />
              </div>
            </div>
            <button
              onClick={addTopic}
              disabled={!newTitle.trim()}
              className="btn-primary mt-4"
            >
              Thema hinzufügen
            </button>
          </section>

          {topics.length === 0 ? (
            <div className="card text-sm text-gray-600">
              <p className="mb-3">
                Noch keine Themen. Du kannst oben eins eintragen, oder die
                vorbereiteten Start-Themen laden.
              </p>
              <Link
                href="/dashboard/blog/themen-laden"
                className="btn-secondary"
              >
                Start-Themen laden
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {topics.map((t) => (
                <div
                  key={t.id}
                  className={`card ${t.status !== 'open' ? 'opacity-60' : ''}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-gray-400">
                          #{t.priority}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          {t.category}
                        </span>
                        {t.status !== 'open' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {t.status === 'generated'
                              ? 'geschrieben'
                              : 'übersprungen'}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900">{t.title}</p>
                      {t.angle && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          {t.angle}
                        </p>
                      )}
                      {t.targetKeywords.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {t.targetKeywords.join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {t.status === 'open' && (
                        <button
                          onClick={() => generate(t)}
                          disabled={generatingId !== null}
                          className="btn-primary text-xs"
                        >
                          {generatingId === t.id
                            ? 'Schreibt…'
                            : 'Artikel schreiben'}
                        </button>
                      )}
                      {t.generatedPostId && (
                        <Link
                          href={`/dashboard/blog/${t.generatedPostId}`}
                          className="btn-secondary text-xs"
                        >
                          Entwurf öffnen
                        </Link>
                      )}
                      <button
                        onClick={async () => {
                          await deleteBlogTopic(t.id);
                          await refresh();
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
