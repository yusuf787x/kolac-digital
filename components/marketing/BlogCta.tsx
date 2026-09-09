import Link from 'next/link';
import { site } from '@/lib/site-config';

/**
 * Handlungsaufforderung unter jedem Artikel.
 *
 * Zentral an EINER Stelle definiert: sobald die Landingpage mit dem
 * Verkaufsvideo steht, wird hier `PRIMARY_HREF` getauscht und alle
 * Artikel zeigen sofort dorthin. Kein Nachpflegen in einzelnen
 * Beitraegen noetig.
 */
const PRIMARY_HREF = site.meetingUrl;
const PRIMARY_LABEL = 'Kostenloses Erstgespräch buchen';
const SECONDARY_HREF = '/webseiten';
const SECONDARY_LABEL = 'Webseiten mit System ansehen';

interface Props {
  /** Optionaler, auf den Artikel zugeschnittener Aufhaenger. */
  headline?: string;
  text?: string;
  variant?: 'full' | 'inline';
}

export default function BlogCta({
  headline = 'Klingt nach deinem Betrieb?',
  text = 'In 15 Minuten schauen wir uns deine Abläufe an und sagen dir ehrlich, ob sich ein System für dich lohnt. Kostenlos und ohne Verpflichtung.',
  variant = 'full',
}: Props) {
  if (variant === 'inline') {
    return (
      <div className="blog-cta-inline">
        <p>{text}</p>
        <a
          href={PRIMARY_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          {PRIMARY_LABEL}
        </a>
      </div>
    );
  }

  return (
    <aside className="blog-cta">
      <h2 className="blog-cta-headline">{headline}</h2>
      <p className="blog-cta-text">{text}</p>
      <div className="blog-cta-actions">
        <a
          href={PRIMARY_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          {PRIMARY_LABEL}
        </a>
        <Link href={SECONDARY_HREF} className="btn btn-outline">
          {SECONDARY_LABEL}
        </Link>
      </div>
      <p className="blog-cta-meta">
        Oder direkt anrufen:{' '}
        <a href={`tel:${site.phoneE164}`}>{site.phone}</a> · Antwort
        innerhalb von 24 Stunden
      </p>
    </aside>
  );
}
