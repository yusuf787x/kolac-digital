/* ==========================================================================
   Cookie Consent – DSGVO-compliant
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
      consent.timestamp = new Date().toISOString();
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
          'Wir verwenden Cookies, um dir die bestmögliche Erfahrung zu bieten. ' +
          'Funktionale Cookies ermöglichen die Einbindung externer Inhalte (z.\u00a0B. YouTube-Videos). ' +
          '<a href="datenschutz.html">Mehr erfahren</a>' +
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
        '<h3>Cookie-Einstellungen</h3>' +
        '<p>Wähle aus, welche Cookies du zulassen möchtest. Notwendige Cookies sind für den Betrieb der Website erforderlich und können nicht deaktiviert werden.</p>' +
        '<div class="cookie-category">' +
          '<div class="cookie-category-header">' +
            '<span class="cookie-category-name">Notwendige Cookies</span>' +
            '<label class="cookie-toggle">' +
              '<input type="checkbox" checked disabled>' +
              '<span class="cookie-toggle-slider"></span>' +
            '</label>' +
          '</div>' +
          '<p class="cookie-category-desc">Speichern deine Cookie-Einstellungen. Keine Tracking-Daten.</p>' +
        '</div>' +
        '<div class="cookie-category">' +
          '<div class="cookie-category-header">' +
            '<span class="cookie-category-name">Funktionale Cookies</span>' +
            '<label class="cookie-toggle">' +
              '<input type="checkbox" id="cookie-toggle-functional">' +
              '<span class="cookie-toggle-slider"></span>' +
            '</label>' +
          '</div>' +
          '<p class="cookie-category-desc">Ermöglichen die Einbindung externer Inhalte wie YouTube-Videos. Ohne diese Cookies wird ein Platzhalter anstelle des Videos angezeigt.</p>' +
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
      applyConsent({ essential: true, functional: false });
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
      applyConsent({ essential: true, functional: toggle ? toggle.checked : false });
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
