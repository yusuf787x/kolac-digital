'use client';

import { useEffect, useRef } from 'react';

interface Props {
  children: React.ReactNode;
  /** Verzögerung in Millisekunden, damit Karten gestaffelt erscheinen können. */
  delay?: number;
  /** Optionale Klassen für das umschließende div. */
  className?: string;
}

/**
 * Sanftes Fade-up beim Scrollen in den Viewport.
 *
 * Initial wird der Inhalt per CSS-Regel `[data-reveal]` versteckt
 * (definiert in app/globals.css). Sobald ein IntersectionObserver
 * meldet, dass das Element sichtbar ist, fügen wir die Klasse
 * `in-view` hinzu und der Übergang läuft.
 *
 * Respektiert `prefers-reduced-motion` automatisch über das Stylesheet.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry], obs) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => el.classList.add('in-view'), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} data-reveal className={className}>
      {children}
    </div>
  );
}
