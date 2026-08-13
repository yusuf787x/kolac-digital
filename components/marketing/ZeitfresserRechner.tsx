'use client';

import { useMemo, useState } from 'react';

/**
 * Zeitfresser-Rechner fuer die React-Landingpage /webseiten.
 * Config liegt lokal im Modul; die Vanilla-Variante fuer die
 * statische Homepage steht in public/js/zeitfresser.js und hat
 * dieselben Werte inline.
 */

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
  cta: {
    sectionLabel: 'IHRE ZEIT',
    headline: 'Rechnen Sie kurz mit.',
    explainer:
      'So viel Zeit und Geld steckt aktuell in Arbeit, die ein System für Sie übernehmen könnte.',
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
    if (website) return;
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
    <section id="zeitfresser" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-blue">
            {CONFIG.cta.sectionLabel}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            {CONFIG.cta.headline}
          </h2>
        </div>

        <div className="mx-auto grid overflow-hidden rounded-2xl border border-gray-200 bg-white md:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-5 p-7 md:p-8">
            {(Object.keys(CONFIG.sliders) as SliderKey[]).map((key) => {
              const cfg = CONFIG.sliders[key];
              const val = state[key];
              const pct =
                cfg.max > cfg.min
                  ? ((val - cfg.min) / (cfg.max - cfg.min)) * 100
                  : 0;
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] leading-snug text-gray-800">
                      {cfg.label}
                    </span>
                    <span className="whitespace-nowrap text-[15px] font-bold text-brand-blue tabular-nums">
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
                    className="mt-1 h-[3px] w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand-blue [&::-webkit-slider-thumb]:shadow-sm"
                    style={{
                      background: `linear-gradient(to right, #0071e3 0%, #0071e3 ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
                    }}
                  />
                  {cfg.hint && (
                    <p className="text-[11px] text-gray-400">{cfg.hint}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col justify-center gap-4 border-t border-gray-200 bg-[#f5f8fc] p-7 md:border-l md:border-t-0 md:p-8">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="whitespace-nowrap text-3xl font-bold leading-[1.05] tracking-tight text-brand-blue tabular-nums">
                  {fmtInt(result.lostHours)}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                  Stunden im Jahr
                </div>
                {result.asWorkweeks > 0 && (
                  <div className="mt-0.5 text-[11px] text-gray-400">
                    entspricht {result.asWorkweeks} Arbeitswochen
                  </div>
                )}
              </div>
              <div>
                <div className="whitespace-nowrap text-3xl font-bold leading-[1.05] tracking-tight text-brand-blue tabular-nums">
                  {fmtEur(result.total)}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                  Kosten im Jahr
                </div>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-gray-800">
              {CONFIG.cta.explainer}
            </p>
            <p className="text-[11px] text-gray-400">{CONFIG.cta.footnote}</p>
          </div>
        </div>

        <div className="mx-auto mt-5 rounded-2xl border border-gray-200 bg-white p-7 md:p-8">
          <h3 className="mb-1 text-xl font-bold tracking-tight text-gray-900">
            {CONFIG.cta.formHeadline}
          </h3>
          <p className="mb-4 text-[13px] leading-relaxed text-gray-600">
            {CONFIG.cta.formSubline}
          </p>
          {status === 'success' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {statusMsg}
            </div>
          ) : (
            <form
              onSubmit={submit}
              noValidate
              className="grid grid-cols-1 gap-2.5 md:grid-cols-3"
            >
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="zf-name"
                  className="pl-0.5 text-xs font-medium text-gray-500"
                >
                  Name
                </label>
                <input
                  id="zf-name"
                  type="text"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ihr Name"
                  autoComplete="name"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition hover:border-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="zf-phone"
                  className="pl-0.5 text-xs font-medium text-gray-500"
                >
                  Telefon
                </label>
                <input
                  id="zf-phone"
                  type="tel"
                  name="phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0176 …"
                  autoComplete="tel"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition hover:border-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="zf-email"
                  className="pl-0.5 text-xs font-medium text-gray-500"
                >
                  E-Mail
                </label>
                <input
                  id="zf-email"
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre@mail.de"
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition hover:border-gray-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
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
                className="col-span-full mt-1.5 inline-flex items-center justify-center rounded-full bg-brand-blue px-6 py-3 text-[15px] font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'sending' ? 'Sende…' : CONFIG.cta.buttonText}
              </button>
              {status === 'error' && statusMsg && (
                <div className="col-span-full rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-800">
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
