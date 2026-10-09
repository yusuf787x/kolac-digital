'use client';

import { useEffect } from 'react';
import { site } from '@/lib/site-config';
import { classifyReferrer, trackBlog } from '@/lib/blog-tracking';

/**
 * Zaehlt auf der Artikelseite:
 * - einen Aufruf samt grober Herkunft,
 * - "gelesen", sobald das Artikelende sichtbar war und mindestens
 *   20 Sekunden vergangen sind (filtert Kurzbesuche raus),
 * - Klicks auf Erstgespraech, Telefon, E-Mail und die Leistungsseiten.
 *
 * Rendert nichts. Das Element mit `endId` markiert das Artikelende.
 */
export default function ArticleTracker({
  postId,
  endId,
}: {
  postId: string;
  endId: string;
}) {
  useEffect(() => {
    const ownHost = new URL(site.baseUrl).hostname;
    trackBlog({
      type: 'view',
      postId,
      ref: classifyReferrer(document.referrer, ownHost),
    });

    const start = Date.now();
    let readSent = false;
    let endSeen = false;
    const maybeRead = () => {
      if (readSent || !endSeen || Date.now() - start < 20_000) return;
      readSent = true;
      trackBlog({ type: 'read', postId });
    };

    const end = document.getElementById(endId);
    const observer = end
      ? new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            endSeen = true;
            maybeRead();
          }
        })
      : null;
    if (end && observer) observer.observe(end);
    // Wer schnell bis unten scrollt und dort liest, zaehlt nach Ablauf
    // der Mindestzeit trotzdem.
    const timer = window.setInterval(maybeRead, 5_000);

    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest('a');
      if (!link) return;
      const href = link.getAttribute('href') ?? '';
      const isCta =
        href === site.meetingUrl ||
        href.startsWith('tel:') ||
        href.startsWith('mailto:') ||
        href.startsWith('/webseiten') ||
        href.startsWith('/ki-beratung');
      if (isCta) trackBlog({ type: 'cta', postId });
    };
    document.addEventListener('click', onClick);

    return () => {
      observer?.disconnect();
      window.clearInterval(timer);
      document.removeEventListener('click', onClick);
    };
  }, [postId, endId]);

  return null;
}
