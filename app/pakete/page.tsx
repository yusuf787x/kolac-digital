import Link from 'next/link';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import { FaqListe } from '../webseiten/sections';
import { PraxisBeleg } from '../seo/sections';

/**
 * Website-Pakete mit Monatspreisen, sortiert von umfangreich nach schlicht.
 * Wird im Gespräch gezeigt (Sie-Form, Geschäftsdokument), nicht beworben.
 * Marktwerte stammen aus den Quellen unten, umgerechnet auf 24 Monate.
 */

type Paket = {
  name: string;
  claim: string;
  preis: number;
  seo: string;
  empfohlen?: boolean;
  basis?: string;
  inhalt: string[];
  erwartung: { label: string; wert: string }[];
};

const pakete: Paket[] = [
  {
    name: 'Wachstum',
    claim: 'Website und SEO mit neuen Inhalten jeden Monat',
    preis: 399,
    seo: 'Mit laufender SEO',
    basis: 'Alles aus „Sichtbar“, dazu:',
    inhalt: [
      'Jeden Monat zwei neue Seiten oder Ratgeber zu Ihren Leistungen',
      'Google-Beiträge jeden Monat, damit das Profil aktiv bleibt',
      'Aufsteller mit NFC für mehr echte Bewertungen',
      'Suchbegriffe alle drei Monate geprüft und nachgeschärft',
      'Änderungen bis 2 Stunden im Monat',
    ],
    erwartung: [
      { label: 'Seiten nach 12 Monaten', wert: 'über 30' },
      { label: 'Bei Google ohne Firmennamen', wert: 'wächst Monat für Monat' },
      { label: 'Erste deutliche Bewegung', wert: 'meist nach 3 bis 6 Monaten' },
    ],
  },
  {
    name: 'Sichtbar',
    claim: 'Website und Google-Grundlage',
    preis: 249,
    seo: 'Mit SEO-Grundlage',
    empfohlen: true,
    basis: 'Alles aus „Basis“, dazu:',
    inhalt: [
      'Bis 10 Seiten, eine eigene Seite pro wichtiger Leistung',
      'Ausgerichtet auf die 10 Suchbegriffe, die Kunden bringen',
      'Google-Unternehmensprofil komplett eingerichtet und verbunden',
      'Kundenportal mit Ihren Google-Zahlen und Bericht jeden Monat',
      'Änderungen bis 1 Stunde im Monat',
    ],
    erwartung: [
      { label: 'Seiten zum Start', wert: 'bis 10' },
      { label: 'Bei Google ohne Firmennamen', wert: 'für die Hauptbegriffe' },
      { label: 'Ihre Zahlen', wert: 'jeden Monat im Portal' },
    ],
  },
  {
    name: 'Basis',
    claim: 'Website ohne SEO',
    preis: 129,
    seo: 'Ohne SEO',
    inhalt: [
      'Website bis 5 Seiten, schnell und fürs Handy gebaut',
      'Hosting, Domain, SSL und Sicherheitsupdates inklusive',
      'Kontaktformular, Impressum und Datenschutz eingebunden',
      'Kleine Änderungen bis 30 Minuten im Monat',
    ],
    erwartung: [
      { label: 'Seiten zum Start', wert: 'bis 5' },
      { label: 'Bei Google', wert: 'über Ihren Firmennamen' },
      { label: 'Neue Kunden über Google', wert: 'nicht das Ziel dieses Pakets' },
    ],
  },
];

const kennzahlen = [
  { wert: 'ab 129 €', label: 'im Monat, netto' },
  { wert: '0 €', label: 'Einrichtung' },
  { wert: '24 Monate', label: 'Mindestlaufzeit' },
  { wert: '7 Tage', label: 'bis zum Startseiten-Entwurf' },
];

const markt = [
  {
    wer: 'Baukasten, selbst gebaut',
    wie: '7 bis 36 € im Monat, Bauen und Pflegen machen Sie selbst',
    monat: 'rund 7 bis 36 €',
  },
  {
    wer: 'Freelancer',
    wie: '800 bis 3.000 € einmalig, Wartung 50 bis 150 € im Monat',
    monat: 'rund 80 bis 280 €',
  },
  {
    wer: 'Website-Abo einer Agentur',
    wie: '129 bis 229 € im Monat plus 490 bis 1.490 € Einrichtung',
    monat: 'rund 150 bis 290 €',
  },
  {
    wer: 'Agentur, einmal gekauft',
    wie: '2.000 bis 8.000 € einmalig, Wartung 200 bis 500 € im Monat',
    monat: 'rund 280 bis 830 €',
  },
  {
    wer: 'SEO-Betreuung einer Agentur',
    wie: 'zusätzlich zur Website',
    monat: '500 bis 1.500 €',
  },
];

const quellen = [
  { name: 'Appy Pie: Website erstellen lassen', url: 'https://www.appypie.com/de/?p=2732794' },
  { name: 'alloq: Firmenwebsite erstellen lassen', url: 'https://alloq.digital/de/blog/firmenwebsite-erstellen-lassen/' },
  { name: 'Xictron: Website-Abo', url: 'https://www.xictron.com/de/website-abo/' },
];

const faqs = [
  {
    question: 'Warum monatlich statt einmal bezahlen?',
    answer:
      'Sie zahlen keine große Rechnung am Anfang. Hosting, Sicherheit und Änderungen laufen mit, und wir bleiben an Ihrer Website dran, statt sie nach dem Start allein zu lassen.',
  },
  {
    question: 'Was passiert nach den 24 Monaten?',
    answer: 'Das Paket läuft einfach weiter und ist dann monatlich kündbar.',
  },
  {
    question: 'Kann ich später ein größeres Paket nehmen?',
    answer: 'Ja, ein Wechsel nach oben geht jederzeit. Die Laufzeit beginnt dafür nicht neu.',
  },
  {
    question: 'Wann sieht man Ergebnisse bei Google?',
    answer:
      'Google braucht Zeit, einer neuen Seite zu vertrauen. Erste Bewegung sehen wir oft nach einigen Wochen, deutlich wird es meist nach drei bis sechs Monaten. Ihre Zahlen sehen Sie dabei jeden Monat im Kundenportal.',
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
            Ihre Website zum Monatspreis.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
            Drei Pakete, von umfangreich bis schlicht. Alle mit festem Monatspreis, ohne Einrichtungsgebühr und
            mit Pflege inklusive. Der Unterschied ist, wie stark wir uns darum kümmern, dass Sie bei Google
            gefunden werden.
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

function PaketKarte({ p }: { p: Paket }) {
  return (
    <article
      className={`relative flex flex-col rounded-3xl bg-white p-6 sm:p-8 ${
        p.empfohlen ? 'shadow-xl ring-2 ring-brand-blue' : 'border border-gray-100 shadow-xs'
      }`}
    >
      {p.empfohlen && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold text-white">
          Unsere Empfehlung
        </span>
      )}
      <p className="text-sm font-semibold text-brand-blue">{p.seo}</p>
      <h3 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{p.name}</h3>
      <p className="mt-1 text-sm text-gray-600">{p.claim}</p>

      <p className="mt-6 flex items-baseline gap-1">
        <span className="text-5xl font-extrabold tracking-tight text-gray-900 tabular-nums">{eur(p.preis)} €</span>
        <span className="text-base text-gray-600">/ Monat</span>
      </p>
      <p className="mt-1 text-sm text-gray-600">netto zzgl. MwSt., 24 Monate Mindestlaufzeit</p>

      <div className="mt-6 border-t border-gray-100 pt-6">
        {p.basis && <p className="mb-3 text-sm font-semibold text-gray-900">{p.basis}</p>}
        <ul className="space-y-2.5">
          {p.inhalt.map((i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
              <span aria-hidden className="mt-0.5 text-brand-blue">
                ✓
              </span>
              {i}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-6">
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Was Sie erwarten können</p>
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
          Bevor Sie sich festlegen, sehen Sie einen Entwurf Ihrer Startseite. Extras wie Online-Shop oder
          Terminbuchung für Beratungen planen wir gern dazu, mit festem Preis vorab.
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
          Übliche Preise in Deutschland, damit Sie einordnen können. Einmalbeträge haben wir auf 24 Monate
          verteilt, so lassen sich alle Angebote als Monatspreis vergleichen.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200">
          <div className="hidden grid-cols-[1.2fr_2fr_1fr] gap-4 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:grid">
            <span>Anbieter</span>
            <span>Üblicher Preis</span>
            <span className="text-right">Pro Monat gerechnet</span>
          </div>
          {markt.map((m) => (
            <div
              key={m.wer}
              className="grid gap-1 border-t border-gray-100 px-5 py-4 first:border-t-0 sm:grid-cols-[1.2fr_2fr_1fr] sm:gap-4 sm:first:border-t"
            >
              <span className="font-semibold text-gray-900">{m.wer}</span>
              <span className="text-sm text-gray-600">{m.wie}</span>
              <span className="text-sm font-semibold tabular-nums text-gray-900 sm:text-right">{m.monat}</span>
            </div>
          ))}
          <div className="grid gap-1 border-t border-gray-200 bg-blue-50/60 px-5 py-4 sm:grid-cols-[1.2fr_2fr_1fr] sm:gap-4">
            <span className="font-semibold text-brand-blue">Kolac Digital</span>
            <span className="text-sm text-gray-700">ohne Einrichtung, Pflege inklusive, SEO je nach Paket</span>
            <span className="text-sm font-semibold tabular-nums text-brand-blue sm:text-right">129 bis 399 €</span>
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
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Welches Paket passt zu Ihnen?
        </h2>
        <p className="mt-4 text-base leading-relaxed text-gray-700">
          Wir schauen gemeinsam, wonach Ihre Kunden bei Google suchen und wer dort heute vorne steht. Danach ist
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

export default function PaketePage() {
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
