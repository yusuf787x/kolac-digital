/**
 * Stadtseiten unter /webdesign/{slug}. Jede Seite zielt auf
 * "webdesign {stadt}" und lebt von echten Projekten aus der Stadt oder
 * dem Kreis. Ohne eigenes Projekt vor Ort keine Stadtseite, und nie nur
 * den Ortsnamen austauschen: Einstieg, Nachbarorte und Fragen sind je
 * Stadt eigen. Siehe docs/blog-keyword-strategie.md.
 *
 * Die Hauptseite für Bielefeld ist /webseiten, deshalb gibt es hier
 * keinen Eintrag für Bielefeld.
 */

import type { BranchenFaq } from './branchen-seiten';

export interface StadtSeite {
  slug: string;
  stadt: string;
  /** Kreis oder Region, z.B. "Kreis Herford". */
  region: string;
  /** Orte im Umkreis, die auf der Seite genannt werden. */
  nachbarorte: string[];
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  /** Warum ein Webdesigner aus der Nähe hier hilft. Zwei, drei Absätze. */
  lokal: string[];
  /** Projekte aus lib/portfolio.ts, das erste ist die Hauptreferenz. */
  referenzen: string[];
  /** Einordnung, wenn eine Referenz aus dem Umland stammt. */
  referenzHinweis?: string;
  faqs: BranchenFaq[];
  formSource: string;
}

const kostenAntwort =
  'Das hängt vom Umfang ab. Eine Website mit wenigen Seiten ist schneller gebaut als eine mit Terminbuchung oder eigenem Backend. Nach dem kostenlosen Erstgespräch bekommst du ein festes Angebot zum Festpreis, mit allen Positionen. Hosting, Wartung und kleine Änderungen sind im Monatspreis enthalten, und der startet erst, wenn deine Seite live ist.';

export const staedteSeiten: StadtSeite[] = [
  {
    slug: 'herford',
    stadt: 'Herford',
    region: 'Kreis Herford',
    nachbarorte: ['Enger', 'Hiddenhausen', 'Löhne', 'Vlotho', 'Kirchlengern', 'Spenge', 'Bünde'],
    metaTitle: 'Webdesign Herford · Websites für Betriebe aus dem Kreis Herford | Kolac Digital',
    metaDescription:
      'Webdesign für Herford: individuelle Websites, die bei Google gefunden werden und Anfragen bringen. Referenzen aus Herford: CarHiFi Herford, Mironi, MK Automobile.',
    h1: 'Webdesign für Herford: Websites, die Anfragen bringen.',
    intro:
      'Als Webdesign-Agentur aus dem Nachbarort Bielefeld bauen wir Websites für Unternehmen in Herford und im Kreis. Individuell statt Baukasten, schnell am Handy und so aufgebaut, dass Google dich bei Suchen aus der Region findet. Auf Wunsch mit System dahinter: Anfragen, Termine und Angebote laufen sortiert bei dir ein.',
    lokal: [
      'Herford ist für uns kein Ort auf der Landkarte, sondern Arbeitsalltag. Mit CarHiFi Herford, Mironi und MK Automobile arbeiten wir für drei Betriebe aus der Stadt, von der Website mit Konfigurator über den Onlineshop bis zum TikTok-Kanal. Unser Büro ist im benachbarten Bielefeld, für Termine und das Fotoshooting kommen wir zu dir.',
      'Wer in Herford einen Handwerker, eine Werkstatt oder einen Dienstleister sucht, sucht oft auch nach den Orten drumherum: Enger, Hiddenhausen, Löhne oder Vlotho. Deshalb bauen wir deine Website so, dass sie dein Einsatzgebiet klar nennt und bei Google für genau diese Suchen auftaucht. Dazu gehören Suchmaschinenoptimierung (SEO) mit klarer Seitenstruktur, kurze Ladezeiten und ein gepflegtes Google-Unternehmensprofil mit echten Bewertungen. So wächst deine Sichtbarkeit in der Region Schritt für Schritt.',
    ],
    referenzen: ['carhifi-herford', 'mironi', 'mk-automobile'],
    faqs: [
      {
        question: 'Kommt ihr für Termine nach Herford?',
        answer:
          'Ja. Unser Büro ist in Bielefeld, Herford liegt direkt nebenan. Das Erstgespräch machen wir gern bei dir vor Ort, genauso das Fotoshooting für deine Website. Wer es lieber schnell mag, spricht mit uns per Telefon oder Video Call.',
      },
      {
        question: 'Wird meine Website bei Suchen in Herford gefunden?',
        answer:
          'Darauf bauen wir die Seite aus: klare Angaben zu Ort und Einsatzgebiet, eigene Unterseiten für deine Leistungen, saubere Technik und ein gepflegtes Google-Unternehmensprofil. Einen garantierten ersten Platz verspricht niemand seriös. Aber du bekommst eine Seite, die Google für Suchen aus der Region klar zuordnen kann.',
      },
      {
        question: 'Macht ihr auch Websites für Betriebe in Löhne, Enger oder Vlotho?',
        answer:
          'Ja, für den ganzen Kreis Herford und darüber hinaus. Viele unserer Kunden sitzen in Ostwestfalen-Lippe, einige in ganz Deutschland.',
      },
      {
        question: 'Was kostet es, in Herford eine Website erstellen zu lassen?',
        answer: kostenAntwort,
      },
    ],
    formSource: 'Stadtseite Herford',
  },
  {
    slug: 'buende',
    stadt: 'Bünde',
    region: 'Kreis Herford',
    nachbarorte: ['Kirchlengern', 'Rödinghausen', 'Hiddenhausen', 'Löhne', 'Enger', 'Herford'],
    metaTitle: 'Webdesign Bünde · Websites mit Online-Terminbuchung | Kolac Digital',
    metaDescription:
      'Webdesign für Bünde: individuelle Websites für Praxen, Studios und Betriebe, auf Wunsch mit Online-Terminbuchung. Referenz aus Bünde: Bacara Ästhetik mit über 800 online gebuchten Terminen.',
    h1: 'Webdesign für Bünde: Websites, über die Kunden direkt buchen.',
    intro:
      'Wir bauen Websites für Betriebe in Bünde und Umgebung. Individuell gestaltet, bei Google sichtbar und auf Wunsch mit Online-Terminbuchung, damit Kunden nicht erst anrufen müssen. Für Praxen, Studios, Handwerker und Dienstleister zwischen Bünde, Kirchlengern und Rödinghausen.',
    lokal: [
      'In Bünde haben wir für Bacara Ästhetik die Website mit integriertem Buchungssystem gebaut. Patienten sehen freie Zeiten und buchen selbst, über 800 Termine sind so schon zusammengekommen. Genau so eine Seite bauen wir auch für deinen Betrieb, zugeschnitten auf deine Abläufe.',
      'Unser Büro ist in Bielefeld, nach Bünde ist es nicht weit. Fürs Erstgespräch und das Fotoshooting kommen wir zu dir. Und weil wir mehrere Kunden im Kreis Herford betreuen, kennen wir die Region: Wer in Bünde sucht, sucht oft auch in Kirchlengern, Rödinghausen oder Löhne. Deine Website nennt dein Einsatzgebiet so, dass Google es versteht.',
    ],
    referenzen: ['bacara-aesthetik', 'carhifi-herford', 'mironi'],
    referenzHinweis:
      'Bacara Ästhetik sitzt in Bünde. CarHiFi Herford und Mironi kommen aus dem Nachbarort Herford.',
    faqs: [
      {
        question: 'Kommt ihr für Termine nach Bünde?',
        answer:
          'Ja. Von unserem Büro in Bielefeld ist Bünde gut erreichbar. Das Erstgespräch und das Fotoshooting machen wir gern bei dir vor Ort, alles andere geht auch per Telefon oder Video Call.',
      },
      {
        question: 'Geht eine Website mit Online-Terminbuchung auch für meinen Betrieb?',
        answer:
          'Ja, wenn du mit Terminen arbeitest: Praxis, Studio, Werkstatt oder Beratung. Kunden sehen freie Zeiten, buchen selbst und bekommen eine Bestätigung. Du siehst alle Buchungen an einem Ort. Bei Bacara Ästhetik in Bünde läuft genau das.',
      },
      {
        question: 'Wird meine Website bei Suchen in Bünde gefunden?',
        answer:
          'Wir bauen sie darauf aus: Ort und Einsatzgebiet klar genannt, eine Unterseite pro Leistung, saubere Technik und ein gepflegtes Google-Unternehmensprofil mit Bewertungen. Einen garantierten ersten Platz verspricht niemand seriös, aber Google kann deine Seite dann eindeutig Bünde zuordnen.',
      },
      {
        question: 'Was kostet es, in Bünde eine Website erstellen zu lassen?',
        answer: kostenAntwort,
      },
    ],
    formSource: 'Stadtseite Bünde',
  },
  {
    slug: 'paderborn',
    stadt: 'Paderborn',
    region: 'Kreis Paderborn',
    nachbarorte: ['Bad Lippspringe', 'Delbrück', 'Salzkotten', 'Büren', 'Hövelhof', 'Borchen', 'Altenbeken'],
    metaTitle: 'Webdesign Paderborn · Relaunch und Websites, die gefunden werden | Kolac Digital',
    metaDescription:
      'Webdesign für Paderborn: Relaunch oder neue Website, die bei Google für Paderborn und den Kreis gefunden wird. Referenzen: PaderPuls Krankenfahrdienst und Pader Automobilzentrum.',
    h1: 'Webdesign für Paderborn: Websites, die in der Region gefunden werden.',
    intro:
      'Wir bauen Websites für Betriebe in Paderborn und im Kreis Paderborn, neu oder als Relaunch einer alten Seite. Mit klarer Struktur, Unterseiten für deine Leistungen und Orte und einer Technik, die Google sauber lesen kann. Damit Kunden aus Paderborn, Delbrück oder Salzkotten bei dir landen und nicht bei der Konkurrenz.',
    lokal: [
      'Für PaderPuls, einen Krankenfahrdienst aus Paderborn, haben wir die alte Baukasten-Seite durch einen kompletten Relaunch ersetzt. Aus fünf dünnen Seiten wurden über 40 Seiten mit echtem Inhalt: jede Leistung einzeln, dazu Seiten für die Paderborner Stadtteile und die Orte im Kreis Paderborn und im Kreis Höxter. Das Ergebnis: spürbar mehr Anfragen und Anrufe über die Website.',
      'Ganz ohne Vorgänger startete Pader Automobilzentrum, ein neu gegründeter Betrieb für Autoankauf, Reifenservice und Smart Repair. Hier stand am Anfang eine SEO-Analyse: Welche Suchen in Paderborn bringen Aufträge? Darauf ist die einfach gehaltene Website ausgerichtet, mit 13 Leistungsseiten, Ratgeber-Artikeln und den Paderborner Stadtteilen. Dazu haben wir das Google-Unternehmensprofil aufgesetzt, damit der Betrieb auch in Google Maps auftaucht.',
      'Diese Erfahrung bringen wir in jedes Projekt in Paderborn mit, ob Relaunch oder Neugründung. Unser Büro ist in Bielefeld, das Erstgespräch läuft per Telefon, Video Call oder bei dir vor Ort. Den Entwurf siehst du nach wenigen Tagen online.',
    ],
    referenzen: ['paderpuls', 'pader-automobilzentrum'],
    faqs: [
      {
        question: 'Lohnt sich ein Relaunch meiner alten Website?',
        answer:
          'Meistens dann, wenn die Seite am Handy schlecht aussieht, bei Google kaum auftaucht oder du Inhalte nicht selbst ändern kannst. Bei einem Relaunch übernehmen wir, was gut ist, leiten alle alten Adressen sauber weiter und bauen den Rest neu auf. So verlierst du keine Besucher, die über alte Links kommen.',
      },
      {
        question: 'Ich gründe gerade in Paderborn. Brauche ich die Website sofort?',
        answer:
          'Ja, je früher, desto besser. Google braucht einige Wochen, bis eine neue Seite gut einsortiert ist, und ohne Website und Google-Profil findet dich in den ersten Monaten kaum jemand. Bei Pader Automobilzentrum waren Website und Google-Unternehmensprofil zum Start fertig, ausgerichtet auf die Suchen, die in Paderborn Aufträge bringen.',
      },
      {
        question: 'Wird meine Website bei Suchen in Paderborn gefunden?',
        answer:
          'Wir bauen sie darauf aus: eigene Seiten für deine Leistungen und dein Einsatzgebiet, saubere Technik, strukturierte Daten und ein gepflegtes Google-Unternehmensprofil. Einen garantierten ersten Platz verspricht niemand seriös. Wie das aussehen kann, zeigt PaderPuls.',
      },
      {
        question: 'Kommt ihr für Termine nach Paderborn?',
        answer:
          'Ja, wenn du das möchtest. Unser Büro ist in Bielefeld. Viele Projekte laufen aber komplett per Telefon und Video Call, das spart dir Zeit.',
      },
      {
        question: 'Was kostet es, in Paderborn eine Website erstellen zu lassen?',
        answer: kostenAntwort,
      },
    ],
    formSource: 'Stadtseite Paderborn',
  },
];

export function findStadtSeite(slug: string): StadtSeite | undefined {
  return staedteSeiten.find((s) => s.slug === slug);
}
