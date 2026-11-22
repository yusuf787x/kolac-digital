/**
 * Werbe-Funnel rund um den SEO-Check: Branchen-Varianten der Seite,
 * Auswahlfelder im Freischalt-Formular, Herkunft aus Anzeigen und das
 * Verkaufsvideo auf der Ergebnis-Seite. Von Server und Client genutzt.
 */

export type Branche =
  | 'autohaus'
  | 'werkstatt'
  | 'aufbereitung'
  | 'makler'
  | 'treppenlift'
  | 'gebaeudereinigung'
  | 'hoerakustik'
  | 'andere';
export type WebsiteAlter = 'unter-1' | '1-3' | 'laenger';

export const BRANCHEN: { value: Branche; label: string }[] = [
  { value: 'autohaus', label: 'Autohaus' },
  { value: 'werkstatt', label: 'Werkstatt' },
  { value: 'aufbereitung', label: 'Fahrzeugaufbereitung' },
  { value: 'makler', label: 'Immobilienmakler' },
  { value: 'treppenlift', label: 'Treppenlift' },
  { value: 'gebaeudereinigung', label: 'Gebäudereinigung' },
  { value: 'hoerakustik', label: 'Hörakustik' },
  { value: 'andere', label: 'Andere Branche' },
];

export const WEBSITE_ALTER: { value: WebsiteAlter; label: string }[] = [
  { value: 'unter-1', label: 'Unter 1 Jahr' },
  { value: '1-3', label: '1 bis 3 Jahre' },
  { value: 'laenger', label: 'Länger' },
];

export function brancheLabel(v?: string): string {
  return BRANCHEN.find((b) => b.value === v)?.label ?? 'nicht angegeben';
}

export function websiteAlterLabel(v?: string): string {
  return WEBSITE_ALTER.find((b) => b.value === v)?.label ?? 'nicht angegeben';
}

/**
 * Verkaufsvideos (VSL) unter dem freigeschalteten Ergebnis, je Branche eins.
 * Selbst gehostet als HLS-Stream (public/videos/vsl/<slug>/, je 360p, 540p,
 * 720p), damit es bei jeder Verbindung sofort läuft und keine fremden
 * Cookies laden. Erzeugt aus kolac-content/6-werbung/verkaufsvideos/
 * (zsh scripts/vsl-hls.sh). Branche ohne Eintrag = kein Video.
 */
export const VSL_VIDEOS: Record<string, { src: string; poster: string }> = Object.fromEntries(
  ['treppenlift', 'gebaeudereinigung', 'hoerakustik', 'autohaus'].map((slug) => [
    slug,
    { src: `/videos/vsl/${slug}/master.m3u8`, poster: `/videos/vsl/${slug}/poster.jpg` },
  ]),
);

/** Terminbuchung für Besucher der Branchen-Check-Seiten (eigener Google-Kalender-Termin). */
export const FUNNEL_MEETING_URL = 'https://calendar.app.google/kTXDDn2FSknRsFbU7';

/**
 * NFC-Bewertungs-Aufsteller, die Yusuf noch auf Lager hat (echte Knappheit,
 * Stand 21.11.2026). Auf den Branchen-Seiten steht „Die ersten X Betriebe
 * bekommen …“. Bei 0 wird der Satz ausgeblendet.
 */
export const NFC_AUFSTELLER_VORRAT = 20;

/*
 * Das Häkchen „Erfolgsmessung an Meta“ erscheint nur, wenn Pixel-ID und
 * Conversions-API-Schlüssel gesetzt sind (lib/seo-check/meta-server.ts,
 * Prop measureEnabled an SeoCheckClient).
 */

/** Herkunft eines Besuchers aus einer Anzeige (aus der URL, kein Cookie). */
export interface LeadSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  fbclid?: string;
  /** Seite, auf der der Check gestartet wurde, z. B. /seo-check/werkstatt. */
  landing?: string;
}

const SOURCE_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'landing'] as const;

/** Nimmt nur bekannte Felder als kurze Texte an. Leer = undefined. */
export function cleanSource(raw: unknown): LeadSource | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: LeadSource = {};
  for (const k of SOURCE_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 200);
  }
  return Object.keys(out).length ? out : undefined;
}

export interface FunnelVariant {
  slug: string;
  /** Kleine Zeile über der Überschrift. */
  eyebrow: string;
  title: string;
  subline: string;
  defaultBranche: Branche;
  metaTitle: string;
  metaDescription: string;
  closingTitle: string;
  closingText: string;
  /** Ja-Fragen im Abschnitt „Kommt dir das bekannt vor?“. */
  symptoms: string[];
  /** Kurzer Satz im Über-mich-Abschnitt, auf die Branche gemünzt. */
  aboutLine: string;
  /** Kurzname für Mail-Betreffs an Yusuf, z. B. „Werkstatt-Seite“. */
  pageLabel: string;
  /** Fazit unter den Ja-Fragen. Leer = Standardsatz. */
  symptomsFazit?: string;
  /** Eigene drei Gründe-Karten. Leer = Standardkarten. */
  reasons?: Array<[string, string, string]>;
  /** Zusätzlicher Branchen-Beleg im Abschnitt „Dass es anders geht“. */
  proof?: 'kfz';
  /** Eigener Text zum NFC-Aufsteller nach „Die ersten X Betriebe bekommen“. Leer = Text mit Theke. */
  nfcText?: string;
  /** Seite wird deutschlandweit beworben: kein OWL im Über-mich-Text, Hinweis auf Gespräche per Video. */
  nationwide?: boolean;
}

/** Kurzname der Einstiegsseite aus dem Pfad, z. B. /seo-check/treppenlift → „Treppenlift-Seite“. */
export function landingPageLabel(landing?: string): string {
  const slug = (landing ?? '').split('?')[0].match(/\/seo-check\/([a-z-]+)/)?.[1];
  return (slug && FUNNEL_VARIANTS[slug]?.pageLabel) || 'SEO-Check-Seite';
}

const PROFIL_KARTE: [string, string, string] = [
  '02',
  'Google-Profil halb ausgefüllt',
  'Dein Google-Profil ist dein Eintrag bei Google Maps. Wer dort oben steht, bekommt die Anrufe. Fehlen Kategorien, Fotos und Bewertungen, stehen andere vor dir.',
];

const SUBLINE =
  'Gib deine Website ein. In 30 Sekunden siehst du, für welche Suchbegriffe Google dich zeigt, also bei welchen Suchen deine Kunden dich finden.';
const CLOSING_TEXT =
  'Von der Website bis zur Sichtbarkeit bei Google: Wir gehen dein Ergebnis gemeinsam durch und prüfen, ob wir dir helfen können. Kostenlos und unverbindlich.';

export const FUNNEL_VARIANTS: Record<string, FunnelVariant> = {
  werkstatt: {
    slug: 'werkstatt',
    eyebrow: 'Kostenloser Website-Check für Kfz-Betriebe',
    title: 'Werkstätten in OWL: Findet Google deine Website?',
    subline: SUBLINE,
    defaultBranche: 'werkstatt',
    metaTitle: 'Kostenloser Website-Check für Werkstätten in OWL | Kolac Digital',
    metaDescription: 'Findet Google deine Werkstatt? Kostenloser Website-Check in rund 30 Sekunden.',
    closingTitle: 'Soll ich mir das mit dir ansehen?',
    closingText: CLOSING_TEXT,
    symptoms: [
      'Neue Kunden kommen fast nur über Empfehlung.',
      'Eine Werkstatt, die schlechter arbeitet, steht bei Google vor dir.',
      'Deine Website gibt es seit Jahren, aber angerufen hat darüber kaum jemand.',
      'Bei Google Maps bist du nicht unter den ersten drei.',
      'Du weißt eigentlich nicht, ob deine Website überhaupt etwas bringt.',
    ],
    aboutLine: 'Mehrere meiner Kunden sind Kfz-Betriebe aus OWL. Ich weiß also ziemlich genau, wonach eure Kunden suchen.',
    pageLabel: 'Werkstatt-Seite',
    proof: 'kfz',
  },
  makler: {
    slug: 'makler',
    eyebrow: 'Kostenloser Website-Check für Immobilienmakler',
    title: 'Makler in OWL: Findet ein Eigentümer dich bei Google?',
    subline: SUBLINE,
    defaultBranche: 'makler',
    metaTitle: 'Kostenloser Website-Check für Makler in OWL | Kolac Digital',
    metaDescription: 'Findet ein Eigentümer dich bei Google? Kostenloser Website-Check in rund 30 Sekunden.',
    closingTitle: 'Soll ich mir das mit dir ansehen?',
    closingText: CLOSING_TEXT,
    symptoms: [
      'Eigentümer kommen fast nur über Empfehlung.',
      'Wer „Haus verkaufen“ in deiner Stadt sucht, landet bei den großen Portalen.',
      'Deine Website gibt es seit Jahren, aber ein Verkaufsauftrag kam darüber noch nicht rein.',
      'Für Portale zahlst du jeden Monat, und die Anfragen gehören dir trotzdem nicht.',
    ],
    aboutLine: 'Ein einziger Verkaufsauftrag mehr im Jahr ist für einen Makler viel wert. Genau dafür muss dich ein Eigentümer bei Google finden.',
    pageLabel: 'Makler-Seite',
  },
  treppenlift: {
    slug: 'treppenlift',
    eyebrow: 'Kostenloser Website-Check für Treppenlift-Händler',
    title: 'Treppenlift-Händler: Fragen Kunden bei dir an oder beim Portal?',
    subline: SUBLINE,
    defaultBranche: 'treppenlift',
    metaTitle: 'Kostenloser Website-Check für Treppenlift-Händler | Kolac Digital',
    metaDescription: 'Fragen Kunden bei dir an oder beim Portal? Kostenloser Website-Check in rund 30 Sekunden.',
    closingTitle: 'Soll ich mir das mit dir ansehen?',
    closingText: CLOSING_TEXT,
    symptoms: [
      'Gekaufte Anfragen landen gleichzeitig auch bei anderen Firmen.',
      'Wer „Treppenlift“ in deiner Stadt sucht, findet zuerst Vergleichsportale.',
      'Die Kinder suchen für ihre Eltern bei Google und landen nicht bei dir.',
      'Deine Website gibt es seit Jahren, aber Anfragen kommen darüber kaum.',
      'Ohne gekaufte Anfragen wäre der Kalender ziemlich leer.',
    ],
    symptomsFazit: 'Das sind keine einzelnen Probleme. Google zeigt deine Website nicht, also landen die Anfragen woanders.',
    reasons: [
      ['01', 'Eine Seite für alles', 'Sitzlift, Plattformlift, Kurvenlift, Zuschüsse: alles auf einer Seite. Google weiß dann nicht, wofür du gefunden werden willst.'],
      PROFIL_KARTE,
      ['03', 'Keine Antworten auf die Fragen der Familien', 'Was kostet das, gibt es Zuschüsse, wie schnell geht der Einbau? Wer diese Fragen nicht beantwortet, wird bei Google nicht gefunden.'],
    ],
    aboutLine: 'Treppenlift-Anfragen kommen oft von den Kindern, die für ihre Eltern suchen. Genau die müssen dich bei Google finden, nicht das nächste Portal.',
    pageLabel: 'Treppenlift-Seite',
    nfcText: 'einen NFC-Bewertungs-Aufsteller, mit dem deine Kunden dich mit einem Handgriff bei Google bewerten.',
    nationwide: true,
  },
  gebaeudereinigung: {
    slug: 'gebaeudereinigung',
    eyebrow: 'Kostenloser Website-Check für Gebäudereinigungen',
    title: 'Gebäudereinigung: Findet dich eine Firma, die eine neue Reinigung sucht?',
    subline: SUBLINE,
    defaultBranche: 'gebaeudereinigung',
    metaTitle: 'Kostenloser Website-Check für Gebäudereinigungen | Kolac Digital',
    metaDescription: 'Findet dich eine Firma, die eine neue Reinigung sucht? Kostenloser Website-Check in rund 30 Sekunden.',
    closingTitle: 'Soll ich mir das mit dir ansehen?',
    closingText: CLOSING_TEXT,
    symptoms: [
      'Neue Aufträge kommen fast nur über Empfehlung oder Kaltakquise.',
      'Wer „Büroreinigung“ in deiner Stadt sucht, findet die Konkurrenz.',
      'Du hättest Platz für weitere Objekte, aber es fehlen die Anfragen.',
      'Deine Website gibt es seit Jahren, aber ein Dauerauftrag kam darüber noch nicht.',
      'Anrufe gehen verloren, wenn du gerade selbst im Objekt bist.',
    ],
    symptomsFazit: 'Das sind keine einzelnen Probleme. Firmen suchen ihre Reinigung bei Google, und dort tauchst du nicht auf.',
    reasons: [
      ['01', 'Eine Seite für alles', 'Unterhaltsreinigung, Glasreinigung, Treppenhaus: alles auf einer Seite. Google weiß dann nicht, wofür du gefunden werden willst.'],
      PROFIL_KARTE,
      ['03', 'Kein einfacher Weg zur Anfrage', 'Wer ein Angebot will, muss anrufen. Bist du gerade im Objekt, ruft er beim Nächsten an.'],
    ],
    aboutLine: 'Ein einziger Dauerauftrag läuft oft über Jahre. Genau deshalb muss dich eine Firma finden, die gerade eine neue Reinigung sucht.',
    pageLabel: 'Gebäudereinigung-Seite',
    nfcText: 'einen NFC-Bewertungs-Aufsteller, mit dem deine Kunden dich mit einem Handgriff bei Google bewerten.',
    nationwide: true,
  },
  hoerakustik: {
    slug: 'hoerakustik',
    eyebrow: 'Kostenloser Website-Check für Hörakustiker',
    title: 'Hörakustiker: Wer „Hörgeräte“ in deiner Stadt googelt, landet bei den Ketten?',
    subline: SUBLINE,
    defaultBranche: 'hoerakustik',
    metaTitle: 'Kostenloser Website-Check für Hörakustiker | Kolac Digital',
    metaDescription: 'Findet man deinen Laden bei Google oder nur die Ketten? Kostenloser Website-Check in rund 30 Sekunden.',
    closingTitle: 'Soll ich mir das mit dir ansehen?',
    closingText: CLOSING_TEXT,
    symptoms: [
      'Bei Google stehen die großen Ketten vor dir, obwohl du persönlich berätst.',
      'Onlinehändler werben mit niedrigen Preisen und tauchen überall auf.',
      'Neue Kunden kommen fast nur über Ärzte oder Empfehlung.',
      'Deine Website gibt es seit Jahren, aber Termine kommen darüber kaum.',
      'Bei Google Maps bist du nicht unter den ersten drei.',
    ],
    symptomsFazit: 'Das sind keine einzelnen Probleme. Google zeigt deinen Laden einfach nicht, und die Kunden gehen zu den Großen.',
    reasons: [
      ['01', 'Eine Seite für alles', 'Beratung, Hörtest, Gehörschutz, Zubehör: alles auf einer Seite. Google weiß dann nicht, wofür du gefunden werden willst.'],
      PROFIL_KARTE,
      ['03', 'Seit Jahren nichts Neues', 'Kommt nie etwas dazu, wirkt deine Seite für Google wie ein Laden, der zu hat.'],
    ],
    aboutLine: 'Gegen die Werbebudgets der Ketten gewinnst du nicht mit mehr Geld, sondern damit, dass man dich vor Ort bei Google findet.',
    pageLabel: 'Hörakustik-Seite',
    nationwide: true,
  },
  autohaus: {
    slug: 'autohaus',
    eyebrow: 'Kostenloser Website-Check für Autohäuser',
    title: 'Autohäuser: Wer „Auto verkaufen“ in deiner Stadt googelt, landet bei den Ankaufportalen?',
    subline: SUBLINE,
    defaultBranche: 'autohaus',
    metaTitle: 'Kostenloser Website-Check für Autohäuser | Kolac Digital',
    metaDescription: 'Landen deine Kunden bei den Ankaufportalen statt bei dir? Kostenloser Website-Check in rund 30 Sekunden.',
    closingTitle: 'Soll ich mir das mit dir ansehen?',
    closingText: CLOSING_TEXT,
    symptoms: [
      'Wer sein Auto verkaufen will, landet bei den großen Ankaufportalen statt bei dir.',
      'Die Herstellerseite ist schick, aber bei Suchen in deiner Stadt taucht ihr kaum auf.',
      'Werkstatt- und Service-Anfragen gehen an Ketten und andere Werkstätten.',
      'Jede Anfrage über die Fahrzeugbörsen kostet dich extra.',
      'Du weißt nicht, wie viele Anfragen eure Website im Monat wirklich bringt.',
    ],
    symptomsFazit: 'Das sind keine einzelnen Probleme. Bei Suchen in deiner Stadt zeigt Google euer Autohaus einfach nicht vorne.',
    reasons: [
      ['01', 'Eine Seite für alles', 'Neuwagen, Gebrauchtwagen, Ankauf, Werkstatt: alles auf einer Seite. Google weiß dann nicht, wofür ihr gefunden werden wollt.'],
      PROFIL_KARTE,
      ['03', 'Nur die Herstellerseite', 'Die Herstellerseite ist für die Marke gebaut, nicht für Suchen wie „Auto verkaufen“ oder „Inspektion“ in deiner Stadt.'],
    ],
    aboutLine: 'Mehrere meiner Kunden kommen aus dem Kfz-Bereich, vom Autoankauf bis zur Motoreninstandsetzung. Ich weiß also ziemlich genau, wonach eure Kunden suchen.',
    pageLabel: 'Autohaus-Seite',
    proof: 'kfz',
    nationwide: true,
  },
};
