import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';

const URL = `${site.baseUrl}/ki-beratung`;

export const metadata: Metadata = {
  title: 'KI-Beratung & Automatisierung für KMU | Kolac Digital',
  description:
    'KI-Beratung aus Bielefeld für KMU in NRW: Anwendungsfälle finden, KI-Konzept erstellen, Testversion bauen und Abläufe im Betrieb automatisieren.',
  alternates: { canonical: URL },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: URL,
    title: 'KI-Beratung und Automatisierung für kleine Betriebe',
    description:
      'Wo KI in deinem Betrieb wirklich Zeit spart, wie du sie verantwortungsvoll einsetzt und wie aus der Idee eine getestete Lösung wird. Von Kolac Digital aus Bielefeld.',
    siteName: 'Kolac Digital',
  },
};

/* ------------------------------------------------------------------
   Inhalte
   ------------------------------------------------------------------ */

const LEISTUNGEN = [
  {
    nr: '01',
    titel: 'KI-Konzept und Beratung',
    text: 'Bevor irgendetwas gebaut wird, klären wir, wo KI bei dir überhaupt etwas bringt. Am Ende steht ein Konzept mit klaren Empfehlungen, das du auch ohne mich umsetzen könntest.',
    punkte: [
      'Anwendungsfelder in deinem Betrieb finden und Ziele festlegen',
      'Konkrete Anwendungsfälle beschreiben und nach Nutzen und Aufwand ordnen',
      'Technische und organisatorische Voraussetzungen prüfen',
      'Abläufe und Zuständigkeiten für den Einsatz von KI festlegen',
      'Regeln für einen verantwortungsvollen Einsatz, inklusive Datenschutz und europäischer KI-Verordnung',
    ],
  },
  {
    nr: '02',
    titel: 'Testversion und Erprobung',
    text: 'Ein Konzept auf Papier beweist noch nichts. Deshalb baue ich für den wichtigsten Anwendungsfall eine Testversion und wir prüfen sie mit echten Daten aus deinem Alltag.',
    punkte: [
      'Testversion für einen klar umrissenen Anwendungsfall',
      'Test mit echten Belegen, Anfragen oder Dokumenten aus deinem Betrieb',
      'Messung: spart es wirklich Zeit, und wie oft liegt die KI daneben',
      'Ehrliche Auswertung, ob sich der Ausbau lohnt',
    ],
  },
  {
    nr: '03',
    titel: 'Automatisierung im Alltag',
    text: 'Nicht alles braucht KI. Viele Zeitfresser lassen sich mit sauberen, festen Abläufen lösen. Ich baue beides und sage dir offen, was wofür passt.',
    punkte: [
      'Anfragen, Angebote und Rechnungen ohne Abtippen',
      'Belege automatisch erfassen und vorsortieren',
      'Verbindungen zwischen deinen vorhandenen Programmen',
      'Auswertungen, die sich selbst aktualisieren',
    ],
  },
];

const ABLAUF = [
  {
    titel: 'Ausgangslage erfassen',
    text: 'Wie arbeitet dein Betrieb heute, wo geht Zeit verloren, wo liegt Potenzial für KI.',
  },
  {
    titel: 'Ziele und Nutzen klären',
    text: 'Was soll KI bei dir erreichen, und welcher Nutzen ist realistisch zu erwarten.',
  },
  {
    titel: 'Abläufe gliedern',
    text: 'Aufgaben in klare Prozesse zerlegen, damit sichtbar wird, wo KI sinnvoll ansetzt.',
  },
  {
    titel: 'Voraussetzungen prüfen',
    text: 'Welche technischen und organisatorischen Bedingungen müssen erfüllt sein.',
  },
  {
    titel: 'Anwendungsfälle ausarbeiten',
    text: 'Konkrete Einsätze beschreiben, auch neue, an die vorher niemand gedacht hat.',
  },
  {
    titel: 'Qualität absichern',
    text: 'Regeln für Prüfung, Verantwortung und Transparenz, abgestimmt auf die europäische KI-Verordnung.',
  },
  {
    titel: 'Empfehlungen zusammenfassen',
    text: 'Alle Ergebnisse in einem Konzept, das du als Fahrplan nutzen kannst.',
  },
  {
    titel: 'Testen, wenn gewünscht',
    text: 'Den wichtigsten Anwendungsfall als Testversion bauen und mit echten Daten prüfen.',
  },
];

const PRAXIS = [
  {
    titel: 'Belege lesen sich selbst',
    text: 'Eine Rechnung oder ein Foto einer Quittung wird hochgeladen, die KI liest Datum, Betrag, Absender und Umsatzsteuer aus und legt einen Entwurf an. Was sie nicht sicher erkennt, markiert sie. Gebucht wird erst, wenn ein Mensch geprüft hat.',
    tag: 'Bilderkennung',
  },
  {
    titel: 'Visitenkarte rein, Kontakt fertig',
    text: 'Visitenkarte fotografieren, Name, Firma, Anschrift und Telefon landen im Kundensystem. Ein Scan überschreibt nie etwas, das schon von Hand eingetragen war.',
    tag: 'Bilderkennung',
  },
  {
    titel: 'Texte mit fester Faktenbasis',
    text: 'Ein Redaktionsablauf, in dem KI Fachartikel entwirft. Die Fakten über den Betrieb sind fest vorgegeben, damit nichts erfunden wird. Veröffentlicht wird nur nach Freigabe.',
    tag: 'Sprachmodell',
  },
  {
    titel: 'Buchhaltung ohne Abtippen',
    text: 'Rechnungen, Zahlungseingänge und Umsatzsteuer greifen ineinander. Was einmal erfasst ist, muss nirgends ein zweites Mal eingetragen werden.',
    tag: 'Automatisierung',
  },
];

const GRUNDSAETZE = [
  {
    titel: 'KI schlägt vor, der Mensch entscheidet',
    text: 'Bei allem, was Geld, Kunden oder Verträge betrifft, gibt es eine Prüfung durch einen Menschen. Die KI nimmt Arbeit ab, aber keine Verantwortung.',
  },
  {
    titel: 'Unsicherheit wird sichtbar',
    text: 'Eine gute Lösung zeigt an, wo sie sich nicht sicher ist. Stille Fehler sind gefährlicher als offene Lücken.',
  },
  {
    titel: 'So wenig Daten wie nötig',
    text: 'Es geht nur das an einen KI-Dienst, was für die Aufgabe gebraucht wird. Wo es sinnvoll ist, läuft das System auf deinem eigenen Server.',
  },
  {
    titel: 'Es gibt immer einen Plan B',
    text: 'Fällt ein Dienst aus, arbeitet das System mit einer einfacheren Methode weiter und sagt dir das auch.',
  },
  {
    titel: 'Die KI-Verordnung im Blick',
    text: 'Jeder Anwendungsfall wird nach der europäischen KI-Verordnung eingeordnet: Gilt eine Transparenzpflicht, welche Aufsicht braucht es, und was müssen die Mitarbeitenden über KI wissen.',
  },
  {
    titel: 'Datenschutz von Anfang an',
    text: 'Welche Daten fließen wohin, wer ist Auftragsverarbeiter, was muss dokumentiert werden. Das klären wir vor dem Bau, nicht danach.',
  },
];

const FAQ = [
  {
    frage: 'Lohnt sich KI für einen kleinen Betrieb überhaupt?',
    antwort:
      'Oft ja, aber nicht überall. Am meisten bringt KI bei Aufgaben, die sich ständig wiederholen und viel Lesen oder Abtippen erfordern, etwa Belege, Anfragen oder Dokumente. Genau das klären wir im ersten Schritt, bevor du Geld in die Umsetzung steckst.',
  },
  {
    frage: 'Was kostet eine KI-Beratung?',
    antwort:
      'Das hängt vom Umfang ab, deshalb gibt es keinen Pauschalpreis. Abgerechnet wird nach Beratungstagen, die du flexibel abrufen kannst, auch als halbe Tage und verteilt über mehrere Wochen. Du bekommst vorher ein festes Angebot, in dem jeder Schritt mit seinem Umfang steht.',
  },
  {
    frage: 'Gibt es eine Förderung für KI-Beratung?',
    antwort:
      'Für kleine und mittlere Betriebe in Nordrhein-Westfalen gibt es Programme, die Beratung und den Test von KI-Systemen bezuschussen. Wichtig ist, dass der Antrag vor Projektbeginn gestellt wird. Ob ein Programm gerade Anträge annimmt, prüfen wir im Erstgespräch gemeinsam.',
  },
  {
    frage: 'Gehen meine Kundendaten an ChatGPT oder andere Anbieter?',
    antwort:
      'Nur, wenn es für die Aufgabe nötig ist, und nur so viel wie nötig. Welche Daten an welchen Dienst gehen, legen wir vorher fest und dokumentieren es. Wo der Datenschutz es verlangt, läuft das System auf deinem eigenen Server.',
  },
  {
    frage: 'Was bedeutet die europäische KI-Verordnung für meinen Betrieb?',
    antwort:
      'Für die meisten Anwendungen im kleinen Betrieb, etwa Belege auslesen oder Texte entwerfen, sind die Pflichten überschaubar. Seit Februar 2025 müssen Unternehmen aber dafür sorgen, dass ihre Mitarbeitenden ausreichend über die eingesetzte KI wissen. Ich ordne jeden Anwendungsfall ein und sage dir, was zu tun ist. Eine anwaltliche Rechtsberatung ersetzt das nicht.',
  },
  {
    frage: 'Wie lange dauert so ein Projekt?',
    antwort:
      'Ein KI-Konzept dauert je nach Größe des Betriebs einige Wochen. Mit Testversion sind es in der Regel zwei bis sechs Monate. Die Beratungstage lassen sich flexibel verteilen, damit es neben dem Tagesgeschäft machbar bleibt.',
  },
];

/* ------------------------------------------------------------------
   Seite
   ------------------------------------------------------------------ */

export default function KiBeratungPage() {
  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'KI-Beratung und Automatisierung',
    serviceType: 'KI-Beratung',
    url: URL,
    description:
      'Beratung zum Einsatz künstlicher Intelligenz in kleinen und mittleren Unternehmen: Identifikation von Anwendungsfeldern, Erarbeitung eines KI-Konzepts, Test von KI-Systemen und Automatisierung von Geschäftsabläufen.',
    provider: {
      '@type': 'ProfessionalService',
      name: site.name,
      url: site.baseUrl,
      email: site.email,
      telephone: site.phone,
      founder: { '@type': 'Person', name: site.founder },
      address: {
        '@type': 'PostalAddress',
        streetAddress: site.street,
        postalCode: site.zip,
        addressLocality: site.city,
        addressRegion: site.region,
        addressCountry: 'DE',
      },
    },
    areaServed: [
      { '@type': 'State', name: 'Nordrhein-Westfalen' },
      { '@type': 'Country', name: 'Deutschland' },
    ],
    audience: {
      '@type': 'BusinessAudience',
      audienceType: 'Kleine und mittlere Unternehmen',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Leistungen KI-Beratung',
      itemListElement: LEISTUNGEN.map((l) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: l.titel,
          description: l.text,
        },
      })),
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.frage,
      acceptedAnswer: { '@type': 'Answer', text: f.antwort },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Startseite',
        item: `${site.baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'KI-Beratung',
        item: URL,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section className="ki-hero">
        <div className="container">
          <Reveal>
            <div className="ki-hero-inner">
              <div className="section-label">KI UND AUTOMATISIERUNG</div>
              <h1 className="ki-hero-headline">
                KI-Beratung für kleine Betriebe, die Zeit sparen wollen
              </h1>
              <p className="ki-hero-subline">
                Ich finde mit dir heraus, wo künstliche Intelligenz in deinem
                Betrieb wirklich Arbeit abnimmt, erstelle daraus ein klares
                Konzept und baue auf Wunsch eine Testversion, die wir mit
                echten Daten prüfen. Ohne Hype, ohne Fachchinesisch.
              </p>
              <div className="ki-hero-actions">
                <Link href="/webseiten" className="btn btn-primary">
                  Webseiten mit System ansehen
                </Link>
                <a
                  href={site.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  Erstgespräch buchen
                </a>
              </div>
              <ul className="ki-hero-facts">
                <li>KI-Konzept mit Handlungsempfehlungen</li>
                <li>Testversion mit echten Daten</li>
                <li>Datenschutz und KI-Verordnung von Anfang an</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Kurzantwort fuer Suchmaschinen und KI-Systeme */}
      <section className="ki-section ki-section-white">
        <div className="container">
          <Reveal>
            <div className="ki-tldr">
              <div className="ki-tldr-label">Kurz gesagt</div>
              <p>
                Kolac Digital aus Bielefeld berät kleine und mittlere
                Unternehmen in Nordrhein-Westfalen beim Einsatz von
                künstlicher Intelligenz. Die Beratung umfasst die Suche nach
                passenden Anwendungsfeldern, ein KI-Konzept mit priorisierten
                Anwendungsfällen, Regeln für einen verantwortungsvollen
                Einsatz nach europäischer KI-Verordnung sowie auf Wunsch den
                Bau und Test einer Testversion. Dazu kommen Automatisierungen
                für wiederkehrende Abläufe wie Belege, Anfragen und
                Rechnungen.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Leistungen */}
      <section className="ki-section ki-section-white">
        <div className="container">
          <Reveal>
            <div className="ki-section-head">
              <div className="section-label">LEISTUNGEN</div>
              <h2 className="ki-section-headline">
                Vom ersten Gedanken bis zur getesteten Lösung
              </h2>
              <p className="ki-section-sub">
                Du kannst bei jedem Schritt einsteigen und aufhören. Viele
                Betriebe starten mit dem Konzept und entscheiden danach, was
                gebaut wird.
              </p>
            </div>
          </Reveal>
          <div className="ki-cards">
            {LEISTUNGEN.map((l, i) => (
              <Reveal key={l.nr} delay={i * 80}>
                <article className="ki-card">
                  <span className="ki-card-nr">{l.nr}</span>
                  <h3 className="ki-card-title">{l.titel}</h3>
                  <p className="ki-card-text">{l.text}</p>
                  <ul className="ki-card-list">
                    {l.punkte.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Ablauf */}
      <section className="ki-section ki-section-grey">
        <div className="container">
          <Reveal>
            <div className="ki-section-head">
              <div className="section-label">ABLAUF</div>
              <h2 className="ki-section-headline">
                So entsteht dein KI-Konzept
              </h2>
              <p className="ki-section-sub">
                Acht Schritte, die aufeinander aufbauen. Die Beratungstage
                lassen sich flexibel verteilen, als halbe oder ganze Tage,
                über Wochen oder Monate.
              </p>
            </div>
          </Reveal>
          <ol className="ki-steps">
            {ABLAUF.map((s, i) => (
              <Reveal key={s.titel} delay={(i % 4) * 60}>
                <li className="ki-step">
                  <span className="ki-step-nr">{i + 1}</span>
                  <div>
                    <h3 className="ki-step-title">{s.titel}</h3>
                    <p className="ki-step-text">{s.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Praxis */}
      <section className="ki-section ki-section-white">
        <div className="container">
          <Reveal>
            <div className="ki-section-head">
              <div className="section-label">AUS DER PRAXIS</div>
              <h2 className="ki-section-headline">
                Was schon im Einsatz ist
              </h2>
              <p className="ki-section-sub">
                Keine Folien, sondern Lösungen, die in Kundensystemen und im
                eigenen Betrieb täglich laufen.
              </p>
            </div>
          </Reveal>
          <div className="ki-praxis">
            {PRAXIS.map((p, i) => (
              <Reveal key={p.titel} delay={i * 80}>
                <article className="ki-praxis-card">
                  <span className="ki-praxis-tag">{p.tag}</span>
                  <h3 className="ki-praxis-title">{p.titel}</h3>
                  <p className="ki-praxis-text">{p.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Grundsaetze */}
      <section className="ki-section ki-section-grey">
        <div className="container">
          <Reveal>
            <div className="ki-section-head">
              <div className="section-label">VERANTWORTUNG</div>
              <h2 className="ki-section-headline">
                KI, der du vertrauen kannst
              </h2>
              <p className="ki-section-sub">
                Eine KI, die still Fehler macht, kostet mehr Zeit als sie
                spart. Deshalb gelten in jedem Projekt dieselben Regeln.
              </p>
            </div>
          </Reveal>
          <div className="ki-principles">
            {GRUNDSAETZE.map((g, i) => (
              <Reveal key={g.titel} delay={(i % 3) * 70}>
                <div className="ki-principle">
                  <h3 className="ki-principle-title">{g.titel}</h3>
                  <p className="ki-principle-text">{g.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Foerderung */}
      <section className="ki-section ki-section-white">
        <div className="container">
          <Reveal>
            <div className="ki-funding">
              <div className="section-label">FÖRDERUNG</div>
              <h2 className="ki-section-headline">
                KI-Beratung kann gefördert werden
              </h2>
              <p className="ki-funding-text">
                Für kleine und mittlere Unternehmen mit Sitz in
                Nordrhein-Westfalen bezuschusst die NRW.BANK mit dem Programm
                NRW.BANK.Impuls KI die Vorbereitung des KI-Einsatzes. Gefördert
                werden konzeptionelle Beratung und der Test von KI-Systemen
                für einen konkreten Anwendungsfall.
              </p>
              <dl className="ki-funding-facts">
                <div>
                  <dt>Zuschuss</dt>
                  <dd>50 % der förderfähigen Ausgaben</dd>
                </div>
                <div>
                  <dt>Höchstbetrag</dt>
                  <dd>25.000 € innerhalb von zwei Jahren</dd>
                </div>
                <div>
                  <dt>Untergrenze</dt>
                  <dd>5.000 € förderfähige Ausgaben</dd>
                </div>
                <div>
                  <dt>Laufzeit</dt>
                  <dd>höchstens sechs Monate</dd>
                </div>
              </dl>
              <p className="ki-funding-note">
                <strong>Wichtig:</strong> Der Antrag muss gestellt sein, bevor
                das Projekt beginnt. Ob ein Programm gerade Anträge annimmt,
                ändert sich. Zuletzt war das Antragsportal wegen hoher
                Nachfrage vorübergehend geschlossen. Den aktuellen Stand prüfen
                wir im Erstgespräch. Stand der Angaben: Oktober 2026.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="ki-section ki-section-grey">
        <div className="container">
          <Reveal>
            <div className="ki-section-head">
              <div className="section-label">HÄUFIGE FRAGEN</div>
              <h2 className="ki-section-headline">
                Was Betriebe vorher wissen wollen
              </h2>
            </div>
          </Reveal>
          <div className="faq-list">
            {FAQ.map((f) => (
              <details key={f.frage} className="faq-item">
                <summary>{f.frage}</summary>
                <div className="faq-answer">
                  <p>{f.antwort}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="portfolio-cta">
        <div className="container">
          <Reveal>
            <div className="portfolio-cta-inner">
              <h2 className="portfolio-cta-headline">
                KI ist am stärksten, wenn das System dahinter stimmt
              </h2>
              <p className="portfolio-cta-sub">
                Die beste KI nützt wenig, wenn Anfragen, Termine und Rechnungen
                noch in fünf Programmen verteilt liegen. Schau dir an, wie eine
                Webseite mit System aussieht, auf der KI später aufsetzen kann.
              </p>
              <div className="portfolio-cta-actions">
                <Link href="/webseiten" className="btn btn-primary">
                  Webseiten mit System ansehen
                </Link>
                <a href={`tel:${site.phone.replace(/\s/g, '')}`} className="btn btn-outline">
                  {site.phone}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
