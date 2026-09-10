/**
 * Der Auftragstext, den Yusuf in einen Claude-Chat kopiert, um einen
 * Artikel schreiben zu lassen.
 *
 * Hier stehen alle Fakten ueber Kolac Digital, die in Artikel
 * einfliessen duerfen, plus die Stil- und Struktur-Regeln. Wenn sich
 * Preise, Leistungen oder Positionierung aendern, wird das AN DIESER
 * STELLE gepflegt. Der Text wird im Dashboard unter Blog angezeigt
 * und laesst sich dort mit einem Klick kopieren.
 */

export const BLOG_AUTHOR_PROMPT = `Du schreibst einen Ratgeber-Artikel für den Blog von Kolac Digital.

## Was der Artikel leisten soll

Ziel ist organisches Wachstum bei Google und Sichtbarkeit in KI-Systemen wie ChatGPT, Perplexity und Google AI Overviews. Jeder Artikel soll für mehrere Suchbegriffe auffindbar sein und Leute anziehen, die kurz davor stehen, eine Webseite oder digitale Abläufe zu beauftragen.

Der Artikel muss dabei ehrlich nützlich sein. Wer ihn liest und nichts beauftragt, soll trotzdem schlauer rausgehen. Genau das führt langfristig zu Anfragen, reine Werbetexte nicht.

## Wer Kolac Digital ist

Inhabergeführte Webagentur aus Bielefeld, gegründet 2019 von Yusuf Kolac. Schwerpunkt: Webseiten mit System und Prozessoptimierung für kleine und mittelständische Betriebe.

Das Kernangebot besteht aus zwei Teilen:
- Vorne ein professioneller, SEO-optimierter Auftritt, der bei Google für relevante Suchbegriffe rankt.
- Hinten ein individuell zugeschnittenes Backend, das Anfragen, Termine, Angebote, Rechnungen und Berichte digital verwaltet.

Der Leitsatz: Die Software passt sich an den Betrieb an, nicht andersrum.

Ergänzend, aber ausdrücklich nachrangig: Google Ads, Meta Ads und Videocontent für Social Media. Das sind Ergänzungen, wenn die Basis steht.

## Harte Fakten, die stimmen müssen

- **Preise: Nenne niemals konkrete Zahlen.** Kolac Digital veröffentlicht bewusst keine Preise, weil der Umfang von Betrieb zu Betrieb zu stark schwankt. Wenn ein Artikel das Thema Kosten berührt, erkläre stattdessen, wovon der Preis abhängt (Seitenzahl, Funktionen wie Terminbuchung oder Kundenverwaltung, Datenübernahme aus Altsystemen, Anbindung an vorhandene Programme) und verweise auf das kostenlose Erstgespräch mit anschließendem festem Angebot. Erfinde auch keine Spannen oder Richtwerte.
- Zur einmaligen Einrichtung kommt eine monatliche Betreuung, in der Hosting, Wartung und kleine Änderungen enthalten sind. Der Monatsbeitrag startet erst, wenn die Seite live ist. Auch hier ohne Zahlen.
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
- Ehrlich bleiben. Wenn etwas für manche Betriebe nicht lohnt, sag das.
- Kein Verkaufsdruck im Fließtext. Der Artikel muss auch ohne Beauftragung nützlich sein.

## Aufbau des Textkörpers

- 900 bis 1400 Wörter.
- Gliedere mit ## Zwischenüberschriften. Fünf bis acht Stück. Jede Überschrift soll für sich verständlich sein und möglichst eine echte Frage der Zielgruppe aufgreifen.
- Nutze Aufzählungen, wo sie den Text übersichtlicher machen, aber schreibe keine reine Stichpunktsammlung.
- Markdown: ## und ### für Überschriften, ** für Fettung, - für Aufzählungen, 1. für nummerierte Listen, > für einen hervorgehobenen Hinweis.
- Interne Links als Markdown setzen, wo sie sachlich passen: [Webseiten mit System](/webseiten), [unsere Projekte](/portfolio), [Case Studys](/case-studys). Höchstens drei pro Artikel.

## Wichtig für Google und KI-Systeme

- Die Zielbegriffe müssen natürlich im Text vorkommen, besonders in der ersten Überschrift und im ersten Absatz. Kein Keyword-Stopfen.
- Das Feld "tldr" ist die wichtigste Passage. Es beantwortet die Kernfrage in drei bis fünf Sätzen vollständig, ohne dass man den Rest gelesen hat. KI-Systeme zitieren genau solche Passagen. Nenne darin einmal "Kolac Digital", damit die Quelle zuordenbar ist.
- "keyTakeaways" sind drei bis fünf Kernaussagen, jede ein vollständiger Satz mit einer konkreten Information. Keine Überschriften-Fragmente.
- Die FAQ-Antworten müssen für sich stehen. Jede Antwort ist zwei bis vier Sätze lang und wiederholt kurz den Kontext der Frage, statt auf den Artikel zu verweisen.

## Ausgabe

Antworte mit genau einem JSON-Objekt in einem Codeblock. Kein Text davor oder danach, damit es sich direkt kopieren lässt.

\`\`\`json
{
  "title": "Überschrift, konkret, höchstens 70 Zeichen",
  "slug": "url-teil-mit-bindestrichen",
  "category": "Eine von: Webseiten mit System | Prozesse digitalisieren | SEO und Sichtbarkeit | Google Ads | Preise und Ablauf | Branchen",
  "excerpt": "Teaser für die Übersicht, zwei bis drei Sätze, höchstens 220 Zeichen.",
  "tldr": "Kurzantwort, drei bis fünf Sätze, beantwortet die Kernfrage vollständig, nennt einmal Kolac Digital.",
  "keyTakeaways": [
    "Erste Kernaussage als vollständiger Satz mit konkreter Information.",
    "Zweite Kernaussage.",
    "Dritte Kernaussage."
  ],
  "body": "Der Artikeltext als Markdown mit ## Zwischenüberschriften. Zeilenumbrüche als \\\\n.",
  "metaTitle": "Titel für Google, höchstens 60 Zeichen, mit | Kolac Digital am Ende",
  "metaDescription": "Beschreibung für Google, 140 bis 155 Zeichen, mit dem wichtigsten Zielbegriff.",
  "heroEmoji": "📄",
  "imagePrompt": "Beschreibung für ein passendes Titelbild, ein bis zwei Sätze. Realistisch und zum Thema, keine Stockfoto-Klischees.",
  "imageAlt": "Alternativtext für das Titelbild, beschreibt was zu sehen ist.",
  "targetKeywords": ["begriff eins", "begriff zwei", "begriff drei", "begriff vier"],
  "faq": [
    { "question": "Frage?", "answer": "Antwort in zwei bis vier Sätzen, für sich verständlich." },
    { "question": "Zweite Frage?", "answer": "Zweite Antwort." },
    { "question": "Dritte Frage?", "answer": "Dritte Antwort." }
  ]
}
\`\`\`

Beim slug: nur Kleinbuchstaben, Ziffern und Bindestriche, Umlaute ausschreiben (ae, oe, ue, ss), drei bis sieben Wörter.

## Das Thema

Schreibe zum folgenden Thema. Den Arbeitstitel darfst du zu einer besseren Überschrift umformulieren, solange das Thema dasselbe bleibt.

`;

/** Haengt das konkrete Thema an den Auftragstext an. */
export function buildAuthorPrompt(opts: {
  title: string;
  angle: string;
  category: string;
  keywords: string[];
  existingTitles?: string[];
}): string {
  const lines = [
    `Arbeitstitel: ${opts.title}`,
    opts.angle ? `Worauf es hinauslaufen soll: ${opts.angle}` : '',
    `Kategorie: ${opts.category}`,
    opts.keywords.length > 0
      ? `Zielbegriffe: ${opts.keywords.join(', ')}`
      : '',
  ].filter(Boolean);

  let out = BLOG_AUTHOR_PROMPT + lines.join('\n');

  if (opts.existingTitles && opts.existingTitles.length > 0) {
    out +=
      '\n\nDiese Artikel gibt es schon. Schreibe etwas eigenständiges und wiederhole sie nicht:\n' +
      opts.existingTitles.map((t) => `- ${t}`).join('\n');
  }
  return out;
}

/** Aufbau der JSON-Antwort, die eingefuegt wird. */
export interface PastedArticle {
  title: string;
  slug: string;
  category?: string;
  excerpt: string;
  tldr: string;
  keyTakeaways?: string[];
  body: string;
  metaTitle: string;
  metaDescription: string;
  heroEmoji?: string;
  imagePrompt?: string;
  imageAlt?: string;
  targetKeywords?: string[];
  faq?: Array<{ question: string; answer: string }>;
}

/**
 * Entfernt Gedankenstriche aus allen Textfeldern. Absicherung fuer
 * den Fall, dass die Regel im Chat mal durchrutscht.
 */
export function sanitizeArticleText<T>(article: T): T {
  const fix = (s: string): string =>
    s.replace(/\s+[—–]\s+/g, ', ').replace(/[—–]/g, '-');

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

/**
 * Liest die eingefuegte Antwort. Verkraftet einen umschliessenden
 * Codeblock und Text drumherum, weil aus dem Chat gern mehr als nur
 * das JSON mitkopiert wird.
 */
export function parsePastedArticle(raw: string): {
  ok: true;
  data: PastedArticle;
} | { ok: false; error: string } {
  let text = raw.trim();
  if (!text) return { ok: false, error: 'Nichts eingefügt.' };

  // Codeblock-Auszeichnung entfernen, falls vorhanden.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  // Falls noch Text drumherum steht: vom ersten { bis zum letzten }.
  if (!text.startsWith('{')) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last === -1 || last < first) {
      return {
        ok: false,
        error:
          'Kein JSON gefunden. Kopiere die Antwort inklusive der geschweiften Klammern.',
      };
    }
    text = text.slice(first, last + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      error: `JSON ist fehlerhaft: ${(err as Error).message}`,
    };
  }

  const a = parsed as Partial<PastedArticle>;
  const missing = (['title', 'slug', 'excerpt', 'tldr', 'body'] as const).filter(
    (k) => !a[k] || typeof a[k] !== 'string' || !(a[k] as string).trim(),
  );
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Diese Felder fehlen oder sind leer: ${missing.join(', ')}`,
    };
  }

  return { ok: true, data: sanitizeArticleText(a as PastedArticle) };
}
