/**
 * Marketing-Chrome: Header + Footer aus EINER Quelle fuer alle
 * statischen HTML-Seiten (index.html, impressum.html, agb.html,
 * datenschutz.html). Ersetzt jedes <div data-marketing-header></div>
 * bzw. <div data-marketing-footer></div> durch das jeweilige Template.
 *
 * Aenderungen an Menue-Items, Logo, CTA oder Footer-Links werden
 * HIER gemacht. Fuer die Next.js-Marketing-Seiten
 * (/webseiten, /portfolio, /case-studys, /not-found) gibt es die
 * React-Aequivalente components/marketing/SiteHeader.tsx und
 * components/marketing/SiteFooter.tsx — die muss man synchron
 * halten, weil React und statisches HTML nicht dieselbe Quelle
 * nutzen koennen.
 */
(function () {
  'use strict';

  const NAV_ITEMS = [
    { label: 'Leistungen', href: '#leistungen' },
    { label: 'Über uns', href: '#about' },
    { label: 'Case Studys', href: '/case-studys' },
    { label: 'Kundenstimmen', href: '#kundenstimmen' },
  ];
  const CTA = { label: 'Webseite mit System', href: '/webseiten' };
  const YEAR_RANGE = '2019-2026';

  const isHome = () => {
    const p = window.location.pathname;
    return p === '/' || p === '/index.html' || p === '';
  };

  function anchorHref(href) {
    // Auf Unterseiten muessen Anker-Links auf / verweisen, damit sie
    // die entsprechende Homepage-Section oeffnen.
    if (href.startsWith('#')) {
      return isHome() ? href : '/' + href;
    }
    return href;
  }

  function renderHeader(mount) {
    // Legal-Pages (kein Hero) starten mit scrolled-Style, sonst haengt
    // der Header transparent ueber weissem Content.
    const startScrolled =
      !isHome() && document.body.classList.contains('legal-page-body');

    mount.outerHTML = `
      <nav class="navbar${
        startScrolled ? ' scrolled' : ''
      }" role="navigation" aria-label="Hauptnavigation" data-marketing-nav>
        <div class="container">
          <a href="/" class="nav-logo" aria-label="Kolac Digital – Startseite">
            <img src="/images/Logo Lang Schwarz.png" alt="Kolac Digital" width="500" height="225">
          </a>
          <div class="nav-links">
            ${NAV_ITEMS.map(
              (i) => `<a href="${anchorHref(i.href)}">${i.label}</a>`,
            ).join('')}
          </div>
          <div class="nav-cta">
            <a href="${CTA.href}" class="btn btn-primary">${CTA.label}</a>
          </div>
          <div class="hamburger" aria-label="Menü öffnen" role="button" tabindex="0" data-marketing-hamburger>
            <span></span><span></span><span></span>
          </div>
        </div>
      </nav>
      <div class="mobile-menu" role="dialog" aria-label="Mobile Navigation" data-marketing-mobile-menu>
        ${NAV_ITEMS.map(
          (i) => `<a href="${anchorHref(i.href)}">${i.label}</a>`,
        ).join('')}
        <a href="${anchorHref('#kontakt')}">Kontakt</a>
        <a href="${CTA.href}" class="btn btn-primary">${CTA.label}</a>
      </div>
    `;
  }

  function renderFooter(mount) {
    const home = isHome() ? '' : '/';
    mount.outerHTML = `
      <footer class="footer" role="contentinfo">
        <div class="container">
          <div class="footer-inner">
            <div class="footer-top">
              <a href="/" class="footer-logo">
                <img src="/images/Mit Schrift Weiß Lang.png" alt="Kolac Digital" width="500" height="284">
              </a>
              <div class="footer-columns">
                <div class="footer-col">
                  <span class="footer-col-title">Links</span>
                  <a href="${home}#leistungen">Leistungen</a>
                  <a href="${home}#about">Über uns</a>
                  <a href="/case-studys">Case Studys</a>
                  <a href="/portfolio">Portfolio</a>
                  <a href="${home}#kundenstimmen">Kundenstimmen</a>
                  <a href="${home}#kontakt">Kontakt</a>
                </div>
                <div class="footer-col">
                  <span class="footer-col-title">Rechtliches</span>
                  <a href="/impressum.html">Impressum</a>
                  <a href="/datenschutz.html">Datenschutz</a>
                  <a href="/agb.html">AGB</a>
                </div>
              </div>
            </div>
            <p class="footer-copy">© ${YEAR_RANGE} Kolac Digital · Beckhausstraße 108, 33611 Bielefeld · Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    `;
  }

  function wireInteractions() {
    // Scroll-Shrink
    const nav = document.querySelector('[data-marketing-nav]');
    if (nav && !document.body.classList.contains('legal-page-body')) {
      const onScroll = () => {
        if (window.scrollY > 20) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Hamburger + Mobile-Menu
    const burger = document.querySelector('[data-marketing-hamburger]');
    const menu = document.querySelector('[data-marketing-mobile-menu]');
    if (!burger || !menu) return;
    const toggle = (open) => {
      const isOpen =
        typeof open === 'boolean' ? open : !menu.classList.contains('open');
      menu.classList.toggle('open', isOpen);
      burger.classList.toggle('active', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };
    burger.addEventListener('click', () => toggle());
    burger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
    menu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => toggle(false));
    });
  }

  function boot() {
    document
      .querySelectorAll('[data-marketing-header]')
      .forEach(renderHeader);
    document
      .querySelectorAll('[data-marketing-footer]')
      .forEach(renderFooter);
    wireInteractions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
