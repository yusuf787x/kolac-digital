/**
 * Zeitfresser-Rechner — Interaktivitaet fuer das statische Markup.
 * Das HTML wird bereits vollstaendig in public/index.html gerendert.
 * Dieses Script haengt sich nur an: Slider-Werte updaten, Ergebnis
 * berechnen, Formular abschicken.
 * Config-Wert (Arbeitswochen) hier inline — wenn du das anpasst,
 * auch in ZeitfresserRechner.tsx (React-Version) anpassen.
 */
(function () {
  'use strict';

  const WORKING_WEEKS_PER_YEAR = 46;

  function boot() {
    document.querySelectorAll('[data-zeitfresser]').forEach(setup);
  }
  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
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
  function unitFor(key) {
    if (key === 'avgOrderValue' || key === 'hourlyRate') return '€';
    if (key === 'hoursPerWeek') return 'Std.';
    return 'Anfragen';
  }

  function setup(root) {
    if (root.dataset.zeitfresserBooted === '1') return;
    root.dataset.zeitfresserBooted = '1';

    const inputs = root.querySelectorAll('input[type="range"]');
    if (inputs.length === 0) return;

    const state = {};
    inputs.forEach((input) => {
      state[input.dataset.key] = Number(input.value);
      updateFill(input);
      input.addEventListener('input', () => {
        const key = input.dataset.key;
        state[key] = Number(input.value);
        updateFill(input);
        const el = root.querySelector('[data-value="' + key + '"]');
        if (el) el.textContent = fmtValue(state[key], unitFor(key));
        updateResult();
      });
    });

    const hoursOut = root.querySelector('[data-out="hours"]');
    const euroOut = root.querySelector('[data-out="euro"]');
    const hintOut = root.querySelector('[data-out="hoursWeeksHint"]');
    function updateResult() {
      const lostHours =
        (state.hoursPerWeek || 0) * WORKING_WEEKS_PER_YEAR;
      const lostMoney =
        lostHours * (state.hourlyRate || 0) +
        (state.missedInquiries || 0) *
          (state.avgOrderValue || 0) *
          12;
      if (hoursOut) hoursOut.textContent = fmtInt(lostHours);
      if (euroOut) euroOut.textContent = fmtEur(lostMoney);
      if (hintOut) {
        const weeks =
          (state.hoursPerWeek || 0) > 0 ? Math.round(lostHours / 40) : 0;
        hintOut.textContent =
          weeks > 0 ? 'entspricht ' + weeks + ' Arbeitswochen' : '';
      }
    }
    updateResult();

    const form = root.querySelector('[data-zeitfresser-form]');
    if (!form) return;
    const status = form.querySelector('[data-status]');
    const submitBtn = form.querySelector('.zeitfresser-submit');

    function show(text, kind) {
      if (!status) return;
      status.hidden = false;
      status.textContent = text;
      status.className = 'zeitfresser-status ' + kind;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.website) return;
      if (!data.name || !data.phone || !data.email) {
        show('Bitte Name, Telefon und E-Mail ausfüllen.', 'error');
        return;
      }
      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sende…';
      const lostHours =
        (state.hoursPerWeek || 0) * WORKING_WEEKS_PER_YEAR;
      const total =
        lostHours * (state.hourlyRate || 0) +
        (state.missedInquiries || 0) *
          (state.avgOrderValue || 0) *
          12;
      const message = [
        'Zeitfresser-Rechner-Ergebnis:',
        '- ' + fmtInt(lostHours) + ' verlorene Stunden/Jahr',
        '- ' + fmtEur(total) + ' verlorenes Geld/Jahr',
        '',
        'Eingaben:',
        '- Büroarbeit: ' + (state.hoursPerWeek || 0) + ' Std./Woche',
        '- Verpasste Anfragen: ' +
          (state.missedInquiries || 0) +
          '/Monat',
        '- Ø Auftragswert: ' + fmtEur(state.avgOrderValue || 0),
        '- Stundenkosten: ' + fmtEur(state.hourlyRate || 0),
      ].join('\n');
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            phone: data.phone,
            email: data.email,
            message: message,
            source: 'Zeitfresser-Rechner (Homepage)',
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
          'Versand fehlgeschlagen: ' +
            err.message +
            '. Bitte ruf direkt an: 0176 95762018.',
          'error',
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  function updateFill(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const val = Number(input.value);
    const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--fill', pct + '%');
  }
})();
