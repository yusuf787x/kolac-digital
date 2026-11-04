import Image from 'next/image';
import Link from 'next/link';
import type { PortfolioProject } from '@/lib/portfolio';
import { reviewHighlights, site } from '@/lib/site-config';
import ContactForm from './ContactForm';
import Reveal from '@/components/marketing/Reveal';

/**
 * Abschnitte, die /webseiten, die Branchenseiten unter
 * /webseiten/[branche] und die Stadtseiten unter /webdesign/[stadt]
 * gemeinsam nutzen.
 */

export function Stars({ count = 5 }: { count?: number }) {
  return (
    <span className="inline-flex text-yellow-500">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} aria-hidden>
          ★
        </span>
      ))}
      <span className="sr-only">{count} von 5 Sternen</span>
    </span>
  );
}

export function Leistungen() {
  const items = [
    {
      title: 'Komplett individuell gebaut',
      text: 'Keine Vorlage, kein Baukasten. Wir bauen genau das was du brauchst.',
    },
    {
      title: 'Hosting und Wartung dabei',
      text: 'Du musst dich um nichts kümmern. Wir halten die Seite am Laufen.',
    },
    {
      title: 'Sieht auf Handy top aus',
      text: 'Über die Hälfte deiner Kunden öffnen die Seite am Handy. Das denken wir von Anfang an mit.',
    },
    {
      title: 'Anbindung an deine Tools',
      text: 'Buchhaltung, Kalender, Shop, Lager. Wir verbinden was du schon nutzt.',
    },
    {
      title: 'Daten aus alten Systemen',
      text: 'Wir übernehmen deine Kunden und Inhalte aus dem alten System. Du startest nicht bei Null.',
    },
    {
      title: 'Findbar bei Google',
      text: 'Wir bauen die Seite so, dass Google sie versteht und für deine Suchbegriffe vorne zeigt.',
    },
    {
      title: 'Findbar bei KI Suchen',
      text: 'Auch ChatGPT, Claude und Google AI sollen dich kennen. Wir bereiten die Seite darauf vor.',
    },
    {
      title: 'Persönlicher Ansprechpartner',
      text: 'Du rufst an und sprichst direkt mit Yusuf. Kein Callcenter, kein Verkäufer.',
    },
  ];

  return (
    <section id="leistungen" className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Was du bekommst
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Alles drin. Kein Schnickschnack.
          </h2>
          <p className="mt-3 text-base text-gray-600">
            Wir bauen Webseiten die wirklich was können. Nicht nur ein
            digitaler Flyer.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-xl border border-gray-100 bg-white p-5"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                  ✓
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {it.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{it.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-gray-900">
            Webdesign und Technik, kurz erklärt
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Wir gestalten das Webdesign und programmieren deine Website selbst.
            Kein gekauftes WordPress-Theme und kein Baukasten wie Wix oder
            Jimdo. Das Design ist responsive, passt sich also jedem Bildschirm
            an, vom Handy bis zum großen Monitor. Wenn du Texte und Bilder
            selbst pflegen willst, bekommst du ein einfaches CMS dazu. Sonst
            ändern wir sie für dich.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Process() {
  const steps = [
    {
      n: '01',
      title: 'Wir reden kurz',
      text: 'Du erzählst mir was du brauchst. Ich sage dir was geht. Das Gespräch ist kostenlos und du musst nichts kaufen.',
    },
    {
      n: '02',
      title: 'Ich baue dir einen Entwurf',
      text: 'Nach ein paar Tagen siehst du wie deine neue Webseite aussehen wird. Du sagst mir was bleiben soll und was anders muss.',
    },
    {
      n: '03',
      title: 'Wir gehen live',
      text: 'Sobald alles passt, geht deine Seite online. In der Regel eine Woche nach dem ersten Kontaktpunkt. Je nach Auslastung kann es auch mal zwei Wochen dauern, das klären wir vorher offen. Danach laufen Hosting, Wartung und kleine Änderungen weiter über mich.',
    },
  ];
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            So bauen wir das
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Drei Schritte. Kein Stress.
          </h2>
        </header>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.n}
              className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-xs"
            >
              <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold tracking-wider text-white">
                Schritt {s.n}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {s.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Reviews() {
  return (
    <section className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              Bewertungen
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Was unsere Kunden sagen.
            </h2>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <Stars />
              <strong className="text-gray-900">
                {site.rating.value.toFixed(1)} von 5
              </strong>{' '}
              · {site.rating.count} Bewertungen auf Google
            </div>
          </div>
          <a
            href={site.googleReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Alle Bewertungen ansehen
          </a>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {reviewHighlights.map((r) => (
            <figure
              key={r.author}
              className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-blue/10 text-base font-semibold text-brand-blue">
                  {r.author.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {r.author}
                  </p>
                  <p className="text-xs text-gray-500">{r.date}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Google
                </span>
              </div>
              <div className="mt-3">
                <Stars count={r.rating} />
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-gray-700">
                „{r.text}“
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function About({ thema = 'Webseite' }: { thema?: string }) {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
        <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
          <div className="mx-auto md:mx-0">
            <div className="relative h-56 w-56 overflow-hidden rounded-full bg-linear-to-br from-blue-100 to-white p-1.5 shadow-lg ring-4 ring-brand-blue/30 sm:h-72 sm:w-72">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-white">
                <Image
                  src="/images/yk-portrait.webp"
                  alt="Yusuf Kolac, Geschäftsführer von Kolac Digital aus Bielefeld"
                  fill
                  sizes="(min-width: 640px) 288px, 224px"
                  className="object-cover object-center"
                />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              Wer baut deine {thema}?
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Moin, ich bin Yusuf.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-700">
              Ich komme aus Bielefeld und baue seit Jahren Webseiten und
              Software für kleine und mittelgroße Firmen. Mein Schwerpunkt liegt in OWL
              und Nordrhein-Westfalen. Ich arbeite aber genauso für Kunden in
              ganz Deutschland.
            </p>
            <p className="mt-3 text-base leading-relaxed text-gray-700">
              Bei mir bekommst du keinen Vertrieb, keinen Account Manager
              und keinen Zwischenhändler. Du sprichst direkt mit der Person, die deine {thema} kennt und gebaut hat. Das spart Zeit, Nerven
              und am Ende auch Geld.
            </p>
            <p className="mt-3 text-base leading-relaxed text-gray-700">
              Mein Anspruch ist einfach. Du sollst nach dem Live-Gang mehr
              Anfragen haben, weniger im Alltag erklären müssen und mit
              ruhigem Gefühl auf deine eigene {thema} schauen können.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <a
                href={`tel:${site.phoneE164}`}
                className="font-medium text-brand-blue hover:underline"
              >
                ☎ {site.phone}
              </a>
              <span>·</span>
              <a
                href={`mailto:${site.email}`}
                className="font-medium text-brand-blue hover:underline break-all"
              >
                ✉ {site.email}
              </a>
            </div>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Kontakt({ source }: { source?: string }) {
  return (
    <section
      id="kontakt"
      className="relative overflow-hidden bg-linear-to-br from-brand-blue to-blue-700 py-16 text-white sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-blue-200">
              Lass uns reden
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Sag mir kurz was du brauchst.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-blue-100">
              Trag deinen Namen und deine Nummer ein. Ich rufe dich
              innerhalb von 24 Stunden zurück. Wir reden in Ruhe über dein
              Projekt. Du musst nichts entscheiden und nichts kaufen.
            </p>

            <a
              href={site.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/25 backdrop-blur-xs hover:bg-white/25 transition-colors"
            >
              <span aria-hidden>📅</span>
              Termin direkt online buchen
              <span aria-hidden>↗</span>
            </a>

            <div className="mt-8 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                  📞
                </span>
                <a
                  href={`tel:${site.phoneE164}`}
                  className="font-medium hover:underline"
                >
                  {site.phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                  ✉️
                </span>
                <a
                  href={`mailto:${site.email}`}
                  className="font-medium hover:underline break-all"
                >
                  {site.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                  ⏱️
                </span>
                <span>
                  Aktuell {site.freeSlots} freie Plätze · Antwort innerhalb
                  von 24 Stunden
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 text-gray-900 shadow-2xl sm:p-8">
            <ContactForm source={source} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function FaqListe({
  title,
  faqs,
  children,
}: {
  title: string;
  faqs: { question: string; answer: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section id="faq" className="bg-gray-50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header>
          <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
            Häufige Fragen
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h2>
        </header>

        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details
              key={f.question}
              className="group rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-xs open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-gray-900">
                {f.question}
                <span
                  aria-hidden
                  className="text-gray-400 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {f.answer}
              </p>
            </details>
          ))}
        </div>

        {children}
      </div>
    </section>
  );
}

export function ProjektKarten({ projects }: { projects: PortfolioProject[] }) {
  const spalten =
    projects.length === 1
      ? 'max-w-md'
      : projects.length === 2
        ? 'max-w-4xl md:grid-cols-2'
        : 'md:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={`grid gap-6 ${spalten}`}>
      {projects.map((p) => (
        <Link
          key={p.slug}
          href={p.caseStudyUrl ?? `/portfolio/${p.slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs transition-shadow hover:shadow-md"
        >
          <div className="relative aspect-16/10 w-full bg-gray-100">
            <Image
              src={p.overviewImage}
              alt={p.imageAlt}
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw"
              className="object-cover object-top"
            />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
              {p.tag}
            </span>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">
              {p.company}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {p.category}
              {p.location ? ` · ${p.location}` : ''}
            </p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-700">
              {p.keyWin}
            </p>
            <span className="mt-4 text-sm font-semibold text-brand-blue">
              {p.caseStudyUrl ? 'Case Study lesen' : 'Projekt ansehen'}{' '}
              <span aria-hidden className="inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
