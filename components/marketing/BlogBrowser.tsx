'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { site } from '@/lib/site-config';
import {
  classifyReferrer,
  foldSearch,
  normalizeSearch,
  trackBlog,
} from '@/lib/blog-tracking';

/** Schlanke, serialisierbare Fassung eines Artikels fuer die Uebersicht. */
export interface BlogListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  heroEmoji: string;
  heroImageUrl: string | null;
  imageAlt: string;
  readingMinutes: number;
  /** Schon formatiertes Datum, z.B. "9. Oktober 2026". */
  publishedLabel: string;
  /** Normalisierter Suchtext aus Titel, Teaser, Kurzantwort, Begriffen. */
  searchText: string;
}

const ALL = 'Alle';

/**
 * Ratgeber-Uebersicht mit Kategorie-Filter und Volltextsuche.
 *
 * Gefiltert wird im Browser, die Artikelzahl ist dafuer klein genug.
 * Der Server rendert trotzdem alle Beitraege vor, Suchmaschinen sehen
 * also die komplette Liste. Filter und Suchbegriff stehen in der
 * Adresse (?kategorie=…&suche=…), damit sich ein Ergebnis teilen
 * laesst. Die Adresse mit Parametern hat dieselbe Canonical wie /blog.
 */
export default function BlogBrowser({
  posts,
  categories,
}: {
  posts: BlogListItem[];
  categories: string[];
}) {
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState('');
  const lastTracked = useRef('');

  // Startzustand aus der Adresse uebernehmen und Aufruf zaehlen.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('kategorie');
    if (cat && categories.includes(cat)) setCategory(cat);
    const q = params.get('suche');
    if (q) setQuery(q);
    trackBlog({
      type: 'index_view',
      ref: classifyReferrer(document.referrer, new URL(site.baseUrl).hostname),
    });
  }, [categories]);

  // Adresse mitziehen, ohne neue Eintraege im Verlauf zu erzeugen.
  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== ALL) params.set('kategorie', category);
    if (query.trim()) params.set('suche', query.trim());
    const qs = params.toString();
    const path = window.location.pathname;
    window.history.replaceState(null, '', qs ? `${path}?${qs}` : path);
  }, [category, query]);

  // Zum Abgleichen grob gefaltet, damit Umlaut-Schreibweisen egal sind.
  const tokens = useMemo(
    () => foldSearch(query).split(' ').filter(Boolean),
    [query],
  );
  const folded = useMemo(
    () =>
      new Map(
        posts.map((p) => [p.id, { text: foldSearch(p.searchText), title: foldSearch(p.title) }]),
      ),
    [posts],
  );

  const results = useMemo(() => {
    const filtered = posts.filter(
      (p) =>
        (category === ALL || p.category === category) &&
        tokens.every((t) => folded.get(p.id)!.text.includes(t)),
    );
    if (tokens.length === 0) return filtered;
    // Treffer im Titel nach vorn.
    const score = (p: BlogListItem) =>
      tokens.filter((t) => folded.get(p.id)!.title.includes(t)).length;
    return [...filtered].sort((a, b) => score(b) - score(a));
  }, [posts, folded, category, tokens]);

  // Suchbegriff erst zaehlen, wenn eine Weile nicht mehr getippt wurde.
  // Gespeichert wird die lesbare Form, nicht die gefaltete.
  useEffect(() => {
    if (tokens.length === 0) return;
    const term = normalizeSearch(query);
    if (term.length < 3 || term === lastTracked.current) return;
    const t = window.setTimeout(() => {
      lastTracked.current = term;
      trackBlog({ type: 'search', term, results: results.length });
    }, 1500);
    return () => window.clearTimeout(t);
  }, [query, tokens, results.length]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of posts) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, [posts]);

  const pickCategory = (c: string) => {
    setCategory(c);
    if (c !== ALL) trackBlog({ type: 'category', category: c });
  };

  const filtering = category !== ALL || tokens.length > 0;
  const featured = !filtering ? results[0] : undefined;
  const grid = featured ? results.slice(1) : results;

  return (
    <>
      <div className="blog-filter">
        <div className="blog-search">
          <svg
            className="blog-search-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            width="18"
            height="18"
          >
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen, z.B. Terminbuchung"
            aria-label="Ratgeber durchsuchen"
            className="blog-search-input"
          />
          {query && (
            <button
              type="button"
              className="blog-search-clear"
              onClick={() => setQuery('')}
              aria-label="Suche leeren"
            >
              ×
            </button>
          )}
        </div>

        <div className="blog-chips" role="group" aria-label="Nach Kategorie filtern">
          {[ALL, ...categories].map((c) => (
            <button
              key={c}
              type="button"
              className={`blog-chip${category === c ? ' is-active' : ''}`}
              aria-pressed={category === c}
              onClick={() => pickCategory(c)}
            >
              {c}
              <span className="blog-chip-count">
                {c === ALL ? posts.length : (counts.get(c) ?? 0)}
              </span>
            </button>
          ))}
        </div>

        {filtering && (
          <p className="blog-result-count" aria-live="polite">
            {results.length === 1 ? '1 Beitrag' : `${results.length} Beiträge`}
            {tokens.length > 0 && ` zu „${query.trim()}“`}
            {category !== ALL && ` in ${category}`}
          </p>
        )}
      </div>

      {results.length === 0 ? (
        <div className="blog-empty">
          <p>
            Dazu haben wir noch keinen Beitrag. Frag uns einfach direkt, wir
            antworten innerhalb von 24 Stunden. Vielleicht wird daraus der
            nächste Artikel.
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setQuery('');
              setCategory(ALL);
            }}
          >
            Alle Beiträge zeigen
          </button>
        </div>
      ) : (
        <>
          {featured && (
            <Link href={`/blog/${featured.slug}`} className="blog-featured">
              {featured.heroImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={featured.heroImageUrl}
                  alt={featured.imageAlt || featured.title}
                  className="blog-featured-image"
                />
              ) : (
                <div className="blog-featured-emoji" aria-hidden="true">
                  {featured.heroEmoji}
                </div>
              )}
              <div className="blog-featured-body">
                <span className="blog-card-category">{featured.category}</span>
                <h2 className="blog-featured-title">{featured.title}</h2>
                <p className="blog-featured-excerpt">{featured.excerpt}</p>
                <span className="blog-card-meta">
                  {featured.publishedLabel}
                  {' · '}
                  {featured.readingMinutes} Min. Lesezeit
                </span>
              </div>
            </Link>
          )}

          {grid.length > 0 && (
            <div className="blog-grid">
              {grid.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
                  {p.heroImageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.heroImageUrl}
                      alt={p.imageAlt || p.title}
                      className="blog-card-image"
                    />
                  ) : (
                    <div className="blog-card-emoji" aria-hidden="true">
                      {p.heroEmoji}
                    </div>
                  )}
                  <span className="blog-card-category">{p.category}</span>
                  <h2 className="blog-card-title">{p.title}</h2>
                  <p className="blog-card-excerpt">{p.excerpt}</p>
                  <span className="blog-card-meta">
                    {p.publishedLabel}
                    {' · '}
                    {p.readingMinutes} Min.
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
