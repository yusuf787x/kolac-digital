'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from '@/lib/firestore';
import type { BlogPost, BlogCategory, BlogFaqItem } from '@/lib/types';
import { BLOG_CATEGORIES } from '@/lib/types';
import { estimateReadingMinutes } from '@/lib/blog-markdown';
import ArticleBody from '@/components/marketing/ArticleBody';

interface Props {
  /** Vorhandener Artikel. Fehlt er, wird ein neuer angelegt. */
  post?: BlogPost;
}

const EMPTY = {
  slug: '',
  title: '',
  excerpt: '',
  tldr: '',
  body: '',
  metaTitle: '',
  metaDescription: '',
  heroEmoji: '📄',
};

export default function BlogEditor({ post }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? EMPTY.title);
  const [slug, setSlug] = useState(post?.slug ?? EMPTY.slug);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? EMPTY.excerpt);
  const [tldr, setTldr] = useState(post?.tldr ?? EMPTY.tldr);
  const [body, setBody] = useState(post?.body ?? EMPTY.body);
  const [category, setCategory] = useState<BlogCategory>(
    post?.category ?? 'Webseiten mit System',
  );
  const [metaTitle, setMetaTitle] = useState(
    post?.metaTitle ?? EMPTY.metaTitle,
  );
  const [metaDescription, setMetaDescription] = useState(
    post?.metaDescription ?? EMPTY.metaDescription,
  );
  const [heroEmoji, setHeroEmoji] = useState(
    post?.heroEmoji ?? EMPTY.heroEmoji,
  );
  const [keywords, setKeywords] = useState(
    post?.targetKeywords.join(', ') ?? '',
  );
  const [faq, setFaq] = useState<BlogFaqItem[]>(post?.faq ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const save = async (publish?: boolean) => {
    setError(null);
    if (!title.trim() || !slug.trim() || !body.trim()) {
      setError('Titel, URL-Teil und Text sind Pflicht.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        slug: slug.trim(),
        title: title.trim(),
        excerpt: excerpt.trim(),
        tldr: tldr.trim(),
        body,
        category,
        targetKeywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        faq: faq.filter((f) => f.question.trim() && f.answer.trim()),
        metaTitle: metaTitle.trim() || title.trim(),
        metaDescription: metaDescription.trim() || excerpt.trim(),
        heroEmoji: heroEmoji || '📄',
        readingMinutes: estimateReadingMinutes(body),
      };

      if (post) {
        const nextStatus =
          publish === undefined
            ? post.status
            : publish
              ? ('published' as const)
              : ('draft' as const);
        await updateBlogPost(post.id, {
          ...data,
          status: nextStatus,
          publishedAt:
            nextStatus === 'published'
              ? (post.publishedAt ?? Timestamp.fromDate(new Date()))
              : post.publishedAt,
        });
      } else {
        await createBlogPost({
          ...data,
          status: publish ? 'published' : 'draft',
          source: 'manual',
          publishedAt: publish ? Timestamp.fromDate(new Date()) : null,
        });
      }
      router.push('/dashboard/blog');
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!post) return;
    if (!confirm(`"${post.title}" wirklich löschen?`)) return;
    await deleteBlogPost(post.id);
    router.push('/dashboard/blog');
  };

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="min-w-0">
          <Link
            href="/dashboard/blog"
            className="text-sm text-gray-500 hover:text-gray-900 mb-2 inline-block"
          >
            ← Zurück zum Blog
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 truncate">
            {post ? 'Artikel bearbeiten' : 'Neuer Artikel'}
          </h1>
          {post && (
            <p className="mt-1 text-xs text-gray-500">
              {post.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}
              {post.source === 'ai' && ' · automatisch geschrieben'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPreview((v) => !v)}
            className="btn-secondary"
          >
            {preview ? 'Bearbeiten' : 'Vorschau'}
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="btn-secondary"
          >
            {saving ? 'Speichert…' : 'Als Entwurf speichern'}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="btn-primary"
          >
            Speichern und freigeben
          </button>
        </div>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {preview ? (
        <div className="card">
          <div className="article-tldr mb-6">
            <span className="article-tldr-label">Kurz gesagt</span>
            <p>{tldr}</p>
          </div>
          <ArticleBody markdown={body} />
        </div>
      ) : (
        <div className="space-y-4">
          <section className="card space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="label">Emoji</label>
                <input
                  className="input text-center text-xl"
                  value={heroEmoji}
                  onChange={(e) => setHeroEmoji(e.target.value)}
                  maxLength={4}
                />
              </div>
              <div>
                <label className="label">Titel *</label>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">
                  URL-Teil * ({`/blog/${slug || '…'}`})
                </label>
                <input
                  className="input font-mono text-sm"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '-')
                        .replace(/-+/g, '-'),
                    )
                  }
                />
              </div>
              <div>
                <label className="label">Kategorie</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as BlogCategory)
                  }
                >
                  {BLOG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Teaser für die Übersicht</label>
              <textarea
                className="input"
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
              />
            </div>

            <div>
              <label className="label">
                Kurzantwort oben im Artikel
                <span className="ml-2 font-normal text-xs text-gray-500">
                  Wird von KI-Systemen am ehesten zitiert. Muss für sich
                  verständlich sein.
                </span>
              </label>
              <textarea
                className="input"
                rows={3}
                value={tldr}
                onChange={(e) => setTldr(e.target.value)}
              />
            </div>
          </section>

          <section className="card">
            <label className="label">
              Artikeltext (Markdown)
              <span className="ml-2 font-normal text-xs text-gray-500">
                {estimateReadingMinutes(body)} Min. Lesezeit ·{' '}
                {body.trim().split(/\s+/).filter(Boolean).length} Wörter
              </span>
            </label>
            <textarea
              className="input font-mono text-sm"
              rows={22}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'## Erste Überschrift\n\nText…\n\n- Punkt eins\n- Punkt zwei'}
            />
          </section>

          <section className="card space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Für Google und KI-Systeme
            </h2>
            <div>
              <label className="label">
                Meta-Titel
                <span className="ml-2 font-normal text-xs text-gray-500">
                  {metaTitle.length}/60 Zeichen
                </span>
              </label>
              <input
                className="input"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">
                Meta-Beschreibung
                <span className="ml-2 font-normal text-xs text-gray-500">
                  {metaDescription.length}/155 Zeichen
                </span>
              </label>
              <textarea
                className="input"
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Zielbegriffe (mit Komma trennen)</label>
              <input
                className="input"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Häufige Fragen ({faq.length})
              </h2>
              <button
                onClick={() =>
                  setFaq([...faq, { question: '', answer: '' }])
                }
                className="btn-secondary text-xs"
              >
                + Frage
              </button>
            </div>
            <div className="space-y-3">
              {faq.map((f, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      value={f.question}
                      onChange={(e) => {
                        const next = [...faq];
                        next[i] = { ...f, question: e.target.value };
                        setFaq(next);
                      }}
                      placeholder="Frage"
                    />
                    <button
                      onClick={() => setFaq(faq.filter((_, j) => j !== i))}
                      className="text-xs text-red-600 hover:underline shrink-0"
                    >
                      weg
                    </button>
                  </div>
                  <textarea
                    className="input"
                    rows={2}
                    value={f.answer}
                    onChange={(e) => {
                      const next = [...faq];
                      next[i] = { ...f, answer: e.target.value };
                      setFaq(next);
                    }}
                    placeholder="Antwort, zwei bis vier Sätze, für sich verständlich"
                  />
                </div>
              ))}
            </div>
          </section>

          {post && (
            <button
              onClick={remove}
              className="btn-secondary text-red-600 hover:bg-red-50"
            >
              Artikel löschen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
