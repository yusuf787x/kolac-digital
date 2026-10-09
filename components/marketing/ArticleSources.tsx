import type { BlogSource } from '@/lib/types';

/**
 * Quellenliste unter dem Artikel. Ergaenzt die Belege im Fliesstext
 * fuer alle, die es genau wissen wollen. Die Links sind bewusst
 * normale Links ohne nofollow: es sind redaktionell gewaehlte
 * Primaerquellen, keine bezahlten oder ungeprueften Verweise.
 */
export default function ArticleSources({
  sources,
}: {
  sources: BlogSource[];
}) {
  if (sources.length === 0) return null;
  return (
    <section className="article-sources" aria-labelledby="quellen">
      <h2 id="quellen">Quellen</h2>
      <ol>
        {sources.map((s, i) => {
          const meta = [s.publisher, s.date].filter(Boolean).join(', ');
          return (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
              {meta && <span className="article-sources-meta"> · {meta}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
