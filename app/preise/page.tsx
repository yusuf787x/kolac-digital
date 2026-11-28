import Link from 'next/link';
import {
  ChartColumn,
  Eye,
  FilePlus,
  Gauge,
  ListChecks,
  MapPin,
  Megaphone,
  Monitor,
  Nfc,
  PenLine,
  Search,
  Server,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import { FaqListe } from '../webseiten/sections';
import { PraxisBeleg } from '../seo/sections';

/**
 * Website-Pakete (einmaliger Aufbau plus Monatspreis), von günstig nach
 * umfangreich. Wird im Gespräch gezeigt, nicht beworben. Bewusst ohne
 * Empfehlungs-Markierung: die Empfehlung gibt Yusuf vor Ort.
 * Wertstapel: Einzelwerte aus docs/OFFER.md und docs/OFFER-WEBSITE.md,
 * neue Werte in docs/PAKETE-WEBSITE.md. Jedes Paket enthält das vorige,
 * die Werte addieren sich.
 */

const LAUFZEIT = '6 Monate';

type Posten = { icon: LucideIcon; text: string; wert?: number };

type Paket = {
  name: string;
  claim: string;
  seo: string;
  einmalig: number;
  preis: number;
  vorher?: { name: string; wert: number };
  start: Posten[];
  monatVorher?: string;
  monat: Posten[];
  erwartung: { label: string; wert: string }[];
};

const basisStart: Posten[] = [
  { icon: Monitor, text: 'Website bis 5 Seiten, schnell und fürs Handy gebaut', wert: 1490 },
  { icon: PenLine, text: 'Texte inklusive: 30 Minuten reden, wir schreiben alles', wert: 490 },
  { icon: Search, text: 'SEO-Grundausstattung: Titel, Beschreibungen, Ladezeit, bei Google angemeldet', wert: 390 },
  { icon: MapPin, text: 'Google-Unternehmensprofil eingerichtet und mit der Website verbunden', wert: 290 },
  { icon: ShieldCheck, text: 'Umzugs-Schutz: alle alten Adressen werden weitergeleitet', wert: 390 },
  { icon: Nfc, text: 'NFC-Bewertungsaufsteller für die Theke, Kunden bewerten mit einem Tippen', wert: 79 },
];

const sichtbarStart: Posten[] = [
  { icon: Monitor, text: '5 weitere Seiten, eine eigene Seite pro wichtiger Leistung', wert: 1490 },
  { icon: Target, text: 'Suchbegriff-Plan: die 10 Suchen, die bei dir Kunden bringen', wert: 390 },
  { icon: TrendingUp, text: 'Website auf diese 10 Suchbegriffe ausgerichtet', wert: 990 },
  { icon: MapPin, text: 'Maps-Makeover: Google-Profil komplett mit Fotos, Leistungen und Kategorien', wert: 490 },
  { icon: ListChecks, text: 'Einträge in den wichtigsten Verzeichnissen', wert: 390 },
  { icon: Eye, text: 'Konkurrenz-Report: warum die anderen vor dir stehen', wert: 290 },
  { icon: Megaphone, text: '12 Vorlagen für Google-Beiträge zu deiner Branche', wert: 120 },
];

const wachstumStart: Posten[] = [
  { icon: Gauge, text: 'Startwert-Scan: wir messen vorher, wie oft Google dich zeigt', wert: 290 },
  { icon: FilePlus, text: 'Themen-Turbo: 10 neue Seiten in den ersten 90 Tagen', wert: 1500 },
  { icon: Star, text: 'Bewertungs-Booster: einfacher Ablauf für mehr echte Bewertungen', wert: 190 },
  { icon: ChartColumn, text: 'Anfragen-Messung: du siehst, welche Anrufe und Anfragen von Google kommen', wert: 290 },
];

type Garantie = { titel: string; text: string; ab: 'Basis' | 'Sichtbar' | 'Wachstum' };

const garantien: Garantie[] = [
  {
    titel: 'Erst sehen, dann zahlen',
    text: 'Du siehst deine neue Startseite, bevor du zahlst. Gefällt sie dir nicht, kostet es nichts.',
    ab: 'Basis',
  },
  {
    titel: 'Pünktlich online',
    text: 'Spätestens 30 Tage nach deiner Freigabe online, sonst zahlst du die ersten 3 Monate nichts.',
    ab: 'Basis',
  },
  {
    titel: 'Öfter bei Google',
    text: 'Nach 90 Tagen zeigt Google dich mindestens 50 % öfter, sonst kein Monatsbeitrag, bis es so weit ist.',
    ab: 'Sichtbar',
  },
  {
    titel: 'Mehr neue Kunden über Google',
    text: 'Nach 90 Tagen mindestens 50 % mehr Besucher, die nicht nach deinem Namen gesucht haben, sonst kein Monatsbeitrag, bis es so weit ist.',
    ab: 'Wachstum',
  },
];

const stufe = { Basis: 0, Sichtbar: 1, Wachstum: 2 } as const;
const garantienFuer = (name: string) =>
  garantien.filter((g) => stufe[g.ab] <= stufe[name as keyof typeof stufe]);

const SIEGEL_RAND = Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 === 0 ? 11.5 : 9.6;
  const a = (Math.PI * i) / 16 - Math.PI / 2;
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
}).join(' ');

/** Gezacktes Garantie-Siegel mit Haken, damit Garantien sofort als solche erkannt werden. */
function Siegel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <polygon points={SIEGEL_RAND} style={{ fill: 'var(--color-guarantee)' }} />
      <circle cx="12" cy="12" r="7.4" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.8" />
      <path d="M8.4 12.3l2.4 2.4 4.8-5" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const summe = (p: Posten[]) => p.reduce((s, x) => s + (x.wert ?? 0), 0);
const basisWert = summe(basisStart);
const sichtbarWert = basisWert + summe(sichtbarStart);
const wachstumWert = sichtbarWert + summe(wachstumStart);

const pakete: (Paket & { gesamt: number })[] = [
  {
    name: 'Basis',
    claim: 'Website mit SEO-Grundausstattung',
    seo: 'Mit Basis-SEO',
    einmalig: 1000,
    preis: 99,
    gesamt: basisWert,
    start: basisStart,
    monat: [
      { icon: Server, text: 'Hosting, Domain, SSL und Sicherheitsupdates' },
      { icon: MapPin, text: 'Wir halten dein Google-Profil aktuell, etwa Öffnungszeiten und Feiertage' },
      { icon: Wrench, text: 'Kleine Änderungen bis 30 Minuten im Monat' },
    ],
    erwartung: [
      { label: 'Seiten zum Start', wert: 'bis 5' },
      { label: 'Bei Google', wert: 'sauber gefunden über deinen Namen' },
      { label: 'Neue Kunden über Google', wert: 'erste Grundlage' },
    ],
  },
  {
    name: 'Sichtbar',
    claim: 'Website und Google-Grundlage',
    seo: 'Mit SEO-Grundlage',
    einmalig: 2490,
    preis: 199,
    gesamt: sichtbarWert,
    vorher: { name: 'Basis', wert: basisWert },
    start: sichtbarStart,
    monatVorher: 'Basis',
    monat: [
      { icon: MapPin, text: 'Wir kümmern uns um dein Google-Profil: Fotos, Angebote, Hilfe bei Antworten auf Bewertungen' },
      { icon: ChartColumn, text: 'Kundenportal mit deinen Google-Zahlen und Bericht jeden Monat' },
      { icon: Search, text: 'Deine 10 Suchbegriffe immer im Blick' },
      { icon: Wrench, text: 'Änderungen bis 1 Stunde im Monat' },
    ],
    erwartung: [
      { label: 'Seiten zum Start', wert: 'bis 10' },
      { label: 'Bei Google ohne Firmennamen', wert: 'für die Hauptbegriffe' },
      { label: 'Deine Zahlen', wert: 'jeden Monat im Portal' },
    ],
  },
  {
    name: 'Wachstum',
    claim: 'Website und neue Inhalte jeden Monat',
    seo: 'Mit laufender SEO',
    einmalig: 3490,
    preis: 349,
    gesamt: wachstumWert,
    vorher: { name: 'Sichtbar', wert: sichtbarWert },
    start: wachstumStart,
    monatVorher: 'Sichtbar',
    monat: [
      { icon: FilePlus, text: 'Jeden Monat zwei neue Seiten oder Ratgeber zu deinen Leistungen' },
      { icon: Megaphone, text: 'Google-Beiträge jeden Monat, wir schreiben und stellen sie ein' },
      { icon: Target, text: 'Suchbegriffe alle drei Monate geprüft und nachgeschärft' },
      { icon: Wrench, text: 'Änderungen bis 2 Stunden im Monat' },
    ],
    erwartung: [
      { label: 'Seiten nach 12 Monaten', wert: 'über 30' },
      { label: 'Bei Google ohne Firmennamen', wert: 'wächst Monat für Monat' },
      { label: 'Erste deutliche Bewegung', wert: 'meist nach 3 bis 6 Monaten' },
    ],
  },
];

const kennzahlen = [
  { wert: 'ab 1.000 €', label: 'einmalig für den Aufbau' },
  { wert: 'ab 99 €', label: 'im Monat, Pflege inklusive' },
  { wert: LAUFZEIT, label: 'Mindestlaufzeit, danach monatlich kündbar' },
  { wert: '7 Tage', label: 'bis zum Startseiten-Entwurf' },
];

const markt = [
  { wer: 'Baukasten, selbst gebaut', hinweis: 'Bauen und Pflegen machst du selbst', einmalig: '0 €', monat: '7 bis 36 €' },
  { wer: 'Freelancer', einmalig: '800 bis 3.000 €', monat: '50 bis 150 €' },
  { wer: 'Website-Abo einer Agentur', hinweis: 'meist 24 Monate Laufzeit', einmalig: '490 bis 1.490 €', monat: '129 bis 229 €' },
  { wer: 'Agentur', einmalig: '2.000 bis 8.000 €', monat: '200 bis 500 €' },
  { wer: 'SEO-Betreuung einer Agentur', hinweis: 'zusätzlich zur Website', einmalig: 'oft extra', monat: '500 bis 1.500 €' },
];

const quellen = [
  { name: 'Appy Pie: Website erstellen lassen', url: 'https://www.appypie.com/de/?p=2732794' },
  { name: 'alloq: Firmenwebsite erstellen lassen', url: 'https://alloq.digital/de/blog/firmenwebsite-erstellen-lassen/' },
  { name: 'Xictron: Website-Abo', url: 'https://www.xictron.com/de/website-abo/' },
];

const faqs = [
  {
    question: 'Wofür ist der einmalige Betrag, wofür der monatliche?',
    answer:
      'Der einmalige Betrag deckt den Aufbau: Entwurf, Seiten, Texte und Einrichtung. Der monatliche Betrag deckt Hosting, Sicherheit, Änderungen und die Pflege deines Google-Profils, und je nach Paket die Arbeit dafür, dass du bei Google gefunden wirst.',
  },
  {
    question: 'Wie lange bin ich gebunden?',
    answer: `Nur ${LAUFZEIT}. Danach läuft dein Paket weiter und ist monatlich kündbar.`,
  },
  {
    question: 'Kann ich später ein größeres Paket nehmen?',
    answer: 'Ja, ein Wechsel nach oben geht jederzeit.',
  },
  {
    question: 'Wann sieht man Ergebnisse bei Google?',
    answer:
      'Google braucht Zeit, einer neuen Seite zu vertrauen. Erste Bewegung sehen wir oft nach einigen Wochen, deutlich wird es meist nach drei bis sechs Monaten. Deine Zahlen siehst du dabei jeden Monat im Kundenportal.',
  },
  {
    question: 'Gibt es Kosten, die noch dazukommen?',
    answer:
      'Hosting, Domain, SSL und Sicherheitsupdates sind in jedem Paket enthalten. Extras wie ein Online-Shop oder eine Online-Terminbuchung bekommen vorher einen festen Preis.',
  },
];

const eur = (n: number) => n.toLocaleString('de-DE');

function Hero() {
  return (
    <section className="border-b border-gray-100 bg-linear-to-b from-white to-gray-50">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pt-16">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Pakete und Preise</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            Eine Website, die bei Google gefunden wird.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
            Drei Pakete, alle mit SEO und Google-Profil. Einmal für den Aufbau, danach ein fester Monatspreis
            mit Pflege inklusive. Der Unterschied ist, wie stark wir daran arbeiten, dass neue Kunden dich bei
            Google finden.
          </p>
        </Reveal>

        <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kennzahlen.map((k) => (
            <div key={k.label} className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-xs">
              <dt className="sr-only">{k.label}</dt>
              <dd>
                <span className="block text-2xl font-bold tracking-tight text-gray-900">{k.wert}</span>
                <span className="mt-1 block text-sm text-gray-600">{k.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function PostenListe({ posten, mitWert }: { posten: Posten[]; mitWert?: boolean }) {
  return (
    <ul className="space-y-3">
      {posten.map((p) => {
        const Icon = p.icon;
        return (
          <li key={p.text} className="flex items-start gap-3 text-sm leading-relaxed text-gray-700">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-brand-blue">
              <Icon aria-hidden className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="flex-1 pt-0.5">{p.text}</span>
            {mitWert && p.wert && (
              <span className="shrink-0 pt-0.5 text-xs tabular-nums text-gray-400">{eur(p.wert)} €</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PaketKarte({ p }: { p: Paket & { gesamt: number } }) {
  return (
    <article className="flex flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-xs sm:p-8">
      <p className="text-sm font-semibold text-brand-blue">{p.seo}</p>
      <h3 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{p.name}</h3>
      <p className="mt-1 text-sm text-gray-600">{p.claim}</p>

      <div className="mt-6 space-y-1">
        <p className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold tracking-tight text-gray-900 tabular-nums">{eur(p.einmalig)} €</span>
          <span className="text-base text-gray-600">einmalig</span>
        </p>
        <p className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-gray-900 tabular-nums">+ {eur(p.preis)} €</span>
          <span className="text-base text-gray-600">im Monat</span>
        </p>
      </div>
      <p className="mt-2 text-sm text-gray-600">netto zzgl. MwSt., {LAUFZEIT} Mindestlaufzeit</p>
      <div
        className="mt-5 rounded-2xl border p-4"
        style={{ background: 'var(--color-guarantee-bg)', borderColor: 'var(--color-guarantee-line)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-guarantee)' }}>
          Deine Garantien
        </p>
        <ul className="mt-3 space-y-3">
          {garantienFuer(p.name).map((g) => (
            <li key={g.titel} className="flex items-start gap-2.5">
              <Siegel className="mt-0.5 h-7 w-7 shrink-0" />
              <span className="text-sm leading-snug text-gray-700">
                <strong className="block font-semibold text-gray-900">{g.titel}</strong>
                {g.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Zum Start bekommst du</p>
        {p.vorher && (
          <p className="mb-3 flex items-baseline justify-between gap-3 text-sm font-semibold text-gray-900">
            <span>Alles aus „{p.vorher.name}“, dazu:</span>
            <span className="shrink-0 text-xs font-normal tabular-nums text-gray-400">{eur(p.vorher.wert)} €</span>
          </p>
        )}
        <PostenListe posten={p.start} mitWert />
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-2xl bg-gray-50 px-4 py-3">
          <span className="whitespace-nowrap text-sm text-gray-600">
            Gesamtwert <span className="tabular-nums line-through">{eur(p.gesamt)}&nbsp;€</span>
          </span>
          <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
            du zahlst <span className="tabular-nums">{eur(p.einmalig)}&nbsp;€</span>
          </span>
        </div>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Jeden Monat dabei</p>
        {p.monatVorher && (
          <p className="mb-3 text-sm font-semibold text-gray-900">Alles aus „{p.monatVorher}“, dazu:</p>
        )}
        <PostenListe posten={p.monat} />
      </div>

      <div className="mt-auto pt-6">
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Was du erwarten kannst</p>
          <dl className="mt-3 space-y-2">
            {p.erwartung.map((e) => (
              <div key={e.label} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <dt className="text-gray-600">{e.label}</dt>
                <dd className="font-semibold text-gray-900">{e.wert}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  );
}

function Pakete() {
  return (
    <section id="pakete" className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="sr-only">Die drei Pakete</h2>
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
          {pakete.map((p) => (
            <PaketKarte key={p.name} p={p} />
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
          Die genauen Regeln der Garantien stehen im Vertrag.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
          Extras wie Online-Shop oder Terminbuchung für Beratungen planen wir gern dazu, mit festem Preis vorab.
        </p>
      </div>
    </section>
  );
}

function Marktvergleich() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">Zum Vergleich</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Was Websites sonst kosten.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-gray-700">
          Übliche Preise in Deutschland, damit du einordnen kannst, wo wir liegen.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200">
          <div className="hidden grid-cols-[2fr_1fr_1fr] gap-4 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:grid">
            <span>Anbieter</span>
            <span className="text-right">Einmalig</span>
            <span className="text-right">Im Monat</span>
          </div>
          {markt.map((m) => (
            <div
              key={m.wer}
              className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-gray-100 px-5 py-4 first:border-t-0 sm:grid-cols-[2fr_1fr_1fr] sm:first:border-t"
            >
              <div className="col-span-2 sm:col-span-1">
                <span className="font-semibold text-gray-900">{m.wer}</span>
                {m.hinweis && <span className="block text-sm text-gray-600">{m.hinweis}</span>}
              </div>
              <span className="text-sm tabular-nums text-gray-900 sm:text-right">
                <span className="text-gray-500 sm:hidden">Einmalig: </span>
                {m.einmalig}
              </span>
              <span className="text-sm font-semibold tabular-nums text-gray-900 sm:text-right">
                <span className="font-normal text-gray-500 sm:hidden">Monat: </span>
                {m.monat}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-gray-200 bg-blue-50/60 px-5 py-4 sm:grid-cols-[2fr_1fr_1fr]">
            <div className="col-span-2 sm:col-span-1">
              <span className="font-semibold text-brand-blue">Kolac Digital</span>
              <span className="block text-sm text-gray-700">
                SEO und Google-Profil in jedem Paket, Pflege inklusive, nur {LAUFZEIT} Laufzeit
              </span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-brand-blue sm:text-right">
              <span className="font-normal text-gray-500 sm:hidden">Einmalig: </span>
              1.000 bis 3.490 €
            </span>
            <span className="text-sm font-semibold tabular-nums text-brand-blue sm:text-right">
              <span className="font-normal text-gray-500 sm:hidden">Monat: </span>
              99 bis 349 €
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          Quellen (Stand November 2026):{' '}
          {quellen.map((q, i) => (
            <span key={q.url}>
              <a href={q.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-gray-700">
                {q.name}
              </a>
              {i < quellen.length - 1 ? ', ' : '. '}
            </span>
          ))}
          SEO-Betreuung: übliche Agenturpreise für lokale Betriebe.
        </p>
      </div>
    </section>
  );
}

function Abschluss() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Welches Paket passt zu dir?</h2>
        <p className="mt-4 text-base leading-relaxed text-gray-700">
          Wir schauen gemeinsam, wonach deine Kunden bei Google suchen und wer dort heute vorne steht. Danach ist
          meist klar, welches Paket sich lohnt.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href={site.meetingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary px-6 py-3 text-base">
            Termin vereinbaren
          </a>
          <Link href="/seo-check" className="btn-secondary px-6 py-3 text-base">
            Kostenlosen SEO-Check starten
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Oder direkt anrufen:{' '}
          <a href={`tel:${site.phoneE164}`} className="font-medium text-brand-blue hover:underline">
            {site.phone}
          </a>
        </p>
      </div>
    </section>
  );
}

export default function PreisePage() {
  return (
    <>
      <Hero />
      <Pakete />
      <PraxisBeleg eyebrow="Was SEO bewirken kann" title="Ein Beispiel aus unseren Projekten." />
      <Marktvergleich />
      <FaqListe title="Fragen zu den Paketen" faqs={faqs} />
      <Abschluss />
    </>
  );
}
