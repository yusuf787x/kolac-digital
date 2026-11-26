/**
 * Stadtseiten unter /webdesign/{slug}. Jede Seite zielt auf
 * "webdesign {stadt}" und lebt von echten Projekten aus der Stadt oder
 * dem Kreis. Ohne eigenes Projekt vor Ort keine Stadtseite, Ausnahme:
 * ein direkter Nachbar mit Projekten aus der Nachbarschaft, dann mit
 * ehrlichem referenzHinweis (Gütersloh, 26.11.2026). Nie nur den
 * Ortsnamen austauschen: Einstieg, Nachbarorte und Fragen sind je
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
  /** Überschrift der Referenzen, wenn kein Projekt aus der Stadt selbst stammt. */
  referenzTitel?: string;
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
    metaTitle: 'Webdesign Herford · Websites für Betriebe | Kolac Digital',
    metaDescription:
      'Webdesign für Herford: Websites, die bei Google gefunden werden und Anfragen bringen. Referenzen aus Herford: CarHiFi Herford, Mironi, MK Automobile.',
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
    metaTitle: 'Webdesign Bünde · Websites mit Terminbuchung | Kolac Digital',
    metaDescription:
      'Webdesign für Bünde: Websites für Praxen, Studios und Betriebe, auf Wunsch mit Online-Terminbuchung. Referenz: Bacara Ästhetik, über 800 Termine online gebucht.',
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
    metaTitle: 'Webdesign Paderborn · Relaunch und Neubau | Kolac Digital',
    metaDescription:
      'Webdesign für Paderborn: Relaunch oder neue Website, die bei Google für Paderborn und den Kreis gefunden wird. Referenzen: PaderPuls und Pader Automobilzentrum.',
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
  {
    slug: 'guetersloh',
    stadt: 'Gütersloh',
    region: 'Kreis Gütersloh',
    nachbarorte: ['Rheda-Wiedenbrück', 'Verl', 'Harsewinkel', 'Herzebrock-Clarholz', 'Steinhagen', 'Halle (Westf.)', 'Schloß Holte-Stukenbrock', 'Rietberg'],
    metaTitle: 'Webdesign Gütersloh · Websites für den Kreis | Kolac Digital',
    metaDescription:
      'Webdesign für Gütersloh und den Kreis: Websites, die bei Google für deinen Ort gefunden werden und Anfragen bringen. Aus dem Nachbarort Bielefeld.',
    h1: 'Webdesign für Gütersloh: Websites, die im ganzen Kreis gefunden werden.',
    intro:
      'Wir bauen Websites für Handwerker, Werkstätten, Praxen und Dienstleister in Gütersloh und im Kreis Gütersloh. Jede Seite entwerfen wir für deinen Betrieb, sie lädt am Handy in Sekunden und nennt die Orte, in denen du arbeitest. So landen Suchende aus Verl, Rheda-Wiedenbrück oder Harsewinkel bei dir und nicht in einem Branchenverzeichnis.',
    lokal: [
      'Such mal bei Google nach Webdesign in Gütersloh: Vorne stehen vor allem Branchenverzeichnisse und Listen. So geht es vielen Branchen im Kreis. Statt der Website eines Betriebs zeigt Google ein Verzeichnis, in dem auch die Konkurrenz steht. Eine eigene Seite für jede Leistung, klare Ortsangaben und ein gepflegtes Google-Unternehmensprofil geben deiner Website die besseren Karten.',
      'Der Kreis Gütersloh lebt vom Mittelstand. Neben großen Namen wie Bertelsmann, Miele und Claas gibt es hier viele kleine Betriebe, deren Aufträge aus der Nachbarschaft kommen. Für sie bauen wir Websites, die in wenigen Sekunden klar machen, was du anbietest und wo. Gütersloh ist unser direkter Nachbar im Südwesten von Bielefeld. Fürs Erstgespräch und das Fotoshooting kommen wir zu dir in den Betrieb.',
      'Wie Seiten für einzelne Orte funktionieren, zeigt MC-Autopflege aus Herford. Für 12 Orte im Umkreis, von Hiddenhausen bis Gütersloh, gibt es eine eigene Seite mit echter Fahrstrecke und Fahrzeit. Nach demselben Prinzip planen wir deine Seiten für Gütersloh und die Orte, aus denen deine Kunden kommen.',
    ],
    referenzen: ['mc-autopflege', 'fahrschule-kreuzer'],
    referenzTitel: 'Projekte aus der Nachbarschaft.',
    referenzHinweis:
      'Aus Gütersloh selbst zeigen wir hier noch kein Projekt. MC-Autopflege sitzt in Herford und hat eine eigene Seite für Kunden aus Gütersloh. Die Fahrschule Kreuzer ist in Bielefeld-Brackwede, im Süden von Bielefeld.',
    faqs: [
      {
        question: 'Kommt ihr für Termine nach Gütersloh?',
        answer:
          'Ja. Unser Büro ist in Bielefeld, Gütersloh liegt direkt nebenan. Erstgespräch und Fotoshooting machen wir gern bei dir im Betrieb. Alles andere klappt genauso per Telefon oder Video Call.',
      },
      {
        question: 'Warum stehen bei Google vorne oft nur Verzeichnisse?',
        answer:
          'Weil viele Betriebe keine eigene Seite für ihre Leistung und ihren Ort haben. Dann zeigt Google lieber eine Liste. Mit einer Unterseite pro Leistung, klaren Ortsangaben und einem gepflegten Google-Unternehmensprofil hat deine eigene Website die besseren Chancen. Einen ersten Platz garantiert dir aber niemand seriös.',
      },
      {
        question: 'Macht ihr auch Websites für Betriebe in Rheda-Wiedenbrück, Verl oder Harsewinkel?',
        answer:
          'Ja, für den ganzen Kreis Gütersloh. Deine Website nennt die Orte, in denen du wirklich arbeitest. Erfundene Einsatzgebiete bauen wir nicht ein, das merken Google und deine Kunden.',
      },
      {
        question: 'Ich habe schon eine Website. Reicht es, sie bei Google besser aufzustellen?',
        answer:
          'Oft ja. Ist deine Seite technisch in Ordnung, kümmern wir uns nur um die Sichtbarkeit bei Google, also um SEO und dein Google-Profil. Wo du gerade stehst, zeigt dir unser kostenloser SEO-Check in rund 30 Sekunden.',
      },
      {
        question: 'Was kostet es, in Gütersloh eine Website erstellen zu lassen?',
        answer: kostenAntwort,
      },
    ],
    formSource: 'Stadtseite Gütersloh',
  },
];

export function findStadtSeite(slug: string): StadtSeite | undefined {
  return staedteSeiten.find((s) => s.slug === slug);
}
