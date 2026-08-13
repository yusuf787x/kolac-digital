'use client';

import { useMemo, useState } from 'react';

/**
 * Zeitfresser-Rechner fuer die React-Landingpage /webseiten.
 * Config bewusst lokal (statt fetch), damit die Seite kein
 * client-side JSON-Fetch macht — hydriert direkt aus dem Modul.
 * Wenn du Formeln/Startwerte aendern willst, hier oder in
 * public/content/zeitfresser.json (fuer die statische Site).
 */

const CONFIG = {
  workingWeeksPerYear: 46,
  sliders: {
    hoursPerWeek: {
      label: 'Wie viele Stunden pro Woche gehen für Büroarbeit drauf?',
      hint: 'Termine koordinieren, Anfragen beantworten, Angebote und Rechnungen',
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
  cta: {
    sectionLabel: 'IHRE ZEIT',
    headline: 'Rechnen Sie kurz mit.',
    subline:
      'Vier Regler, Ihre eigenen Zahlen. Am Ende steht, was das Wiederholen Sie Woche für Woche kostet.',
    explainer:
      'So viel Zeit und Geld steckt aktuell in Arbeit, die ein System für Sie übernehmen könnte. Jeden Tag, jeden Monat, jedes Jahr.',
    footnote: 'Gerechnet mit 46 Arbeitswochen. Ihre Zahlen, keine Studie.',
    buttonText: 'Zeig mir, wie ich das zurückhole',
    formHeadline: 'Kostenlose Zeitfresser-Analyse',
    formSubline:
      'Wir schauen 15 Minuten auf Ihren Betrieb und zeigen, wo Sie konkret Zeit und Geld verlieren. Kostet nichts, verpflichtet zu nichts.',
  },
} as const;

type SliderKey = keyof typeof CONFIG.sliders;

const fmtEur = (n: number) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(
    Math.round(n),
  ) + ' €';
const fmtInt = (n: number) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );

function fmtValue(v: number, unit: string): string {
  if (unit === '€') return fmtEur(v);
  if (unit === 'Std.') return `${fmtInt(v)} Std.`;
  return `${fmtInt(v)} ${unit}`;
}

export default function ZeitfresserRechner() {
  const [state, setState] = useState<Record<SliderKey, number>>({
    hoursPerWeek: CONFIG.sliders.hoursPerWeek.default,
    missedInquiries: CONFIG.sliders.missedInquiries.default,
    avgOrderValue: CONFIG.sliders.avgOrderValue.default,
    hourlyRate: CONFIG.sliders.hourlyRate.default,
  });

  const result = useMemo(() => {
    const lostHours = state.hoursPerWeek * CONFIG.workingWeeksPerYear;
    const lostMoneyTime = lostHours * state.hourlyRate;
    const lostMoneyRevenue =
      state.missedInquiries * state.avgOrderValue * 12;
    const total = lostMoneyTime + lostMoneyRevenue;
    const asWorkweeks =
      state.hoursPerWeek > 0 ? Math.round(lostHours / 40) : 0;
    return { lostHours, total, asWorkweeks };
  }, [state]);

  // Formular
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (website) return; // Honeypot
    if (!name || !phone || !email) {
      setStatus('error');
      setStatusMsg('Bitte Name, Telefon und E-Mail ausfüllen.');
      return;
    }
    setStatus('sending');
    setStatusMsg(null);
    const message = [
      `Zeitfresser-Rechner-Ergebnis:`,
      `- ${fmtInt(result.lostHours)} verlorene Stunden/Jahr`,
      `- ${fmtEur(result.total)} verlorenes Geld/Jahr`,
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
          name,
          phone,
          email,
          message,
          source: 'Zeitfresser-Rechner (Webseiten-Landing)',
          website,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error || 'Versand fehlgeschlagen.');
      }
      setStatus('success');
      setStatusMsg(
        'Danke. Wir melden uns innerhalb von 24 Stunden telefonisch.',
      );
      setName('');
      setPhone('');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setStatusMsg(
        `Versand fehlgeschlagen: ${(err as Error).message}. Bitte rufen Sie uns direkt an: 0176 95762018.`,
      );
    }
  };

  return (
    <section id="zeitfresser" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Intro */}
        <div className="mx-auto mb-12 grid max-w-4xl gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
              <span className="h-px w-6 bg-brand-blue" />
              {CONFIG.cta.sectionLabel}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              {CONFIG.cta.headline}
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-600">
            {CONFIG.cta.subline}
          </p>
        </div>

        {/* Rechner-Card */}
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl shadow-xl md:grid-cols-2">
          {/* Slider-Spalte */}
          <div className="flex flex-col gap-6 bg-white p-8 md:p-10">
            {(Object.keys(CONFIG.sliders) as SliderKey[]).map((key) => {
              const cfg = CONFIG.sliders[key];
              const val = state[key];
              const pct =
                cfg.max > cfg.min
                  ? ((val - cfg.min) / (cfg.max - cfg.min)) * 100
                  : 0;
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm leading-snug text-gray-900">
                      {cfg.label}
                    </span>
                    <span className="whitespace-nowrap font-serif text-xl font-bold text-brand-blue tabular-nums">
                      {fmtValue(val, cfg.unit)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={cfg.min}
                    max={cfg.max}
                    step={cfg.step}
                    value={val}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        [key]: Number(e.target.value),
                      }))
                    }
                    aria-label={cfg.label}
                    className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full accent-brand-blue [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-blue [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
                    style={{
                      background: `linear-gradient(to right, var(--tw-color-brand-blue, #0071e3) 0%, var(--tw-color-brand-blue, #0071e3) ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
                    }}
                  />
                  {cfg.hint && (
                    <p className="mt-1 text-xs text-gray-400">{cfg.hint}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ergebnis-Spalte (dunkel) */}
          <div className="flex flex-col justify-center gap-5 bg-[#1a1a2e] p-8 text-white md:p-10">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="font-serif text-4xl font-bold leading-none tabular-nums md:text-5xl">
                  {fmtInt(result.lostHours)}
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#ff6b6b]">
                  Stunden im Jahr
                </div>
                {result.asWorkweeks > 0 && (
                  <div className="mt-1 text-xs text-white/60">
                    entspricht {result.asWorkweeks} Arbeitswochen
                  </div>
                )}
              </div>
              <div>
                <div className="font-serif text-4xl font-bold leading-none tabular-nums md:text-5xl">
                  {fmtEur(result.total)}
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#ff6b6b]">
                  im Jahr
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/85">
              {CONFIG.cta.explainer}
            </p>
            <p className="text-xs text-white/50">{CONFIG.cta.footnote}</p>
          </div>
        </div>

        {/* CTA-Formular */}
        <div className="mx-auto mt-8 max-w-5xl rounded-3xl bg-white p-8 shadow-md md:p-10">
          <h3 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">
            {CONFIG.cta.formHeadline}
          </h3>
          <p className="mb-5 text-sm leading-relaxed text-gray-600">
            {CONFIG.cta.formSubline}
          </p>
          {status === 'success' ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              {statusMsg}
            </div>
          ) : (
            <form
              onSubmit={submit}
              noValidate
              className="grid grid-cols-1 gap-3 md:grid-cols-3"
            >
              <input
                type="text"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name *"
                autoComplete="name"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
              <input
                type="tel"
                name="phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefon *"
                autoComplete="tel"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-Mail *"
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
              />
              {/* Honeypot */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                aria-hidden
                className="absolute -left-[9999px] opacity-0"
              />
              <button
                type="submit"
                disabled={status === 'sending'}
                className="col-span-full mt-2 inline-flex items-center justify-center rounded-full bg-brand-blue px-6 py-4 text-base font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'sending' ? 'Sende…' : CONFIG.cta.buttonText}
              </button>
              {status === 'error' && statusMsg && (
                <div className="col-span-full rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {statusMsg}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
