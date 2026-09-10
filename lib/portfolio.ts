/**
 * Portfolio-Uebersicht: Kurzform aller Kundenprojekte. Uebersicht
 * unter /portfolio, jedes Projekt einzeln unter /portfolio/{slug}.
 * Bewusst schlanker als eine Case Study — schoen zu lesen, gibt einen
 * Eindruck, was gebaut wurde, ohne komplette Analyse.
 *
 * Nicht im Header verlinkt. Wird ueber Footer und interne Verlinkung
 * gefunden. Fuer SEO/GEO: eigene Meta-Angaben pro Projekt, sitemap.xml
 * enthaelt alle Slugs, jede Detail-Seite hat FAQPage-fertige
 * Antwort-Bloecke.
 */

export interface PortfolioProject {
  slug: string;
  /** Kurzname (Overview-Card + Header). */
  company: string;
  /** Branchen-Bezeichnung. Zeigt an, WAS der Betrieb macht. */
  category: string;
  /** Regionaler Marker fuer Local-SEO. */
  location?: string;
  /** Kompaktes Kategorie-Label auf der Karte. */
  tag: string;
  /** Preview-Bild fuer Card + Detail-Hero. Pfad ab /public. */
  overviewImage: string;
  imageAlt: string;
  /** Kurz-Aufzaehlung der Leistungen (max 4 Zeilen). */
  services: string[];
  /** Der eine ergebnis-satz fuer die Karte. */
  keyWin: string;
  /** Optional: Live-Link, extern. */
  link?: string;
  linkText?: string;
  /** Optional: Social-Kanal-Link, extern. */
  socialLink?: string;
  socialLinkText?: string;
  /** Optional: Verweis auf eine tiefere Case Study, wenn vorhanden. */
  caseStudyUrl?: string;

  // --- Fuer die Detail-Seite ---
  /** Ein-Absatz Intro auf der Detail-Seite (unter dem Header). */
  intro: string;
  /** Ausgangslage: was war vor unserer Zusammenarbeit. */
  situation: string;
  /** Vorgehen: was wir konkret gebaut/gemacht haben. */
  approach: string[];
  /** Outcome-Absatz: was hat sich fuer den Kunden veraendert. */
  outcome: string;

  /** SEO-Meta pro Detail-Seite. */
  metaTitle: string;
  metaDescription: string;
}

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: 'fahrschule-kreuzer',
    company: 'Fahrschule Kreuzer',
    category: 'Fahrschule',
    location: 'Bielefeld-Brackwede',
    tag: 'Neue Webpräsenz von null',
    overviewImage: '/images/portfolio/fahrschule-kreuzer.jpg',
    imageAlt:
      'Neue Webseite der Fahrschule Kreuzer aus Bielefeld-Brackwede',
    services: [
      'Komplette Webseite von Grund auf',
      'Struktur für Führerscheinklassen B, BE und B96',
      'Anmelde- und Kontakt-Strecke',
      'SEO für Bielefeld-Brackwede und OWL',
    ],
    keyWin:
      'Von null auf eigene Webseite. Anfragen laufen jetzt direkt online rein statt nur per Anruf.',
    link: 'https://www.fahrschulekreuzer.de',
    linkText: 'Website ansehen',
    intro:
      'Für die Fahrschule Kreuzer in Bielefeld-Brackwede haben wir die komplette Webpräsenz von Grund auf gebaut. Vorher: keine Webseite. Nachher: ein professioneller Auftritt mit klarer Struktur für die Führerscheinklassen B, BE und B96 und einer Anmeldestrecke, die Anfragen direkt einsammelt.',
    situation:
      'Die Fahrschule Kreuzer ist eine inhabergeführte Fahrschule in Bielefeld-Brackwede mit klarem Anspruch: Ausbildung in Ruhe, mit Zeit zum Üben und Fahrlehrern, die die Fahrschüler kennen. Digital war das noch nicht sichtbar. Es gab keine eigene Webseite. Interessenten konnten nur telefonisch anfragen, wurden von Google-Suchen zu Fahrschulen in Brackwede nicht gefunden und hatten keine Möglichkeit, sich vorab über die angebotenen Klassen, den Ablauf oder den Standort zu informieren.',
    approach: [
      'Struktur der Webseite entlang der echten Fragen von Fahrschülern: Was wird angeboten, wie läuft das ab, wo finde ich euch, was kostet es?',
      'Klare Sektionen für die drei Führerscheinklassen B, BE und B96 inklusive BF17 (Begleitetes Fahren ab 17) und Beobachtungsfahrten für Wiedereinsteiger.',
      'Anmelde-Strecke mit Kontaktformular und direktem Anruf-Button für mobile Nutzer.',
      'Lokales SEO auf Bielefeld-Brackwede und Umland (OWL), damit die Fahrschule bei Google-Suchen zur Region gefunden wird.',
      'Struktur für den späteren Ausbau: Über-uns-Sektion, FAQ und der Hinweis auf die Fahrschulen-App, die Fahrschüler ihren Fortschritt aufs Handy holt.',
    ],
    outcome:
      'Die Fahrschule Kreuzer ist jetzt bei Google für Suchen nach Fahrschule in Bielefeld-Brackwede sichtbar. Interessenten können sich direkt online informieren und anmelden statt nur anzurufen. Der Vorteil: der Erstkontakt läuft strukturiert über die Webseite, die Fahrschule bekommt nur noch qualifizierte Anfragen von Leuten, die wissen, worauf sie sich einlassen. Und der Auftritt matcht die Botschaft der Fahrschule: gewissenhafte Ausbildung, ohne Hetze, mit Zeit zum Üben.',
    metaTitle:
      'Fahrschule Kreuzer Bielefeld · Projekt von Kolac Digital',
    metaDescription:
      'Wie Kolac Digital für die Fahrschule Kreuzer in Bielefeld-Brackwede eine komplette Webseite von Grund auf gebaut hat. Von null Web-Präsenz zu online buchbaren Anfragen.',
  },
  {
    slug: 'akquise-helfer',
    company: 'Akquise-Helfer',
    category: 'Vertriebsdienstleister',
    location: 'Hofbieber',
    tag: 'Individualsoftware für vier Unternehmen',
    overviewImage: '/images/akquisehelfer-dashboard.jpg',
    imageAlt:
      'Dashboard der Individualsoftware von Akquise-Helfer mit konsolidierter Ansicht über vier Unternehmen. Konkrete Zahlen sind unkenntlich gemacht.',
    services: [
      'Eigene Software für Buchhaltung, Vertrieb und Projekte',
      'Vier Unternehmen mit getrennten Rechten in einem System',
      'Automatische Belegerkennung aus dem Cloud-Ordner',
      'Auf dem eigenen Server des Kunden gehostet',
    ],
    keyWin:
      'Mehrere Dienstleister hatten abgesagt, es sei zu komplex. Heute läuft das System im Tagesgeschäft.',
    link: 'https://www.akquise-helfer.de/',
    linkText: 'Website ansehen',
    caseStudyUrl: '/case-studys/akquise-helfer',
    intro:
      'Für Akquise-Helfer haben wir eine eigene Software gebaut, die vier Unternehmen mit zwei Inhabern in einem System abbildet. Buchhaltung, Belege, Rechnungen, Angebote, Verträge, Leads, Projekte, Zeiten und Reisekosten laufen darin zusammen. Gehostet auf dem eigenen Server des Kunden.',
    situation:
      'Akquise-Helfer macht strategische Telefonakquise für mittelständische Betriebe. Geführt wird das Unternehmen von zwei Personen, die daneben weitere Firmen betreiben, teils gemeinsam, teils strikt getrennt. Handelsübliche Buchhaltungsprogramme kennen genau ein Unternehmen, Mehrfirmen-Systeme zeigen dagegen jedem alles. Dazu kam die steuerliche Feinheit, dass jeder Betrieb eine eigene EÜR abgibt, die Umsatzsteuer aber je Person zusammengefasst wird. Mehrere Dienstleister wurden vorher angefragt und sagten ab: zu komplex, nicht umsetzbar.',
    approach: [
      'Eigentum und Zugriff getrennt gedacht: wem ein Unternehmen steuerlich gehört und wer es sehen darf, sind zwei verschiedene Fragen. Ein Betrieb wird gemeinsam bespielt, zwei andere bleiben für die jeweils andere Person unsichtbar.',
      'Rechte als Matrix aus Unternehmen mal Bereich. Eine Person kann bei einem Betrieb nur Leads und Zeiterfassung sehen und bei den anderen gar nichts. Nicht freigegebene Bereiche verschwinden aus der Navigation.',
      'Buchhaltung nach der tatsächlichen Steuersystematik: eigene EÜR je Unternehmen, Umsatzsteuer je Person zusammengefasst, gerechnet nach Zahlungseingang statt nach Rechnungsdatum.',
      'Belegerkennung aus dem Cloud-Ordner. Datum, Betrag, Absender und Umsatzsteuer werden gelesen, Unsicheres wird als unsicher markiert statt still falsch übernommen.',
      'Rechnungen und Angebote als echtes PDF mit Live-Vorschau, Layout und Bankverbindung je Unternehmen einstellbar, inklusive QR-Code fürs Überweisen.',
      'Auf dem eigenen Server des Kunden ausgeliefert, mit Container und verschlüsselter Verbindung.',
    ],
    outcome:
      'Vier Unternehmen laufen in einem System statt in vier Insellösungen. Die Frage nach dem Gesamtbild beantwortet ein Blick aufs Dashboard. Belege kommen vorausgefüllt herein, jede Person sieht genau das, was für sie gedacht ist, und alle Daten liegen auf dem eigenen Server. Das Entscheidende ist nicht die Zahl der Funktionen, sondern dass die Software der Struktur des Unternehmens folgt statt umgekehrt.',
    metaTitle:
      'Akquise-Helfer · Individualsoftware für vier Unternehmen · Kolac Digital',
    metaDescription:
      'Wie Kolac Digital für Akquise-Helfer eine eigene Software für vier Unternehmen gebaut hat, nachdem mehrere Dienstleister abgesagt hatten. Buchhaltung, Leads und Projekte auf dem eigenen Server.',
  },
  {
    slug: 'bacara-aesthetik',
    company: 'Bacara Ästhetik',
    category: 'Ästhetik-Praxis',
    location: 'Bünde, OWL',
    tag: 'Webseite mit Buchungssystem',
    overviewImage: '/images/bacara-website.webp',
    imageAlt: 'Webseite der Ästhetik-Praxis Bacara aus Bünde',
    services: [
      'Webseite mit Onlinebuchungssystem',
      'Sprechstundenzeiten in Echtzeit gepflegt',
      'Automatische Rechnungsstellung',
      'Kundengewinnung über Social Media',
    ],
    keyWin:
      'Über 800 Termine über die Webseite gebucht. Buchungen verdreifacht.',
    link: 'https://www.bacara-aesthetik.de',
    linkText: 'Website ansehen',
    socialLink: 'https://www.instagram.com/bacaraasthetik/?hl=de',
    socialLinkText: 'Instagram ansehen',
    caseStudyUrl: '/case-studys/bacara-aesthetik',
    intro:
      'Für Dr. Bugrahan Bacara und seine Ästhetik-Praxis in Bünde haben wir eine Webseite mit vollintegriertem Buchungssystem gebaut. Termine werden direkt online gebucht, Sprechstundenzeiten stehen live drin, Rechnungen laufen automatisch raus.',
    situation:
      'Bacara Ästhetik ist eine Praxis für minimalinvasive Ästhetik. Vor der Zusammenarbeit lief die Terminvergabe manuell: Anfragen kamen per Anruf oder Nachricht rein, wurden händisch in den Kalender eingetragen, Rückrufe kosteten Zeit. Die vorhandene Online-Präsenz spiegelte die Qualität der Arbeit in der Praxis nicht wider.',
    approach: [
      'Neue Webseite mit dem Look-and-Feel einer modernen Ästhetik-Praxis: klar, hochwertig, vertrauenerweckend.',
      'Buchungssystem direkt integriert: Patienten sehen freie Sprechstundenzeiten in Echtzeit und buchen selbst.',
      'Automatische Rechnungsstellung im Backend, damit die Praxis den administrativen Aufwand runter fährt.',
      'Social-Media-Aufbau als Kanal für Neukunden-Gewinnung, direkt verlinkt mit dem Buchungssystem.',
    ],
    outcome:
      'Über 800 Termine sind über die Webseite gebucht worden. Die Buchungen haben sich verdreifacht. Die Praxis hat den Aufwand für Terminverwaltung massiv reduziert und der Inhaber kann sich auf die Behandlungen konzentrieren statt auf Rückrufe.',
    metaTitle:
      'Bacara Ästhetik Bünde · Webseite mit Buchungssystem · Projekt von Kolac Digital',
    metaDescription:
      'Wie Kolac Digital für Bacara Ästhetik in Bünde eine Webseite mit Onlinebuchungssystem gebaut hat. Über 800 Termine online gebucht, Buchungen verdreifacht.',
  },
  {
    slug: 'carhifi-herford',
    company: 'CarHiFi Herford',
    category: 'Autohifi und Sound-Studio',
    location: 'Herford, OWL',
    tag: 'Webseite mit Konfigurator',
    overviewImage: '/images/carhifi-herford-website.webp',
    imageAlt: 'Webseite von CarHiFi Herford mit Sound-Konfigurator',
    services: [
      'Webseite mit individuellem Backend',
      'Konfigurator für Soundanlagen',
      'Anfragen, Komponenten und Fahrzeugbaum zentral verwaltet',
      'TikTok-Strategie für organische Reichweite',
    ],
    keyWin:
      'Kundenanfragen plus 74 Prozent. Backend organisiert den kompletten Arbeitsalltag des Inhabers.',
    link: 'https://www.carhifi-herford.de/',
    linkText: 'Website ansehen',
    socialLink: 'https://www.tiktok.com/@hifi.halim',
    socialLinkText: 'TikTok ansehen',
    caseStudyUrl: '/case-studys/carhifi-herford',
    intro:
      'Für CarHiFi Herford, spezialisiert auf individuelle Soundanlagen im Auto, haben wir eine Webseite mit eigenem Konfigurator und maßgeschneidertem Backend gebaut. Anfragen, Komponenten und der Fahrzeugbaum werden zentral im System verwaltet.',
    situation:
      'CarHiFi Herford baut Soundanlagen individuell für jedes Fahrzeug. Vor der Zusammenarbeit gab es keine strukturierte Möglichkeit, Anfragen einzusammeln oder die eigenen Komponenten übersichtlich darzustellen. Interessenten hatten keine Chance, den Umfang und die Qualität der Arbeit online zu erkennen. Und der Inhaber verlor Zeit mit Anfragen, die letztlich nicht passten.',
    approach: [
      'Neue Webseite mit klarer Positionierung als Spezialist für Autohifi.',
      'Konfigurator, mit dem Interessenten Fahrzeug und Sound-Wunsch angeben und schon vorab eine Einschätzung sehen.',
      'Individuelles Backend, das Anfragen aufnimmt und dem Inhaber im Dashboard nach Fahrzeug und Komponente sortiert anzeigt.',
      'TikTok-Content-Strategie, damit die Arbeit sichtbar wird und organische Reichweite entsteht.',
    ],
    outcome:
      'Die Kundenanfragen sind um 74 Prozent gestiegen. Wichtiger noch: die Anfragen sind qualifizierter, weil der Konfigurator schon vorne vorsortiert. Der Inhaber hat mit dem Backend jetzt einen zentralen Arbeitsplatz für sein Tagesgeschäft statt Zettel und E-Mails.',
    metaTitle:
      'CarHiFi Herford · Webseite mit Konfigurator · Projekt von Kolac Digital',
    metaDescription:
      'Wie Kolac Digital für CarHiFi Herford eine Webseite mit Konfigurator und individuellem Backend gebaut hat. Kundenanfragen plus 74 Prozent.',
  },
  {
    slug: 'mironi',
    company: 'Mironi',
    category: 'E-Commerce für Socken und Unterwäsche',
    location: 'Herford',
    tag: 'Onlineshop und Marketing',
    overviewImage: '/images/mironi-website.webp',
    imageAlt: 'Onlineshop von Mironi für Socken und Unterwäsche',
    services: [
      'Onlineshop mit Bestellstatus-Mails',
      'Automatisierte Mailkampagnen',
      'Google Ads und Meta Ads',
      'Content für Social Media',
    ],
    keyWin:
      'Marketing komplett ausgelagert. Der Inhaber gewinnt Zeit fürs Strategische.',
    link: 'https://mironi.de',
    linkText: 'Shop ansehen',
    intro:
      'Für Mironi, eine Marke für qualitative Socken und Unterwäsche aus Herford, betreiben wir Onlineshop plus komplettes Marketing. Von der Bestellabwicklung über automatisierte Mails bis zu Ads und Social Content.',
    situation:
      'Der Inhaber wollte die Marke Mironi aufbauen, ohne dass jeder Bereich seinen Kopf braucht. Onlineshop, Kundenservice, Mailings, Ads und Social Media parallel zu betreuen ist für einen einzelnen Unternehmer nicht mehr leistbar.',
    approach: [
      'Onlineshop mit sauberer Bestellstrecke und automatisierten Bestellstatus-Mails, damit Kunden immer wissen, wo ihre Lieferung steht.',
      'Automatisierte Mailkampagnen für Reaktivierung und Nachfassen bei Warenkorb-Abbrechern.',
      'Google Ads und Meta Ads laufend geschaltet und optimiert.',
      'Social-Media-Content erstellt und ausgespielt.',
    ],
    outcome:
      'Das komplette Marketing läuft ausgelagert. Der Inhaber kümmert sich um Produkt, Einkauf und Strategie, statt jeden Tag Ads-Manager und Newsletter-Tool zu öffnen.',
    metaTitle:
      'Mironi Herford · Onlineshop und Marketing · Projekt von Kolac Digital',
    metaDescription:
      'Wie Kolac Digital für Mironi in Herford Onlineshop, Ads, Mailings und Social Media betreibt. Komplettes Marketing ausgelagert.',
  },
  {
    slug: 'af-gebaeudeservice',
    company: 'AF-Gebäudeservice',
    category: 'Gebäudereinigung und Dienstleistung',
    location: 'OWL',
    tag: 'Webseite und Digitalisierung',
    overviewImage: '/images/AF-Gebäudeservice.webp',
    imageAlt: 'Webauftritt von AF-Gebäudeservice',
    services: [
      'Professioneller Webauftritt von Grund auf',
      'Digitales Anfrage- und Angebotsformular',
      'Google Business Profile optimiert',
      'Lokales SEO und saubere Unternehmensdarstellung',
    ],
    keyWin:
      'Anfragen laufen jetzt digital rein. Kein verpasster Auftrag mehr durch verpasste Anrufe.',
    link: 'https://www.af-gebaeudeservice.de',
    linkText: 'Website ansehen',
    intro:
      'Für AF-Gebäudeservice haben wir den kompletten Webauftritt aufgebaut und die Anfrage-Strecke digitalisiert. Interessenten sehen die Leistungen strukturiert und schicken ihre Anfrage direkt online statt telefonisch.',
    situation:
      'Der Betrieb war operativ stark, aber die digitale Sichtbarkeit fehlte. Anfragen kamen ausschließlich telefonisch, was hieß: nicht erreichbar gleich verpasster Auftrag. Google Business Profile war lieblos gepflegt, ein professioneller Auftritt online fehlte komplett.',
    approach: [
      'Neuer Webauftritt mit klarer Darstellung der Leistungen und Referenzen.',
      'Digitales Anfrage- und Angebotsformular, das Interessenten in ihrem Tempo ausfüllen.',
      'Google Business Profile professionell aufgesetzt und optimiert.',
      'Lokales SEO für die Region OWL, damit Suchende den Betrieb bei relevanten Anfragen finden.',
    ],
    outcome:
      'Anfragen laufen jetzt jederzeit digital rein, auch außerhalb der Bürozeiten. Kein verpasster Auftrag mehr, weil ein Anruf durchgerutscht ist. Und der Betrieb ist bei lokalen Suchen sichtbar.',
    metaTitle:
      'AF-Gebäudeservice · Webseite und Digitalisierung · Projekt von Kolac Digital',
    metaDescription:
      'Wie Kolac Digital für AF-Gebäudeservice einen neuen Webauftritt gebaut und Anfragen digitalisiert hat. Lokales SEO für OWL.',
  },
  {
    slug: 'mk-automobile',
    company: 'MK Automobile',
    category: 'Autohaus',
    location: 'Herford',
    tag: 'Social Media und TikTok',
    overviewImage: '/images/mk-tiktok.webp',
    imageAlt: 'TikTok-Content von MK Automobile Herford',
    services: [
      'Social-Media-Kanal vereinheitlicht',
      'Content-Konzept, Filmen, Schneiden, Posten',
      'TikTok-Fokus für organische Reichweite',
      'Kunde fokussiert sich aufs Kerngeschäft',
    ],
    keyWin:
      'Durch TikTok direkt Autos vermittelt. Organische Reichweite in echte Verkäufe umgewandelt.',
    socialLink: 'https://www.tiktok.com/@mkautomobileherford',
    socialLinkText: 'TikTok ansehen',
    intro:
      'Für MK Automobile in Herford haben wir den Social-Media-Auftritt neu aufgestellt und laufend bespielt. TikTok als Hauptkanal, mit Inhalten, die aus dem Alltag des Autohauses erzählen.',
    situation:
      'Der Inhaber wusste, dass TikTok Reichweite bringen kann, hatte aber weder Zeit noch Erfahrung, das strategisch aufzubauen. Der Kanal war unregelmäßig bespielt, ohne roten Faden und ohne messbaren Effekt.',
    approach: [
      'Kanal-Positionierung und wiederkehrende Content-Formate entwickelt.',
      'Filmen und Schneiden komplett übernommen, damit der Inhaber sich auf die Kunden konzentriert.',
      'Regelmäßige Posts, die zeigen, was das Autohaus wirklich macht und wer dahintersteckt.',
    ],
    outcome:
      'Durch TikTok wurden konkret Autos vermittelt. Menschen kamen ins Autohaus, weil sie einen Content gesehen hatten. Organische Reichweite, die sich in Umsatz übersetzt hat.',
    metaTitle:
      'MK Automobile Herford · TikTok und Social Media · Projekt von Kolac Digital',
    metaDescription:
      'Wie Kolac Digital für MK Automobile in Herford den TikTok-Kanal aufgebaut und aus Reichweite echte Autoverkäufe gemacht hat.',
  },
  {
    slug: 'die-marke-yuma',
    company: 'Die Marke Yuma',
    category: 'Eigenes Entertainment-Projekt',
    location: 'Deutschland',
    tag: 'TikTok-Kanal und Quiz-App',
    overviewImage: '/images/yuma-tiktok.webp',
    imageAlt: 'TikTok-Kanal und YumaPlay-App der Marke Yuma',
    services: [
      'TikTok-Entertainment-Kanal aufgebaut und skaliert',
      'YUMA PLAY Quiz-App selbst entwickelt, für iOS und Android',
      'Eigene Webseite yumaplay.de für die App gebaut',
      'Community-Aufbau durch viralen Content',
    ],
    keyWin:
      'Über 90 Millionen Aufrufe, 4,7 Millionen Likes und 40.000 Abonnenten aufgebaut.',
    link: 'https://yumaplay.de/',
    linkText: 'yumaplay.de ansehen',
    socialLink: 'https://www.tiktok.com/@the.yuma.show',
    socialLinkText: 'TikTok ansehen',
    intro:
      'Yuma ist ein eigenes Projekt von Kolac Digital. Ein Entertainment-Kanal auf TikTok, dazu die Quiz-App YUMA PLAY mit eigener Webseite unter yumaplay.de. Genutzt als Labor, um Content-Strategien vor dem Kundeneinsatz zu testen.',
    situation:
      'Wenn du Kunden Strategien fürs Wachstum verkaufst, sollten die vorher auf eigenen Projekten funktioniert haben. Yuma ist genau das: ein Testfeld für Content-Formate, Community-Aufbau und App-Entwicklung.',
    approach: [
      'Entertainment-Kanal auf TikTok mit klarem Format-Repertoire.',
      'Eigene Quiz-App YUMA PLAY entwickelt und für iOS und Android veröffentlicht. Elf Quizmodi aus den Videos, allein oder reihum mit bis zu zehn Leuten auf einem Handy.',
      'Webseite yumaplay.de gebaut, die die App vorstellt und in die Stores führt.',
      'Community aufgebaut durch interaktive und virale Inhalte.',
    ],
    outcome:
      'Über 90 Millionen Aufrufe, 4,7 Millionen Likes und 40.000 Abonnenten. Aus dem Kanal ist mit YUMA PLAY ein eigenes Produkt entstanden, inklusive App in beiden Stores und eigener Webseite. Alle Erkenntnisse fließen in die Arbeit für Kunden zurück.',
    metaTitle:
      'Die Marke Yuma · TikTok und Quiz-App YUMA PLAY · Projekt von Kolac Digital',
    metaDescription:
      'Yuma ist das eigene Entertainment-Projekt von Kolac Digital. TikTok-Kanal mit über 40.000 Abonnenten, die Quiz-App YUMA PLAY für iOS und Android und die Webseite yumaplay.de.',
  },
];

export function findPortfolioProject(
  slug: string,
): PortfolioProject | undefined {
  return portfolioProjects.find((p) => p.slug === slug);
}
