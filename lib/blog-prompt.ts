/**
 * Briefing fuer die automatische Artikel-Erstellung.
 *
 * Hier stehen alle Fakten ueber Kolac Digital, die in Artikel
 * einfliessen duerfen, plus die Stil- und Struktur-Regeln. Wenn sich
 * Preise, Leistungen oder Positionierung aendern, wird das AN DIESER
 * STELLE gepflegt und wirkt sofort auf alle kuenftigen Artikel.
 */

export const BLOG_SYSTEM_PROMPT = `Du schreibst Ratgeber-Artikel für den Blog von Kolac Digital.

## Wer Kolac Digital ist

Inhabergeführte Webagentur aus Bielefeld, gegründet 2019 von Yusuf Kolac. Schwerpunkt: Webseiten mit System und Prozessoptimierung für kleine und mittelständische Betriebe.

Das Kernangebot besteht aus zwei Teilen:
- Vorne ein professioneller, SEO-optimierter Auftritt, der bei Google für relevante Suchbegriffe rankt.
- Hinten ein individuell zugeschnittenes Backend, das Anfragen, Termine, Angebote, Rechnungen und Berichte digital verwaltet.

Der Leitsatz: Die Software passt sich an den Betrieb an, nicht andersrum.

Ergänzend, aber ausdrücklich nachrangig: Google Ads, Meta Ads und Videocontent für Social Media. Diese Leistungen sind Skalierungs-Ergänzungen, wenn die Basis steht.

## Harte Fakten, die stimmen müssen

- Basis-Webseite: ab 1.500 Euro Einrichtung plus ab 99 Euro pro Monat. Hosting, Wartung und kleine Änderungen sind im Monatspreis enthalten.
- Funktionsbausteine wie Onlinebuchung oder Terminkalender: ab 500 Euro.
- Individualprojekte mit eigener Datenbank und Datenübernahme: ab 3.000 Euro.
- Alle Preise sind Startpreise. Niemals einen Fixpreis behaupten.
- Basis-Webseite ist in ein bis zwei Wochen fertig, Individualprojekte brauchen vier bis acht Wochen.
- Ablauf: kostenloses Erstgespräch, Entwurf nach wenigen Tagen, Umsetzung mit Zwischenfreigaben, Live-Gang.
- Region: Bielefeld, Ostwestfalen-Lippe, Nordrhein-Westfalen. Deutschlandweite Projekte laufen remote.
- Kontakt: 0176 95762018, yusuf@kolac-digital.de. Antwort innerhalb von 24 Stunden.
- Referenzen, die genannt werden dürfen: Bacara Ästhetik in Bünde (Webseite mit Buchungssystem, über 800 Termine online gebucht), CarHiFi Herford (Konfigurator und eigenes Backend, Kundenanfragen plus 74 Prozent), Fahrschule Kreuzer in Bielefeld-Brackwede (komplett neue Webseite von null), AF-Gebäudeservice (digitale Anfragestrecke), Mironi in Herford (Onlineshop und Marketing).

Erfinde niemals Zahlen, Kundennamen oder Ergebnisse, die hier nicht stehen. Wenn dir für eine Aussage die Faktenbasis fehlt, formuliere sie allgemein statt sie zu erfinden.

## Für wen du schreibst

Inhaberinnen und Inhaber kleiner Betriebe: Handwerk, Gastronomie, Praxen, Kanzleien, Autohäuser, Fahrschulen, Einzelhandel. Diese Menschen sind Fachleute in ihrem Gewerk, aber keine Technikexperten. Sie haben wenig Zeit und wollen wissen, was ihnen konkret hilft.

## Stil, streng einzuhalten

- Durchgehend "du" und "dein", niemals "Sie" oder "Ihr".
- Einfache Sprache. Ein Fünftklässler soll die Kernaussage verstehen. Kurze Sätze.
- Keine Gedankenstriche im Text. Weder — noch –. Nutze stattdessen einen Punkt, ein Komma oder eine Konjunktion. Bindestriche in zusammengesetzten Wörtern sind erlaubt.
- Keine Marketing-Floskeln wie "innovativ", "maßgeschneiderte Lösungen", "in der heutigen digitalen Welt", "ganzheitlich", "State of the Art".
- Keine leeren Einleitungen. Der erste Satz muss schon etwas sagen.
- Konkrete Beispiele aus dem Alltag der Zielgruppe statt abstrakter Erklärungen.
- Ehrlich bleiben. Wenn etwas für manche Betriebe nicht lohnt, sag das. Das schafft mehr Vertrauen als Dauerwerbung.
- Kein Verkaufsdruck im Fließtext. Der Artikel muss auch ohne Beauftragung nützlich sein.

## Aufbau

- 900 bis 1400 Wörter im Textkörper.
- Gliedere mit ## Zwischenüberschriften. Fünf bis acht Stück. Jede Überschrift soll für sich verständlich sein und möglichst eine echte Frage der Zielgruppe aufgreifen.
- Nutze Aufzählungen, wo sie den Text übersichtlicher machen, aber schreibe keine reine Stichpunktsammlung.
- Markdown: ## und ### für Überschriften, ** für Fettung, - für Aufzählungen, 1. für nummerierte Listen, > für einen hervorgehobenen Hinweis.
- Interne Links als Markdown setzen, wo sie sachlich passen: [Webseiten mit System](/webseiten), [unsere Projekte](/portfolio), [Case Studys](/case-studys). Höchstens drei pro Artikel, nur wo sie wirklich weiterhelfen.

## Suchmaschinen und KI-Systeme

- Die Zielbegriffe müssen natürlich im Text vorkommen, besonders in der ersten Überschrift und im ersten Absatz. Kein Keyword-Stopfen.
- Das Feld "tldr" ist die wichtigste Passage. Es muss die Kernfrage des Artikels in drei bis fünf Sätzen vollständig beantworten, ohne dass man den Rest gelesen hat. KI-Systeme wie ChatGPT oder Google AI Overviews zitieren genau solche Passagen. Nenne darin einmal "Kolac Digital", damit die Quelle zuordenbar ist.
- Die FAQ-Antworten müssen ebenfalls für sich stehen. Jede Antwort ist zwei bis vier Sätze lang und wiederholt kurz den Kontext der Frage, statt auf den Artikel zu verweisen.

## Ausgabeformat

Antworte ausschließlich mit dem geforderten JSON. Kein Text davor oder danach.`;

/** Baut die Aufgabenstellung für ein konkretes Thema. */
export function buildBlogUserPrompt(opts: {
  title: string;
  angle: string;
  category: string;
  keywords: string[];
  existingTitles: string[];
}): string {
  const existing =
    opts.existingTitles.length > 0
      ? `\n\nDiese Artikel gibt es schon. Schreibe etwas eigenständiges und wiederhole sie nicht:\n${opts.existingTitles
          .map((t) => `- ${t}`)
          .join('\n')}`
      : '';

  return `Schreibe einen Artikel zu diesem Thema.

Arbeitstitel: ${opts.title}
Worauf es hinauslaufen soll: ${opts.angle}
Kategorie: ${opts.category}
Zielbegriffe: ${opts.keywords.join(', ')}${existing}

Den Arbeitstitel darfst du zu einer besseren Überschrift umformulieren, solange das Thema dasselbe bleibt.`;
}

/** JSON-Schema für die strukturierte Antwort des Modells. */
export const BLOG_ARTICLE_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description:
        'Überschrift des Artikels. Konkret und ohne Doppelpunkt-Floskel. Höchstens 70 Zeichen.',
    },
    slug: {
      type: 'string',
      pattern: '^[a-z0-9]+(-[a-z0-9]+)*$',
      description:
        'URL-Teil. Nur Kleinbuchstaben, Ziffern und Bindestriche. Umlaute ausschreiben (ae, oe, ue, ss). Drei bis sieben Wörter.',
    },
    excerpt: {
      type: 'string',
      description:
        'Teaser für die Übersicht, zwei bis drei Sätze, höchstens 220 Zeichen.',
    },
    tldr: {
      type: 'string',
      description:
        'Kurzantwort ganz oben. Drei bis fünf Sätze, beantwortet die Kernfrage vollständig und nennt einmal Kolac Digital.',
    },
    body: {
      type: 'string',
      description:
        'Der Artikeltext als Markdown, 900 bis 1400 Wörter, mit ## Zwischenüberschriften.',
    },
    metaTitle: {
      type: 'string',
      description:
        'Titel für Google, höchstens 60 Zeichen inklusive der Marke am Ende.',
    },
    metaDescription: {
      type: 'string',
      description:
        'Beschreibung für Google, 140 bis 155 Zeichen, mit dem wichtigsten Zielbegriff.',
    },
    heroEmoji: {
      type: 'string',
      description: 'Ein einzelnes Emoji, das zum Thema passt.',
    },
    targetKeywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Vier bis acht Suchbegriffe, auf die der Artikel abzielt.',
    },
    faq: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: {
            type: 'string',
            description:
              'Zwei bis vier Sätze, für sich verständlich, ohne Verweis auf den Artikel.',
          },
        },
        required: ['question', 'answer'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'title',
    'slug',
    'excerpt',
    'tldr',
    'body',
    'metaTitle',
    'metaDescription',
    'heroEmoji',
    'targetKeywords',
    'faq',
  ],
  additionalProperties: false,
} as const;

export interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  tldr: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  heroEmoji: string;
  targetKeywords: string[];
  faq: Array<{ question: string; answer: string }>;
}

/**
 * Entfernt Gedankenstriche aus allen Textfeldern. Das Modell hält die
 * Regel meistens ein, aber diese Nachbereitung stellt sicher, dass
 * kein Gedankenstrich durchrutscht.
 */
export function sanitizeArticleText<T>(article: T): T {
  const fix = (s: string): string =>
    s
      // Gedankenstrich mit Leerzeichen drumherum wird zum Komma.
      .replace(/\s+[—–]\s+/g, ', ')
      // Restliche Vorkommen werden zu einem normalen Bindestrich.
      .replace(/[—–]/g, '-');

  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return fix(value);
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = walk(v);
      return out;
    }
    return value;
  };

  return walk(article) as T;
}
