'use client';

import { useEffect, useState } from 'react';

/**
 * Navbar-Komponente, die 1:1 die Homepage-Navbar (public/index.html)
 * spiegelt. Nutzt die gleichen CSS-Klassen aus public/css/style.css,
 * damit Aussehen und Verhalten (Backdrop-Blur, Scroll-Shrink, Mobile-
 * Slide-in) identisch bleiben.
 *
 * Erwartet, dass public/css/style.css im umgebenden Layout via
 * <link> geladen wurde (siehe app/webseiten/layout.tsx).
 */

interface Props {
  /** URL fuer den primaeren CTA-Button rechts. Default: /webseiten. */
  ctaHref?: string;
  /** Text fuer den primaeren CTA-Button rechts. Default: "Webseite mit System". */
  ctaLabel?: string;
  /**
   * Wenn true, oeffnen die Anker-Links ("Leistungen", "Kundenstimmen"
   * etc.) die Homepage mit dem Anker. Fuer Unterseiten wichtig, damit
   * "Leistungen" auch von /webseiten oder /case-studys aus die
   * Homepage-Section aufruft.
   */
  crossPage?: boolean;
}

export default function SiteHeader({
  ctaHref = '/webseiten',
  ctaLabel = 'Webseite mit System',
  crossPage = true,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll-Shrink: wie in public/js/main.js, ab 20px scrollY die
  // .scrolled-Klasse setzen.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Beim Wechsel auf Desktop das Mobile-Menu automatisch schliessen.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Body-Scroll sperren, solange das Mobile-Menu offen ist.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const prefix = crossPage ? '/' : '';
  const close = () => setMenuOpen(false);

  return (
    <>
      <nav
        className={`navbar${scrolled ? ' scrolled' : ''}`}
        role="navigation"
        aria-label="Hauptnavigation"
      >
        <div className="container">
          <a
            href="/"
            className="nav-logo"
            aria-label="Kolac Digital – Startseite"
          >
            <img
              src="/images/Logo Lang Schwarz.png"
              alt="Kolac Digital"
              width={500}
              height={225}
            />
          </a>

          <div className="nav-links">
            <a href={`${prefix}#leistungen`}>Leistungen</a>
            <a href={`${prefix}#about`}>Über uns</a>
            <a href="/case-studys">Case Studys</a>
            <a href={`${prefix}#kundenstimmen`}>Kundenstimmen</a>
          </div>

          <div className="nav-cta">
            <a href={ctaHref} className="btn btn-primary">
              {ctaLabel}
            </a>
          </div>

          <div
            className={`hamburger${menuOpen ? ' active' : ''}`}
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            role="button"
            tabIndex={0}
            onClick={() => setMenuOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMenuOpen((v) => !v);
              }
            }}
          >
            <span />
            <span />
            <span />
          </div>
        </div>
      </nav>

      <div
        className={`mobile-menu${menuOpen ? ' open' : ''}`}
        role="dialog"
        aria-label="Mobile Navigation"
      >
        <a href={`${prefix}#leistungen`} onClick={close}>
          Leistungen
        </a>
        <a href={`${prefix}#about`} onClick={close}>
          Über uns
        </a>
        <a href="/case-studys" onClick={close}>
          Case Studys
        </a>
        <a href={`${prefix}#kundenstimmen`} onClick={close}>
          Kundenstimmen
        </a>
        <a href={`${prefix}#kontakt`} onClick={close}>
          Kontakt
        </a>
        <a href={ctaHref} className="btn btn-primary" onClick={close}>
          {ctaLabel}
        </a>
      </div>
    </>
  );
}
