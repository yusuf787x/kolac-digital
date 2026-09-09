'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listBlogPosts,
  listBlogTopics,
  createBlogPost,
  updateBlogTopic,
} from '@/lib/firestore';
import type { BlogPost, BlogTopic, BlogCategory } from '@/lib/types';
import { BLOG_CATEGORIES } from '@/lib/types';
import {
  buildAuthorPrompt,
  parsePastedArticle,
  type PastedArticle,
} from '@/lib/blog-prompt';
import { estimateReadingMinutes } from '@/lib/blog-markdown';
import ArticleBody from '@/components/marketing/ArticleBody';

/**
 * Der Weg vom Thema zum fertigen Artikel, ohne API-Kosten.
 *
 * Schritt 1: Auftragstext kopieren und in einen Claude-Chat einfügen.
 * Schritt 2: Die Antwort zurück in das Feld hier einfügen.
 * Schritt 3: Vorschau prüfen und anlegen.
 */
export default function BlogPastePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get('thema');

  const [topics, setTopics] = useState<BlogTopic[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    topicId ?? '',
  );
  // Freies Thema, falls keins aus der Warteschlange genutzt wird.
  const [freeTitle, setFreeTitle] = useState('');
  const [freeAngle, setFreeAngle] = useState('');
  const [freeCategory, setFreeCategory] = useState<BlogCategory>(
    'Webseiten mit System',
  );
  const [freeKeywords, setFreeKeywords] = useState('');

  const [pasted, setPasted] = useState('');
  const [parsed, setParsed] = useState<PastedArticle | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listBlogTopics(), listBlogPosts()])
      .then(([t, p]) => {
        setTopics(t);
        setPosts(p);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) ?? null,
    [topics, selectedTopicId],
  );

  const prompt = useMemo(() => {
    const base = selectedTopic
      ? {
          title: selectedTopic.title,
          angle: selectedTopic.angle,
          category: selectedTopic.category as string,
          keywords: selectedTopic.targetKeywords,
        }
      : {
          title: freeTitle || 'Thema hier eintragen',
          angle: freeAngle,
          category: freeCategory as string,
          keywords: freeKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        };
    return buildAuthorPrompt({
      ...base,
      existingTitles: posts.map((p) => p.title),
    });
  }, [
    selectedTopic,
    freeTitle,
    freeAngle,
    freeCategory,
    freeKeywords,
    posts,
  ]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        'Kopieren nicht möglich. Markiere den Text im Feld und kopiere ihn von Hand.',
      );
    }
  };

  // Eingefügte Antwort direkt prüfen, damit Fehler früh auffallen.
  useEffect(() => {
    if (!pasted.trim()) {
      setParsed(null);
      setParseError(null);
      return;
    }
    const result = parsePastedArticle(pasted);
    if (result.ok) {
      setParsed(result.data);
      setParseError(null);
    } else {
      setParsed(null);
      setParseError(result.error);
    }
  }, [pasted]);

  const save = async (publish: boolean) => {
    if (!parsed) return;
    setSaving(true);
    setError(null);
    try {
      const category = (parsed.category &&
      BLOG_CATEGORIES.includes(parsed.category as BlogCategory)
        ? parsed.category
        : (selectedTopic?.category ?? freeCategory)) as BlogCategory;

      const postId = await createBlogPost({
        slug: parsed.slug.trim(),
        title: parsed.title.trim(),
        excerpt: parsed.excerpt.trim(),
        tldr: parsed.tldr.trim(),
        keyTakeaways: parsed.keyTakeaways ?? [],
        body: parsed.body,
        category,
        targetKeywords: parsed.targetKeywords ?? [],
        faq: parsed.faq ?? [],
        metaTitle: parsed.metaTitle?.trim() || parsed.title.trim(),
        metaDescription:
          parsed.metaDescription?.trim() || parsed.excerpt.trim(),
        status: publish ? 'published' : 'draft',
        heroEmoji: parsed.heroEmoji || '📄',
        imagePrompt: parsed.imagePrompt ?? '',
        imageAlt: parsed.imageAlt ?? '',
        heroImageUrl: null,
        readingMinutes: estimateReadingMinutes(parsed.body),
        source: 'ai',
        publishedAt: publish
          ? (await import('firebase/firestore')).Timestamp.fromDate(new Date())
          : null,
      });

      if (selectedTopic) {
        await updateBlogTopic(selectedTopic.id, {
          status: 'generated',
          generatedPostId: postId,
        });
      }
      router.push(`/dashboard/blog/${postId}`);
    } catch (err) {
      setError(`Anlegen fehlgeschlagen: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  const openTopics = topics.filter((t) => t.status === 'open');
  const slugTaken =
    parsed && posts.some((p) => p.slug === parsed.slug.trim());

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
          Artikel aus Claude einfügen
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Auftragstext kopieren, in einen Claude-Chat einfügen, Antwort
          zurück hier rein. Keine API-Kosten.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Schritt 1 */}
      <section className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center shrink-0">
            1
          </span>
          <h2 className="text-base font-semibold text-gray-900">
            Thema wählen
          </h2>
        </div>

        {openTopics.length > 0 && (
          <div className="mb-3">
            <label className="label">Aus der Warteschlange</label>
            <select
              className="input"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
            >
              <option value="">— eigenes Thema eintragen —</option>
              {openTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {!selectedTopic && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Arbeitstitel</label>
              <input
                className="input"
                value={freeTitle}
                onChange={(e) => setFreeTitle(e.target.value)}
                placeholder="Was kostet eine Webseite in Bielefeld?"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Worauf soll es hinauslaufen?</label>
              <input
                className="input"
                value={freeAngle}
                onChange={(e) => setFreeAngle(e.target.value)}
                placeholder="Ehrliche Preisspanne zeigen und erklären, wovon der Preis abhängt."
              />
            </div>
            <div>
              <label className="label">Kategorie</label>
              <select
                className="input"
                value={freeCategory}
                onChange={(e) =>
                  setFreeCategory(e.target.value as BlogCategory)
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
              <label className="label">Zielbegriffe (mit Komma)</label>
              <input
                className="input"
                value={freeKeywords}
                onChange={(e) => setFreeKeywords(e.target.value)}
                placeholder="webseite kosten bielefeld, webagentur preise"
              />
            </div>
          </div>
        )}
      </section>

      {/* Schritt 2 */}
      <section className="card mb-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <h2 className="text-base font-semibold text-gray-900">
              Auftragstext kopieren
            </h2>
          </div>
          <button onClick={copyPrompt} className="btn-primary">
            {copied ? 'Kopiert' : 'In die Zwischenablage'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Diesen Text in einen Claude-Chat einfügen. Er enthält alle Fakten,
          die Stilregeln und das Ausgabeformat.
        </p>
        <textarea
          className="input font-mono text-xs"
          rows={8}
          value={prompt}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
      </section>

      {/* Schritt 3 */}
      <section className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center shrink-0">
            3
          </span>
          <h2 className="text-base font-semibold text-gray-900">
            Antwort einfügen
          </h2>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Die komplette Antwort einfügen. Ein umschließender Codeblock oder
          Text drumherum stört nicht, das wird herausgefiltert.
        </p>
        <textarea
          className="input font-mono text-xs"
          rows={10}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={'{\n  "title": "…",\n  "slug": "…"\n}'}
        />
        {parseError && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {parseError}
          </div>
        )}
        {parsed && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-900">
            Gelesen: {parsed.title} · {estimateReadingMinutes(parsed.body)} Min.
            Lesezeit · {parsed.faq?.length ?? 0} Fragen
            {slugTaken && (
              <div className="mt-1 text-red-700 font-medium">
                Achtung: Es gibt schon einen Artikel mit dem URL-Teil
                &quot;{parsed.slug}&quot;. Bitte im Editor ändern.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Vorschau + Anlegen */}
      {parsed && (
        <>
          <section className="card mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Vorschau
            </h2>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500 mb-1">
                  Suchergebnis bei Google
                </div>
                <div className="text-blue-700 text-base leading-snug">
                  {parsed.metaTitle}
                </div>
                <div className="text-green-700 text-xs">
                  kolac-digital.de/blog/{parsed.slug}
                </div>
                <div className="text-gray-600 text-xs mt-1">
                  {parsed.metaDescription}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Titel {parsed.metaTitle?.length ?? 0}/60 · Beschreibung{' '}
                  {parsed.metaDescription?.length ?? 0}/155
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-xs text-gray-500 mb-1">Bildvorschlag</div>
                <p className="text-gray-800">
                  {parsed.imagePrompt || 'Keiner mitgeliefert.'}
                </p>
                {parsed.imageAlt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Alternativtext: {parsed.imageAlt}
                  </p>
                )}
              </div>
            </div>

            <div className="article-tldr mb-4">
              <span className="article-tldr-label">Kurz gesagt</span>
              <p>{parsed.tldr}</p>
            </div>

            {parsed.keyTakeaways && parsed.keyTakeaways.length > 0 && (
              <div className="article-takeaways mb-4">
                <span className="article-takeaways-label">
                  Alles auf einen Blick
                </span>
                <ul>
                  {parsed.keyTakeaways.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            )}

            <ArticleBody markdown={parsed.body} />

            {parsed.faq && parsed.faq.length > 0 && (
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  Häufige Fragen
                </h3>
                {parsed.faq.map((f, i) => (
                  <div key={i} className="mb-2">
                    <p className="font-medium text-gray-900 text-sm">
                      {f.question}
                    </p>
                    <p className="text-sm text-gray-600">{f.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="btn-secondary"
            >
              {saving ? 'Legt an…' : 'Als Entwurf anlegen'}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving || !!slugTaken}
              className="btn-primary"
            >
              Anlegen und veröffentlichen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
