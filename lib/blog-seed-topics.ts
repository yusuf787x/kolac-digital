import type { BlogCategory } from './types';

/**
 * Start-Warteschlange fuer den Blog.
 *
 * Die ersten Themen decken die Fragen ab, die Interessenten vor einer
 * Anfrage tatsaechlich stellen, plus die Suchbegriffe, bei denen
 * Kolac Digital gefunden werden will. Reihenfolge nach erwartetem
 * Nutzen: was am ehesten zu Anfragen fuehrt, steht vorn.
 */
export interface SeedTopic {
  title: string;
  angle: string;
  category: BlogCategory;
  targetKeywords: string[];
}

export const SEED_BLOG_TOPICS: SeedTopic[] = [
  {
    title: 'Was kostet eine Webseite in Bielefeld?',
    angle:
      'Ehrliche Preisspanne nennen und erklaeren, wovon der Preis wirklich abhaengt. Baukasten, Freelancer und Agentur gegenueberstellen. Klar sagen, was bei uns ab 1.500 Euro drin ist und was ein Individualprojekt teurer macht.',
    category: 'Preise und Ablauf',
    targetKeywords: [
      'was kostet eine webseite',
      'webseite kosten bielefeld',
      'webagentur preise',
      'homepage erstellen lassen kosten',
      'webseite preis mittelstand',
    ],
  },
  {
    title: 'Baukasten oder individuelle Webseite: wann lohnt sich was?',
    angle:
      'Ehrlicher Vergleich. Klar sagen, fuer wen ein Baukasten voellig reicht und ab wann er im Weg steht. Entscheidungshilfe statt Verkaufstext.',
    category: 'Webseiten mit System',
    targetKeywords: [
      'baukasten oder eigene webseite',
      'wix jimdo vergleich agentur',
      'individuelle webseite lohnt sich',
      'homepage baukasten nachteile',
    ],
  },
  {
    title:
      'Webseite mit Buchungssystem: was ein Terminkalender wirklich koennen muss',
    angle:
      'Am Beispiel Praxis und Dienstleister zeigen, welche Funktionen im Alltag zaehlen und welche nur nett aussehen. Auf die Erfahrung mit Bacara Aesthetik stuetzen, wo ueber 800 Termine online gebucht wurden.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'webseite mit buchungssystem',
      'online terminbuchung praxis',
      'terminkalender webseite',
      'buchungssystem handwerk',
    ],
  },
  {
    title:
      'Angebote und Rechnungen digital: so sparst du dir den Papierkram',
    angle:
      'Konkret zeigen, welche Schritte im Betrieb automatisiert werden koennen und wie viel Zeit das spart. Anfrage, Angebot, Auftrag, Rechnung als durchgehende Kette denken.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'rechnungen digital handwerksbetrieb',
      'angebote digital erstellen',
      'papierkram sparen betrieb',
      'buero digitalisieren kleinbetrieb',
    ],
  },
  {
    title: 'Lokales SEO fuer Handwerker in OWL: was wirklich Anfragen bringt',
    angle:
      'Praktische Schritte statt Theorie. Google Business Profile, Bewertungen, saubere Seitenstruktur, echte Ortsbezuege. Ehrlich sagen, was lange dauert und was schnell wirkt.',
    category: 'SEO und Sichtbarkeit',
    targetKeywords: [
      'seo fuer handwerker',
      'lokales seo owl',
      'google business profile handwerk',
      'bei google gefunden werden bielefeld',
    ],
  },
  {
    title:
      'Google Ads fuer lokale Dienstleister: lohnt sich das bei kleinem Budget?',
    angle:
      'Realistische Einschaetzung, ab welchem Budget Ads sinnvoll sind und was vorher stehen muss. Klar sagen, dass Ads ohne funktionierende Webseite Geld verbrennen.',
    category: 'Google Ads',
    targetKeywords: [
      'google ads kleines budget',
      'google ads lokale dienstleister',
      'lohnt sich google ads handwerk',
      'google ads bielefeld',
    ],
  },
  {
    title: 'Fahrschule, Praxis, Werkstatt: was diese Betriebe online brauchen',
    angle:
      'Drei Branchen durchgehen und je zeigen, welche Funktionen wirklich zaehlen. Auf die eigenen Projekte Fahrschule Kreuzer, Bacara Aesthetik und CarHiFi Herford stuetzen.',
    category: 'Branchen',
    targetKeywords: [
      'webseite fuer fahrschule',
      'webseite fuer praxis',
      'webseite fuer werkstatt',
      'branchenwebseite erstellen',
    ],
  },
  {
    title: 'Wie lange dauert es, eine neue Webseite zu bekommen?',
    angle:
      'Realistischen Zeitplan zeigen, von der ersten Nachricht bis online. Erklaeren, woran es meistens haengt und was der Kunde selbst beschleunigen kann.',
    category: 'Preise und Ablauf',
    targetKeywords: [
      'wie lange dauert webseite erstellen',
      'webseite ablauf agentur',
      'neue homepage zeitplan',
    ],
  },
  {
    title:
      'Deine Webseite bringt keine Anfragen: die haeufigsten Gruende',
    angle:
      'Checkliste zum Selbstpruefen. Von unklarem Angebot ueber fehlende Kontaktmoeglichkeit bis zu langsamen Ladezeiten. Jeder Punkt mit einem konkreten Sofort-Tipp.',
    category: 'SEO und Sichtbarkeit',
    targetKeywords: [
      'webseite bringt keine anfragen',
      'webseite keine kunden',
      'homepage conversion verbessern',
      'warum kommen keine anfragen ueber die webseite',
    ],
  },
  {
    title:
      'Von ChatGPT gefunden werden: was Betriebe jetzt wissen sollten',
    angle:
      'Erklaeren, wie KI-Systeme Quellen auswaehlen und was eine Webseite dafuer braucht. Praktische Schritte, die auch ohne Technikwissen umsetzbar sind.',
    category: 'SEO und Sichtbarkeit',
    targetKeywords: [
      'von chatgpt gefunden werden',
      'ki suchmaschinen optimierung',
      'geo optimierung webseite',
      'google ai overviews unternehmen',
    ],
  },
];
