import type { Metadata } from 'next';
import SeoCheckClient from './SeoCheckClient';

type PageProps = { searchParams: Promise<{ id?: string | string[] }> };

const BASE_METADATA: Metadata = {
  title: 'Kostenloser SEO-Check: Wird deine Website bei Google gefunden? | Kolac Digital',
  description:
    'Kostenloser SEO-Check für lokale Unternehmen: Technik, Inhalte, Platzierungen bei Google und lokale Auffindbarkeit in rund 30 Sekunden. Mit deinen 5 wichtigsten Maßnahmen.',
  alternates: { canonical: '/seo-check' },
  openGraph: {
    title: 'Kostenloser SEO-Check | Kolac Digital',
    description: 'Finde in 30 Sekunden heraus, warum deine Website bei Google nicht angezeigt wird.',
    url: '/seo-check',
    type: 'website',
  },
};

// Einzelne Berichte (?id=...) gehoeren einem Besucher und sollen nicht in Google landen.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { id } = await searchParams;
  return id ? { ...BASE_METADATA, robots: { index: false, follow: true } } : BASE_METADATA;
}

const CHECKED = [
  {
    title: 'Sichtbarkeit bei Google',
    text: 'Für wie viele Suchbegriffe deine Website angezeigt wird, wie viele davon auf Seite 1 stehen und welche kurz davor sind.',
  },
  {
    title: 'Technik',
    text: 'Ladezeit auf dem Handy, sichere Verbindung, Sitemap, defekte Links und ob Google deine Seiten überhaupt aufnehmen darf.',
  },
  {
    title: 'Inhalte',
    text: 'Seitentitel, Beschreibungen in Google, Überschriften, Textmenge und ob jede Leistung eine eigene Seite hat.',
  },
  {
    title: 'Lokale Auffindbarkeit',
    text: 'Adresse, Telefonnummer, Ort im Titel, Firmendaten für Google und alles, was dich in deiner Region sichtbar macht.',
  },
];

const FAQ = [
  {
    q: 'Ist der SEO-Check wirklich kostenlos?',
    a: 'Ja. Du bekommst dein Ergebnis sofort. Für die ausführlichen Maßnahmen geben wir dir den Bericht gegen Name und E-Mail frei. Jede Person kann einen Check machen.',
  },
  {
    q: 'Wie genau sind die Platzierungen?',
    a: 'Die Platzierungen stammen aus einer großen Datenbank mit Google-Suchergebnissen für Deutschland und werden wöchentlich aktualisiert. Lokal kann Google je nach Standort des Suchenden etwas anders sortieren.',
  },
  {
    q: 'Was passiert mit meinen Daten?',
    a: 'Wir speichern das Ergebnis, damit du es über deinen Link wieder aufrufen kannst. Name und E-Mail nutzen wir nur, um dir den Bericht zu schicken und dich zu deinem Ergebnis zu kontaktieren. Mehr dazu in der Datenschutzerklärung.',
  },
  {
    q: 'Und wenn ich die Maßnahmen nicht selbst umsetzen will?',
    a: 'Dann übernehmen wir das. Mit unserem Paket „Sichtbar in 90 Tagen“ richten wir dein Google-Profil ein, optimieren deine Website und du siehst jeden Monat die Zahlen in deinem eigenen Kundenportal.',
  },
];

export default async function SeoCheckPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  const initialId = typeof id === 'string' && /^[A-Za-z0-9_-]{10,40}$/.test(id) ? id : undefined;
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <>
      <SeoCheckClient key={initialId ?? 'neu'} initialId={initialId} />

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6">
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight text-[var(--color-black)]">Was der Check prüft</h2>
          <p className="mt-3 max-w-[640px] text-[17px] text-[var(--color-gray)]">
            Eine Website kann technisch perfekt sein und trotzdem bei Google nicht auftauchen. Deshalb prüfen wir beides:
            wie gut die Seite gebaut ist und ob sie tatsächlich angezeigt wird.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {CHECKED.map((c) => (
              <div key={c.title} className="rounded-[18px] bg-[var(--color-offwhite)] p-6">
                <h3 className="text-[17px] font-semibold text-[var(--color-black)]">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-gray)]">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--color-offwhite)] py-16 md:py-24">
        <div className="mx-auto max-w-[800px] px-4 md:px-6">
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight text-[var(--color-black)]">Häufige Fragen</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-[18px] bg-white p-5 shadow-[var(--shadow-sm)]">
                <summary className="cursor-pointer list-none text-[17px] font-semibold text-[var(--color-black)] flex justify-between gap-4">
                  {f.q}
                  <span aria-hidden className="text-[var(--color-blue)] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-gray)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
