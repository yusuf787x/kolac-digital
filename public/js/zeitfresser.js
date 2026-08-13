/**
 * Zeitfresser-Rechner — Vanilla-JS-Version für die statische
 * Marketing-Seite. Initialisiert einen Rechner auf jedem
 * [data-zeitfresser]-Element. Config INLINE (kein Fetch) —
 * damit gibt es keine Race-Condition, kein 404 auf statischen
 * Deploys und keine Sichtbarkeits-Verzögerung.
 *
 * Wenn du Werte ändern willst: hier oben in CONFIG, und in
 * components/marketing/ZeitfresserRechner.tsx analog.
 */
(function () {
  'use strict';

  const CONFIG = {
    workingWeeksPerYear: 46,
    sliders: {
      hoursPerWeek: {
        label: 'Wie viele Stunden pro Woche gehen für Büroarbeit drauf?',
        hint: 'Termine koordinieren, Anfragen beantworten, Angebote und Rechnungen.',
        min: 0,
        max: 40,
        step: 1,
        default: 10,
        unit: 'Std.',
      },
      missedInquiries: {
        label:
          'Wie viele Kundenanfragen gehen pro Monat unter oder werden nicht nachgefasst?',
        hint: 'Ehrliche Schätzung. Meistens mehr als man denkt.',
        min: 0,
        max: 30,
        step: 1,
        default: 5,
        unit: 'Anfragen',
      },
      avgOrderValue: {
        label: 'Was ist der Wert eines durchschnittlichen Auftrags?',
        hint: 'Netto in Euro. Was bringt ein typischer Kunde ein.',
        min: 0,
        max: 5000,
        step: 50,
        default: 500,
        unit: '€',
      },
      hourlyRate: {
        label: 'Was kostet eine Stunde Arbeitszeit in Ihrem Betrieb?',
        hint: 'Bei Solo-Selbstständigen der eigene Stundensatz.',
        min: 0,
        max: 250,
        step: 5,
        default: 50,
        unit: '€',
      },
    },
    label: 'IHRE ZEIT',
    headline: 'Rechnen Sie kurz mit.',
    explainer:
      'So viel Zeit und Geld steckt aktuell in Arbeit, die ein System für Sie übernehmen könnte.',
    footnote: 'Gerechnet mit 46 Arbeitswochen. Ihre Zahlen, keine Studie.',
    buttonText: 'Zeig mir, wie ich das zurückhole',
    formHeadline: 'Kostenlose Zeitfresser-Analyse',
    formSubline:
      'Wir schauen 15 Minuten auf Ihren Betrieb und zeigen, wo Sie konkret Zeit und Geld verlieren. Kostet nichts, verpflichtet zu nichts.',
  };

  document.addEventListener('DOMContentLoaded', init);
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
    mounts.forEach((el) => mount(el));
  }

  function fmtInt(n) {
    return new Intl.NumberFormat('de-DE', {
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  }
  function fmtEur(n) {
    return fmtInt(n) + ' €';
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

  function mount(root) {
    const state = {
      hoursPerWeek: CONFIG.sliders.hoursPerWeek.default,
      missedInquiries: CONFIG.sliders.missedInquiries.default,
      avgOrderValue: CONFIG.sliders.avgOrderValue.default,
      hourlyRate: CONFIG.sliders.hourlyRate.default,
    };

    root.innerHTML = `
      <div class="container">
        <div class="zeitfresser-intro">
          <div class="zeitfresser-label">${escapeHtml(CONFIG.label)}</div>
          <h2 class="zeitfresser-headline">${escapeHtml(CONFIG.headline)}</h2>
        </div>

        <div class="zeitfresser-card">
          <div class="zeitfresser-sliders">
            ${sliderMarkup('hoursPerWeek', CONFIG.sliders.hoursPerWeek, state.hoursPerWeek)}
            ${sliderMarkup('missedInquiries', CONFIG.sliders.missedInquiries, state.missedInquiries)}
            ${sliderMarkup('avgOrderValue', CONFIG.sliders.avgOrderValue, state.avgOrderValue)}
            ${sliderMarkup('hourlyRate', CONFIG.sliders.hourlyRate, state.hourlyRate)}
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
                <div class="zeitfresser-metric-label">Kosten im Jahr</div>
              </div>
            </div>
            <p class="zeitfresser-explainer">${escapeHtml(CONFIG.explainer)}</p>
            <p class="zeitfresser-footnote">${escapeHtml(CONFIG.footnote)}</p>
          </div>
        </div>

        <div class="zeitfresser-cta">
          <h3 class="zeitfresser-cta-headline">${escapeHtml(CONFIG.formHeadline)}</h3>
          <p class="zeitfresser-cta-subline">${escapeHtml(CONFIG.formSubline)}</p>
          <form class="zeitfresser-form" data-zeitfresser-form novalidate>
            <div class="zeitfresser-field">
              <label for="zf-name">Name</label>
              <input id="zf-name" type="text" name="name" placeholder="Ihr Name" required autocomplete="name" />
            </div>
            <div class="zeitfresser-field">
              <label for="zf-phone">Telefon</label>
              <input id="zf-phone" type="tel" name="phone" placeholder="0176 …" required autocomplete="tel" />
            </div>
            <div class="zeitfresser-field">
              <label for="zf-email">E-Mail</label>
              <input id="zf-email" type="email" name="email" placeholder="ihre@mail.de" required autocomplete="email" />
            </div>
            <input class="zeitfresser-form-honeypot" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
            <button type="submit" class="zeitfresser-submit">${escapeHtml(CONFIG.buttonText)}</button>
            <div class="zeitfresser-status" data-status hidden></div>
          </form>
        </div>
      </div>
    `;

    root.querySelectorAll('input[type="range"]').forEach((input) => {
      const key = input.dataset.key;
      input.addEventListener('input', () => {
        state[key] = Number(input.value);
        updateSliderFill(input);
        updateSliderValue(
          root,
          key,
          state[key],
          CONFIG.sliders[key].unit,
        );
        updateResult();
      });
      updateSliderFill(input);
    });

    function updateResult() {
      const weeks = CONFIG.workingWeeksPerYear;
      const lostHours = state.hoursPerWeek * weeks;
      const lostMoneyTime = lostHours * state.hourlyRate;
      const lostMoneyRevenue =
        state.missedInquiries * state.avgOrderValue * 12;
      const total = lostMoneyTime + lostMoneyRevenue;
      root.querySelector('[data-out="hours"]').textContent =
        fmtInt(lostHours);
      root.querySelector('[data-out="euro"]').textContent = fmtEur(total);
      const asWorkweeks =
        state.hoursPerWeek > 0 ? Math.round(lostHours / 40) : 0;
      root.querySelector('[data-out="hoursWeeksHint"]').textContent =
        asWorkweeks > 0 ? `entspricht ${asWorkweeks} Arbeitswochen` : '';
    }
    updateResult();

    const form = root.querySelector('[data-zeitfresser-form]');
    const status = root.querySelector('[data-status]');
    const submitBtn = form.querySelector('.zeitfresser-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.website) return;
      if (!data.name || !data.phone || !data.email) {
        show('Bitte Name, Telefon und E-Mail ausfüllen.', 'error');
        return;
      }
      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = 'Sende…';
      const lostHours = state.hoursPerWeek * CONFIG.workingWeeksPerYear;
      const total =
        lostHours * state.hourlyRate +
        state.missedInquiries * state.avgOrderValue * 12;
      const message = [
        'Zeitfresser-Rechner-Ergebnis:',
        `- ${fmtInt(lostHours)} verlorene Stunden/Jahr`,
        `- ${fmtEur(total)} verlorenes Geld/Jahr`,
        '',
        'Eingaben:',
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
            message,
            source: 'Zeitfresser-Rechner',
            website: '',
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.ok) {
          throw new Error(body.error || 'Versand fehlgeschlagen.');
        }
        show(
          'Danke. Wir melden uns innerhalb von 24 Stunden telefonisch.',
          'success',
        );
        form.reset();
      } catch (err) {
        show(
          `Versand fehlgeschlagen: ${err.message}. Bitte rufen Sie direkt an: 0176 95762018.`,
          'error',
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });

    function show(text, kind) {
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
