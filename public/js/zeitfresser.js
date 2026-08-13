/**
 * Zeitfresser-Rechner — Vanilla-JS-Version fuer die statische Marketing-Site
 * (public/index.html). Initialisiert einen Rechner an jedem Element mit
 * dem Attribut [data-zeitfresser]. Config wird aus /content/zeitfresser.json
 * geladen; Formulare posten an /api/contact.
 */
(function () {
  'use strict';

  const CONFIG_URL = '/content/zeitfresser.json';

  document.addEventListener('DOMContentLoaded', init);
  // Auf Fallback initialisieren falls DOMContentLoaded schon durch ist:
  if (
    document.readyState === 'interactive' ||
    document.readyState === 'complete'
  ) {
    init();
  }

  let initialized = false;
  function init() {
    if (initialized) return;
    const mounts = document.querySelectorAll('[data-zeitfresser]');
    if (mounts.length === 0) return;
    initialized = true;
    fetch(CONFIG_URL)
      .then((r) => r.json())
      .then((config) => mounts.forEach((el) => mount(el, config)))
      .catch((err) => {
        console.error('Zeitfresser-Config nicht geladen:', err);
        mounts.forEach((el) => {
          el.innerHTML =
            '<p style="color:#991b1b;padding:20px">Rechner konnte nicht geladen werden.</p>';
        });
      });
  }

  function fmtEur(n) {
    return (
      new Intl.NumberFormat('de-DE', {
        maximumFractionDigits: 0,
      }).format(Math.round(n)) + ' €'
    );
  }
  function fmtInt(n) {
    return new Intl.NumberFormat('de-DE', {
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  }
  function fmtValue(v, unit) {
    if (unit === '€') return fmtEur(v);
    if (unit === 'Std.') return fmtInt(v) + ' Std.';
    return fmtInt(v) + (unit ? ' ' + unit : '');
  }
  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c] || c,
    );
  }

  function mount(root, config) {
    const s = config.sliders;
    const cta = config.cta;
    const weeks = config.workingWeeksPerYear || 46;

    const state = {
      hoursPerWeek: s.hoursPerWeek.default,
      missedInquiries: s.missedInquiries.default,
      avgOrderValue: s.avgOrderValue.default,
      hourlyRate: s.hourlyRate.default,
    };

    root.innerHTML = `
      <div class="container">
        <div class="zeitfresser-intro reveal">
          <div>
            <div class="section-label">${escapeHtml(cta.sectionLabel)}</div>
            <h2 class="section-headline">${escapeHtml(cta.headline)}</h2>
          </div>
          <p class="section-subline">${escapeHtml(cta.subline)}</p>
        </div>

        <div class="zeitfresser-card reveal">
          <div class="zeitfresser-sliders">
            ${sliderMarkup('hoursPerWeek', s.hoursPerWeek, state.hoursPerWeek)}
            ${sliderMarkup('missedInquiries', s.missedInquiries, state.missedInquiries)}
            ${sliderMarkup('avgOrderValue', s.avgOrderValue, state.avgOrderValue)}
            ${sliderMarkup('hourlyRate', s.hourlyRate, state.hourlyRate)}
          </div>
          <div class="zeitfresser-result">
            <div class="zeitfresser-metrics">
              <div>
                <div class="zeitfresser-metric-value" data-out="hours">–</div>
                <div class="zeitfresser-metric-label">Stunden im Jahr</div>
                <div class="zeitfresser-weeks-hint" data-out="hoursWeeksHint"></div>
              </div>
              <div>
                <div class="zeitfresser-metric-value" data-out="euro">–</div>
                <div class="zeitfresser-metric-label">im Jahr</div>
              </div>
            </div>
            <p class="zeitfresser-explainer">${escapeHtml(cta.explainer)}</p>
            <p class="zeitfresser-footnote">${escapeHtml(cta.footnote)}</p>
          </div>
        </div>

        <div class="zeitfresser-cta reveal">
          <h3 class="zeitfresser-cta-headline">${escapeHtml(cta.formHeadline)}</h3>
          <p class="zeitfresser-cta-subline">${escapeHtml(cta.formSubline)}</p>
          <form class="zeitfresser-form" data-zeitfresser-form novalidate>
            <input type="text" name="name" placeholder="Name *" required autocomplete="name" />
            <input type="tel" name="phone" placeholder="Telefon *" required autocomplete="tel" />
            <input type="email" name="email" placeholder="E-Mail *" required autocomplete="email" />
            <input class="zeitfresser-form-honeypot" type="text" name="website" tabindex="-1" autocomplete="off" />
            <button type="submit" class="zeitfresser-submit">${escapeHtml(cta.buttonText)}</button>
            <div class="zeitfresser-status" data-status hidden></div>
          </form>
        </div>
      </div>
    `;

    // Slider-Listener
    root.querySelectorAll('input[type="range"]').forEach((input) => {
      const key = input.dataset.key;
      input.addEventListener('input', () => {
        state[key] = Number(input.value);
        updateSliderFill(input);
        updateSliderValue(root, key, state[key], s[key].unit);
        updateResult();
      });
      updateSliderFill(input);
    });

    function updateResult() {
      const lostHours = state.hoursPerWeek * weeks;
      const lostMoneyTime = lostHours * state.hourlyRate;
      const lostMoneyRevenue =
        state.missedInquiries * state.avgOrderValue * 12;
      const total = lostMoneyTime + lostMoneyRevenue;
      root.querySelector('[data-out="hours"]').textContent = fmtInt(lostHours);
      root.querySelector('[data-out="euro"]').textContent = fmtEur(total);
      const asWorkweeks =
        state.hoursPerWeek > 0 ? Math.round(lostHours / 40) : 0;
      root.querySelector('[data-out="hoursWeeksHint"]').textContent =
        asWorkweeks > 0
          ? `entspricht ${asWorkweeks} Arbeitswochen`
          : '';
    }
    updateResult();

    // Formular
    const form = root.querySelector('[data-zeitfresser-form]');
    const status = root.querySelector('[data-status]');
    const submitBtn = form.querySelector('.zeitfresser-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      // Honeypot
      if (data.website) return;
      if (!data.name || !data.phone || !data.email) {
        showStatus('Bitte Name, Telefon und E-Mail ausfüllen.', 'error');
        return;
      }
      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Sende…';
      const lostHours = state.hoursPerWeek * weeks;
      const total =
        lostHours * state.hourlyRate +
        state.missedInquiries * state.avgOrderValue * 12;
      const msg = [
        `Zeitfresser-Rechner-Ergebnis:`,
        `- ${fmtInt(lostHours)} verlorene Stunden/Jahr`,
        `- ${fmtEur(total)} verlorenes Geld/Jahr`,
        ``,
        `Eingaben:`,
        `- Büroarbeit: ${state.hoursPerWeek} Std./Woche`,
        `- Verpasste Anfragen: ${state.missedInquiries}/Monat`,
        `- Ø Auftragswert: ${fmtEur(state.avgOrderValue)}`,
        `- Stundenkosten: ${fmtEur(state.hourlyRate)}`,
      ].join('\n');
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            phone: data.phone,
            email: data.email,
            message: msg,
            source: 'Zeitfresser-Rechner',
            website: '',
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) {
          throw new Error(body.error || 'Versand fehlgeschlagen.');
        }
        showStatus(
          'Danke. Wir melden uns innerhalb von 24 Stunden telefonisch.',
          'success',
        );
        form.reset();
      } catch (err) {
        showStatus(
          `Versand fehlgeschlagen: ${err.message}. Bitte rufen Sie uns direkt an: 0176 95762018.`,
          'error',
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });

    function showStatus(text, kind) {
      status.hidden = false;
      status.textContent = text;
      status.className = 'zeitfresser-status ' + kind;
    }
  }

  function sliderMarkup(key, cfg, val) {
    return `
      <div class="zeitfresser-slider">
        <div class="zeitfresser-slider-head">
          <span class="zeitfresser-slider-label">${escapeHtml(cfg.label)}</span>
          <span class="zeitfresser-slider-value" data-value="${key}">${fmtValue(val, cfg.unit)}</span>
        </div>
        <input
          type="range"
          data-key="${key}"
          min="${cfg.min}"
          max="${cfg.max}"
          step="${cfg.step}"
          value="${val}"
          aria-label="${escapeHtml(cfg.label)}"
        />
        ${cfg.hint ? `<div class="zeitfresser-slider-hint">${escapeHtml(cfg.hint)}</div>` : ''}
      </div>
    `;
  }

  function updateSliderValue(root, key, val, unit) {
    const el = root.querySelector(`[data-value="${key}"]`);
    if (el) el.textContent = fmtValue(val, unit);
  }

  function updateSliderFill(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const val = Number(input.value);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--fill', pct + '%');
  }
})();
