import Link from 'next/link';
import {
  parseArticle,
  type ArticleInline,
} from '@/lib/blog-markdown';

function Inline({ parts }: { parts: ArticleInline[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.href) {
          const internal = p.href.startsWith('/');
          return internal ? (
            <Link key={i} href={p.href} className="article-link">
              {p.text}
            </Link>
          ) : (
            <a
              key={i}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="article-link"
            >
              {p.text}
            </a>
          );
        }
        if (p.bold) return <strong key={i}>{p.text}</strong>;
        return <span key={i}>{p.text}</span>;
      })}
    </>
  );
}

/**
 * Rendert den Artikeltext. Die Ueberschriften bekommen Sprungmarken,
 * damit das Inhaltsverzeichnis und Direktlinks auf einzelne
 * Abschnitte funktionieren.
 */
export default function ArticleBody({ markdown }: { markdown: string }) {
  const blocks = parseArticle(markdown);
  return (
    <div className="article-body">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h2':
            return (
              <h2 key={i} id={b.id}>
                {b.text}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={i} id={b.id}>
                {b.text}
              </h3>
            );
          case 'ul':
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inline parts={it} />
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <Inline parts={it} />
                  </li>
                ))}
              </ol>
            );
          case 'quote':
            return (
              <blockquote key={i}>
                <Inline parts={b.content} />
              </blockquote>
            );
          default:
            return (
              <p key={i}>
                <Inline parts={b.content} />
              </p>
            );
        }
      })}
    </div>
  );
}
