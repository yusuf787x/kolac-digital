/* ==========================================================================
   Einwilligungs-Banner
   Die Seite setzt keine Cookies. Gespeichert wird nur die Auswahl selbst
   (localStorage, Schluessel kolac_cookie_consent). Einwilligungspflichtig
   ist YouTube ("functional"), auch genutzt von
   components/case-studies/VideoTestimonial.tsx, und der Meta-Pixel auf den
   SEO-Check-Seiten ("marketing", Banner in app/seo-check/MetaConsent.tsx).
   Dieses Banner setzt "marketing" nie auf true, nur der Check-Banner.
   Die Ratgeber-Zaehlung
   (lib/blog-tracking.ts) laeuft ohne Speicherung auf dem Geraet.
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'kolac_cookie_consent';

  function getConsent() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(consent) {
    try {
      // Bestehende Felder behalten (z. B. "marketing" vom SEO-Check-Banner).
      var merged = getConsent() || {};
      for (var k in consent) merged[k] = consent[k];
      merged.timestamp = new Date().toISOString();
      consent = merged;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (e) { /* silent */ }
  }

  // Build banner HTML
  function createBanner() {
    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.id = 'cookie-banner';
    banner.innerHTML =
      '<div class="cookie-banner-inner">' +
        '<p class="cookie-banner-text">' +
          'Wir setzen keine Tracking- oder Werbe-Cookies. ' +
          'Externe Inhalte wie YouTube-Videos laden wir nur, wenn du zustimmst. ' +
          'Deine Auswahl speichern wir lokal in deinem Browser. ' +
          '<a href="/datenschutz.html">Mehr erfahren</a>' +
        '</p>' +
        '<div class="cookie-banner-actions">' +
          '<button class="cookie-btn cookie-btn-accept" id="cookie-accept-all">Alle akzeptieren</button>' +
          '<button class="cookie-btn cookie-btn-essential" id="cookie-essential-only">Nur notwendige</button>' +
          '<button class="cookie-btn cookie-btn-settings" id="cookie-open-settings">Einstellungen</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    return banner;
  }

  // Build settings modal
  function createModal() {
    var overlay = document.createElement('div');
    overlay.className = 'cookie-modal-overlay';
    overlay.id = 'cookie-modal-overlay';
    overlay.innerHTML =
      '<div class="cookie-modal">' +
        '<h3>Datenschutz-Einstellungen</h3>' +
        '<p>Wähle aus, was du zulassen möchtest. Das Notwendige ist für den Betrieb der Website erforderlich und lässt sich nicht abschalten.</p>' +
        '<div class="cookie-category">' +
          '<div class="cookie-category-header">' +
            '<span class="cookie-category-name">Notwendig</span>' +
            '<label class="cookie-toggle">' +
              '<input type="checkbox" checked disabled>' +
              '<span class="cookie-toggle-slider"></span>' +
            '</label>' +
          '</div>' +
          '<p class="cookie-category-desc">Speichert nur deine Auswahl hier im lokalen Speicher deines Browsers. Keine Cookies, keine Tracking-Daten.</p>' +
        '</div>' +
        '<div class="cookie-category">' +
          '<div class="cookie-category-header">' +
            '<span class="cookie-category-name">Externe Medien (YouTube)</span>' +
            '<label class="cookie-toggle">' +
              '<input type="checkbox" id="cookie-toggle-functional">' +
              '<span class="cookie-toggle-slider"></span>' +
            '</label>' +
          '</div>' +
          '<p class="cookie-category-desc">Lädt Kundenvideos von YouTube (Google) im erweiterten Datenschutzmodus. Dabei werden deine IP-Adresse und technische Daten an YouTube übertragen. Ohne Zustimmung siehst du nur ein Vorschaubild.</p>' +
        '</div>' +
        '<div class="cookie-category">' +
          '<div class="cookie-category-header">' +
            '<span class="cookie-category-name">Werbemessung auf den SEO-Check-Seiten (Meta)</span>' +
            '<label class="cookie-toggle">' +
              '<input type="checkbox" id="cookie-toggle-marketing">' +
              '<span class="cookie-toggle-slider"></span>' +
            '</label>' +
          '</div>' +
          '<p class="cookie-category-desc">Nur auf den Seiten des kostenlosen SEO-Checks: Der Meta-Pixel misst, über welche Anzeige du gekommen bist. Dabei setzt Meta Cookies und erhält Daten wie deine IP-Adresse. <a href="/datenschutz.html#meta">Mehr dazu</a></p>' +
        '</div>' +
        '<div class="cookie-category">' +
          '<div class="cookie-category-header">' +
            '<span class="cookie-category-name">Reichweitenmessung im Ratgeber</span>' +
          '</div>' +
          '<p class="cookie-category-desc">Wir zählen Aufrufe und Klicks im Ratgeber ohne Cookies, ohne Speicherung auf deinem Gerät und ohne IP-Adresse. Es entstehen nur Summen, daher ist keine Einwilligung nötig. Details in der <a href="/datenschutz.html#reichweitenmessung">Datenschutzerklärung</a>.</p>' +
        '</div>' +
        '<div class="cookie-modal-actions">' +
          '<button class="cookie-btn cookie-btn-essential" id="cookie-modal-cancel">Abbrechen</button>' +
          '<button class="cookie-btn cookie-btn-accept" id="cookie-modal-save">Auswahl speichern</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideModal();
    });

    return overlay;
  }

  var bannerEl, modalEl;

  function showBanner() {
    if (!bannerEl) bannerEl = createBanner();
    // Small delay for transition
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        bannerEl.classList.add('visible');
      });
    });
    bindBannerEvents();
  }

  function hideBanner() {
    if (bannerEl) bannerEl.classList.remove('visible');
  }

  function showModal() {
    if (!modalEl) modalEl = createModal();
    bindModalEvents();
    // Set toggle state from current consent
    var consent = getConsent();
    var toggle = document.getElementById('cookie-toggle-functional');
    if (toggle && consent) {
      toggle.checked = !!consent.functional;
    }
    var mToggle = document.getElementById('cookie-toggle-marketing');
    if (mToggle) mToggle.checked = !!(consent && consent.marketing === true);
    modalEl.classList.add('visible');
  }

  function hideModal() {
    if (modalEl) modalEl.classList.remove('visible');
  }

  function applyConsent(consent) {
    saveConsent(consent);
    hideBanner();
    hideModal();
    // Dispatch event so other scripts can react
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: consent }));
  }

  function bindBannerEvents() {
    var acceptBtn = document.getElementById('cookie-accept-all');
    var essentialBtn = document.getElementById('cookie-essential-only');
    var settingsBtn = document.getElementById('cookie-open-settings');

    if (acceptBtn) acceptBtn.onclick = function () {
      applyConsent({ essential: true, functional: true });
    };
    if (essentialBtn) essentialBtn.onclick = function () {
      applyConsent({ essential: true, functional: false, marketing: false });
    };
    if (settingsBtn) settingsBtn.onclick = function () {
      showModal();
    };
  }

  function bindModalEvents() {
    var saveBtn = document.getElementById('cookie-modal-save');
    var cancelBtn = document.getElementById('cookie-modal-cancel');

    if (saveBtn) saveBtn.onclick = function () {
      var toggle = document.getElementById('cookie-toggle-functional');
      var mToggle = document.getElementById('cookie-toggle-marketing');
      var before = getConsent() || {};
      var marketing = mToggle ? mToggle.checked : false;
      applyConsent({ essential: true, functional: toggle ? toggle.checked : false, marketing: marketing });
      // Widerruf: Meta-Cookies entfernen (sie entstehen nur auf den Check-Seiten).
      if (before.marketing === true && !marketing) {
        var host = location.hostname;
        ['_fbp', '_fbc'].forEach(function (n) {
          ['', host, '.' + host, '.' + host.replace(/^www\./, '')].forEach(function (d) {
            document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
          });
        });
      }
    };
    if (cancelBtn) cancelBtn.onclick = function () {
      hideModal();
    };
  }

  // Public API
  window.CookieConsent = {
    getConsent: getConsent,
    showBanner: function () {
      showBanner();
    },
    showSettings: function () {
      showModal();
    },
    hasFunctional: function () {
      var c = getConsent();
      return c && c.functional === true;
    }
  };

  // Initialize on DOM ready
  function init() {
    var consent = getConsent();
    if (!consent) {
      // No consent yet — show banner
      setTimeout(showBanner, 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
