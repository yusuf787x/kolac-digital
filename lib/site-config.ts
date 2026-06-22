/**
 * Zentrale Konstanten der öffentlichen Marketing-Seite.
 *
 * Texte bewusst simpel gehalten. Keine Bindestriche oder Gedankenstriche
 * im Fließtext. Ausnahme: Eigennamen (Nordrhein-Westfalen, AF-Gebäudeservice
 * usw.) und E-Mail. Du-Form.
 */

export const site = {
  name: 'Kolac Digital',
  legalName: 'Kolac Digital',
  baseUrl: 'https://www.kolac-digital.de',
  email: 'yusuf@kolac-digital.de',
  phone: '+49 176 95762018',
  phoneE164: '+4917695762018',
  city: 'Bielefeld',
  region: 'Nordrhein-Westfalen',
  /** Wird nur in strukturierten Daten (JSON-LD) verwendet, nicht im sichtbaren Inhalt. */
  street: 'Beckhausstraße 108',
  zip: '33611',
  founder: 'Yusuf Kolac',
  googleReviewsUrl: 'https://share.google/wT7bMHxCV7NSDWkVp',
  rating: {
    value: 5.0,
    count: 7,
  },
  /** Bewusste Kapazitätsgrenze. Hormozi-Style Scarcity ohne Druck. */
  freeSlots: 4,
} as const;

// =====================================================================
// PAKETE / PREISE
// =====================================================================

export interface PackageTier {
  id: string;
  name: string;
  pricePrefix: string;
  priceMain: string;
  priceSub?: string;
  description: string;
  bullets: string[];
  highlight?: boolean;
  badge?: string;
  /** Schema.org Offer Preise */
  priceLow: number;
  priceCurrency: 'EUR';
}

/**
 * Nur die beiden Haupt-Pakete kommen in das Pricing-Raster. Die
 * Funktionsbausteine werden separat als Add-On präsentiert.
 */
export const packages: PackageTier[] = [
  {
    id: 'basis',
    name: 'Basis Webseite',
    pricePrefix: 'ab',
    priceMain: '1.500 €',
    priceSub: 'plus ab 99 € im Monat',
    description:
      'Eine moderne Webseite für deine Firma. Komplett für dich gebaut und sofort startklar.',
    bullets: [
      'Wir bauen alles individuell für dich',
      'Hohes Ranking bei Google und ChatGPT für relevante Suchbegriffe',
      'Hosting und Wartung sind dabei',
      'Kleine Änderungen jeden Monat inklusive',
      'Sieht auf Handy und PC top aus',
      'In der Regel in einer Woche live',
    ],
    badge: 'Empfohlen',
    highlight: true,
    priceLow: 1500,
    priceCurrency: 'EUR',
  },
  {
    id: 'individual',
    name: 'Individualprojekt',
    pricePrefix: 'ab',
    priceMain: '3.000 €',
    priceSub: 'je nach Umfang auch mehr',
    description:
      'Für alle die ein eigenes System brauchen. Mit Datenbank, eigener Logik und voller Verknüpfung.',
    bullets: [
      'Komplette eigene Software für dein Geschäft',
      'Übernahme der Daten aus deinem alten System',
      'Verbindung zu deinen Tools und Programmen',
      'Eigene Datenbank für deine Kunden und Aufträge',
      'Wir planen alles vorher gemeinsam',
    ],
    priceLow: 3000,
    priceCurrency: 'EUR',
  },
];

/** Add-On Funktionsbausteine. Wird separat angezeigt, nicht als drittes Paket. */
export const bausteinAddOn = {
  name: 'Funktionsbausteine',
  pricePrefix: 'ab',
  priceMain: '500 €',
  priceNote: 'on top zur Basis Webseite',
  description:
    'Du brauchst eine bestimmte Funktion zusätzlich? Wir bauen sie dir individuell oben drauf. Den genauen Preis besprechen wir nach deinem Bedarf.',
  examples: [
    { icon: '📅', label: 'Online Buchungsformular' },
    { icon: '🛒', label: 'Anbindung an deinen Shop' },
    { icon: '📆', label: 'Termin Kalender für Kunden' },
    { icon: '📧', label: 'Anfragen direkt ins Postfach' },
    { icon: '🔌', label: 'Anbindung an dein bestehendes System' },
    { icon: '💳', label: 'Online Zahlungen und Rechnungen' },
  ],
  /** Für Schema.org */
  priceLow: 500,
  priceCurrency: 'EUR' as const,
};

/** Boni die in jedem Webseiten-Paket dabei sind. Verkaufspsychologie. */
export interface IncludedBonus {
  icon: 'camera' | 'nfc' | 'seo' | 'ai';
  title: string;
  value: string;
  description: string;
}

export const includedBonuses: IncludedBonus[] = [
  {
    icon: 'camera',
    title: 'Professionelle Fotos für deine Firma',
    value: 'Wert ca. 600 €',
    description:
      'Bei jeder Webseite kommt ein Fotoshooting vor Ort dazu. Du bekommst hochwertige Bilder für deine Webseite, dein Google Profil und Social Media. Kein Stockfoto Look mehr.',
  },
  {
    icon: 'nfc',
    title: 'Google NFC Tag für mehr Bewertungen',
    value: 'Wert ca. 80 €',
    description:
      'Du bekommst ein Google NFC Tag von uns geschenkt. Kunde hält sein Handy dran, ist sofort auf deiner Bewertungsseite. Sammle Bewertungen ganz nebenbei, ohne fragen zu müssen.',
  },
  {
    icon: 'seo',
    title: 'SEO Optimierung von Anfang an',
    value: 'Wert ca. 500 €',
    description:
      'Hohes Ranking bei Google für relevante Suchbegriffe rund um dein Unternehmen, ohne dafür extra Werbegeld auszugeben. Wir bauen die Seite so, dass Suchmaschinen sie verstehen und vorne zeigen.',
  },
  {
    icon: 'ai',
    title: 'Auch von ChatGPT und KI Suchen gefunden',
    value: 'Neu im Jahr 2026',
    description:
      'Immer mehr Kunden fragen ChatGPT, Claude oder Google AI nach Empfehlungen. Wir bereiten deine Webseite so vor, dass die KI dich kennt und vorschlägt. Damit bist du den meisten voraus.',
  },
];

// =====================================================================
// REFERENZEN
// =====================================================================

export type MockupType = 'both' | 'browser' | 'phone';

export interface Reference {
  company: string;
  tag: string;
  mockupType: MockupType;
  mockupImage: string;
  mockupImagePhone?: string;
  services: string[];
  keyWin: string;
  link?: string;
  linkText?: string;
  linkIcon?: 'website' | 'shop' | 'app';
  socialLink?: string;
  socialLinkText?: string;
  socialIcon?: 'instagram' | 'tiktok';
}

export const references: Reference[] = [
  {
    company: 'Bacara Ästhetik',
    tag: 'Webseite und Social Media',
    mockupType: 'both',
    mockupImage: '/images/bacara-website.webp',
    mockupImagePhone: '/images/bacara-social.webp',
    services: [
      'Webseite mit Onlinebuchungssystem',
      'Sprechstundenzeiten in Echtzeit gepflegt',
      'Automatische Rechnungsstellung',
      'Kundengewinnung durch Social Media',
    ],
    keyWin: '800+ Termine gebucht über die Webseite. Tendenz steigend.',
    link: 'https://www.bacara-aesthetik.de',
    linkText: 'Website ansehen',
    linkIcon: 'website',
    socialLink: 'https://www.instagram.com/bacaraasthetik/?hl=de',
    socialLinkText: 'Instagram ansehen',
    socialIcon: 'instagram',
  },
  {
    company: 'CarHiFi Herford',
    tag: 'Webseite und Social Media',
    mockupType: 'both',
    mockupImage: '/images/carhifi-herford-website.webp',
    mockupImagePhone: '/images/halim-tiktok.webp',
    services: [
      'Webseite mit eigenem CMS',
      'Konfigurator für Soundanlagen',
      'TikTok Strategie und Umsetzung',
    ],
    keyWin: 'Leadgenerierung plus 74 Prozent. Dazu starkes Abonnenten Wachstum.',
    link: 'https://www.carhifi-herford.de',
    linkText: 'Website ansehen',
    linkIcon: 'website',
    socialLink: 'https://www.tiktok.com/@carhifi.herford',
    socialLinkText: 'TikTok ansehen',
    socialIcon: 'tiktok',
  },
  {
    company: 'Mironi',
    tag: 'Onlineshop und Marketing',
    mockupType: 'browser',
    mockupImage: '/images/mironi-website.webp',
    services: [
      'Shop mit Bestellstatus per E-Mail',
      'Automatische Mailkampagnen',
      'Google Ads, Meta Ads und Social Media',
    ],
    keyWin:
      'Marketing komplett ausgelagert. Mehr Zeit fürs Wesentliche, weniger Stress.',
    link: 'https://mironi.de',
    linkText: 'Shop ansehen',
    linkIcon: 'shop',
  },
  {
    company: 'AF Gebäudeservice',
    tag: 'Webseite und Digitalisierung',
    mockupType: 'browser',
    mockupImage: '/images/AF-Gebäudeservice.webp',
    services: [
      'Professioneller Webauftritt von Grund auf',
      'Digitales Anfrage und Angebotsformular',
      'Google My Business Optimierung',
      'Lokale SEO und sauberer Aufbau',
    ],
    keyWin:
      'Anfragen kommen jetzt digital rein. Kein verpasster Auftrag mehr durch fehlende Erreichbarkeit.',
    link: 'https://www.af-gebaeudeservice.de',
    linkText: 'Website ansehen',
    linkIcon: 'website',
  },
];

// =====================================================================
// GOOGLE REVIEWS
// =====================================================================

export interface Review {
  author: string;
  date: string;
  text: string;
  rating: number;
}

export const reviewHighlights: Review[] = [
  {
    author: 'Bugrahan Bacara',
    date: 'vor 2 Wochen',
    rating: 5,
    text:
      'Sehr professionell, wirklich perfekt abgestimmt auf Bedürfnisse, langfristige Betreuung und allen Anforderungen mehr als gerecht geworden. Als Arztpraxis wurde hier alles mit Bravur durchgeführt. Wir sind sehr zufrieden, vielen Dank!',
  },
  {
    author: 'Kaan',
    date: 'vor 2 Wochen',
    rating: 5,
    text:
      'Kolac Digital hat unsere Erwartungen ehrlich gesagt übertroffen. Von der ersten Beratung bis zur Umsetzung lief alles strukturiert und professionell ab. Man merkt, dass hier nicht nur Fachwissen vorhanden ist, sondern auch echtes Interesse daran, das Unternehmen des Kunden voranzubringen. Die Erreichbarkeit, die Qualität der Arbeit und die schnelle Umsetzung waren top. Würde jederzeit wieder mit dem Team zusammenarbeiten.',
  },
  {
    author: 'Martin Koebe',
    date: 'vor 2 Wochen',
    rating: 5,
    text:
      'Die Zusammenarbeit war von Anfang an professionell und unkompliziert. Unsere Wünsche wurden schnell verstanden und kreativ umgesetzt, sodass wir mit dem Ergebnis sehr zufrieden sind. Besonders hervorzuheben ist Herr Kolac gute Kommunikation und die zuverlässige Umsetzung des Projekts. Jederzeit gerne wieder.',
  },
  {
    author: 'may52',
    date: 'vor 2 Wochen',
    rating: 5,
    text:
      'Wir können Kolac Digital absolut weiterempfehlen. Von der Webseitenerstellung bis zum Social-Media-Marketing wurden wir professionell und zuverlässig betreut. Besonders überzeugt haben uns die schnelle Erreichbarkeit, kreative Ideen und die angenehme Zusammenarbeit. Vielen Dank an Herrn Kolac und sein Team!',
  },
];

// =====================================================================
// FAQ
// =====================================================================

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  {
    question: 'Was kostet eine Webseite bei euch?',
    answer:
      'Eine Basis Webseite startet ab 1.500 € Einrichtung plus ab 99 € im Monat. Im Monatspreis sind Hosting, Wartung und kleine Änderungen direkt mit drin. Du musst dir also nicht für jede Kleinigkeit Sorgen um eine extra Rechnung machen. Den Monatsbeitrag startest du außerdem erst, wenn deine Seite live ist und du grünes Licht gibst. Bis dahin gehst du nicht in Vorleistung. Wenn dein Projekt größer ist, sage ich dir vorher genau was es kostet. Du bekommst nie eine Überraschung auf der Rechnung.',
  },
  {
    question: 'Wie lange dauert das?',
    answer:
      'Eine Basis Webseite ist ab dem ersten Kontaktpunkt in der Regel in einer Woche fertig und live. Je nach Auslastung kann das auch mal zwei Wochen dauern. Das klären wir im Gespräch, weil Transparenz für uns wichtig ist. Bei größeren Projekten mit Datenbank oder eigenen Funktionen brauchen wir ein paar Wochen mehr. Wir setzen uns einmal kurz zusammen und planen den Ablauf gemeinsam.',
  },
  {
    question: 'Kann ich meine alten Daten und Inhalte mitnehmen?',
    answer:
      'Ja, das machen wir fast immer. Egal ob alte Webseite, alter Onlineshop oder ein Programm das du seit Jahren nutzt. Ich übernehme deine Texte, Bilder, Kundendaten und alles was du behalten möchtest. So fängst du nicht bei Null an und verlierst nichts. Wenn du willst, baue ich auch eine Verbindung zu deinem alten System, damit beides weiterläuft.',
  },
  {
    question: 'Warum nehmt ihr nur 4 Kunden parallel an?',
    answer:
      'Damit wir uns auf jedes Projekt voll konzentrieren können. Wir wollen, dass du in einer Woche live gehst und nicht in einer Warteschlange landest. Wenn die vier Plätze vergeben sind, machen wir die Tür zu und nehmen erst wieder Anfragen an, wenn ein Platz frei wird. Lieber wenige Projekte richtig gut, als viele halbherzig.',
  },
  {
    question: 'Arbeitet ihr nur in OWL oder auch deutschlandweit?',
    answer:
      'Ich arbeite deutschlandweit. Über die Hälfte meiner Kunden sehe ich nie persönlich. Wir treffen uns online über Video Call und alles läuft trotzdem reibungslos. Wenn du persönlich Hand schütteln möchtest und in OWL sitzt, komme ich gerne vorbei.',
  },
  {
    question: 'Bekomme ich wirklich kostenlose professionelle Fotos dazu?',
    answer:
      'Ja. Bei jedem Webseiten Paket kommt ein Fototermin bei dir vor Ort dazu. Wir bringen die Kamera mit und fotografieren dein Team, deine Räume und deine Produkte. Die fertigen Bilder darfst du komplett behalten und auch außerhalb der Webseite nutzen, zum Beispiel für Google, Instagram oder Flyer. Falls du außerhalb von OWL sitzt, sprechen wir kurz über die Anfahrt. Du musst dir kein extra Fotoshooting für 500 € oder mehr buchen.',
  },
  {
    question: 'Was bringt mir das Google NFC Tag genau?',
    answer:
      'Das NFC Tag ist eine kleine Plakette für deinen Tresen oder dein Auto. Dein Kunde hält sein Handy einmal dran und landet sofort auf deiner Google Bewertungsseite. Keine Suche, kein Eintippen. Mehr Bewertungen bedeuten bei Google ein besseres Ranking und mehr Vertrauen bei neuen Kunden. Das Tag bekommst du von uns geschenkt, wenn du eine Webseite bei uns baust.',
  },
  {
    question: 'Werde ich bei Google und auch bei ChatGPT gefunden?',
    answer:
      'Genau dafür sorgen wir. Wir bauen deine Seite technisch so, dass Google sie leicht lesen kann und für relevante Suchbegriffe rund um dein Geschäft weit oben zeigt. Zusätzlich bereiten wir die Inhalte für die neuen KI Suchmaschinen wie ChatGPT, Claude und Google AI vor. Diese Systeme empfehlen immer öfter Firmen direkt im Chat, ohne dass jemand klassisch googelt. Wer dafür bereit ist, hat einen riesigen Vorsprung.',
  },
  {
    question: 'Was passiert wenn nach dem Start etwas nicht klappt?',
    answer:
      'Ich kümmere mich. Hosting, Wartung und kleine Anpassungen sind im Monatspreis schon dabei. Du brauchst keinen extra Techniker und keinen Vertrag mit einem dritten Anbieter. Wenn du anrufst, gehe ich selbst ran. Du sprichst direkt mit der Person die deine Webseite kennt und gebaut hat. Das spart Zeit und Nerven.',
  },
  {
    question: 'Wie geht es weiter wenn ich das Formular abschicke?',
    answer:
      'Ich melde mich innerhalb von 24 Stunden bei dir, in der Regel deutlich schneller. Wir reden in Ruhe am Telefon über dein Projekt, was du brauchst und was möglich ist. Dieses Gespräch ist komplett kostenlos und du musst danach nichts kaufen. Erst wenn du sagst, lass uns das machen, geht es weiter. Du hast also nichts zu verlieren.',
  },
];

// =====================================================================
// SERVICE-REGIONEN
// =====================================================================

export const serviceAreas = [
  'Bielefeld',
  'Herford',
  'Gütersloh',
  'Paderborn',
  'Detmold',
  'Minden',
  'Lippstadt',
  'Münster',
  'Dortmund',
  'OWL',
  'Nordrhein-Westfalen',
  'Deutschland',
];

// =====================================================================
// BRANCHEN (für SEO: long-tail Suchbegriffe wie
// "Webseite für Handwerker", "Webseite für Restaurants" usw.)
// =====================================================================

export interface IndustrySegment {
  icon: string;
  /** Wird als h3 verwendet und enthält das Such-Keyword. */
  title: string;
  description: string;
}

export const industries: IndustrySegment[] = [
  {
    icon: '🔧',
    title: 'Webseite für Handwerker und Bauunternehmen',
    description:
      'Anfragen mit Foto und Adresse direkt aufs Tablet. Angebote in zwei Klicks raus. Kunden sehen wann du Zeit hast.',
  },
  {
    icon: '🍽️',
    title: 'Webseite für Restaurants und Cafés',
    description:
      'Interaktive Speisekarte mit eigener Bestellfunktion. Du sparst die Plattform-Gebühr und behältst den vollen Umsatz.',
  },
  {
    icon: '🩺',
    title: 'Webseite für Praxen und Kanzleien',
    description:
      'Online Terminbuchung mit Live-Update der Sprechzeiten. Patientenanfragen sortiert im Backend. Weniger Telefon, mehr Zeit am Patienten.',
  },
  {
    icon: '🛒',
    title: 'Webseite für Onlineshops und Händler',
    description:
      'Shop mit automatischen Bestellstatus-Mails. Anbindung an dein Warenwirtschaftssystem. Verkaufs-Dashboard für den Überblick.',
  },
  {
    icon: '💇',
    title: 'Webseite für Friseure und Beauty',
    description:
      'Salon-Buchungssystem auf dem Tablet. Kunden buchen selbst. Du siehst auf einen Blick was heute ansteht.',
  },
  {
    icon: '🎯',
    title: 'Webseite für Coaches und Berater',
    description:
      'Verkaufsseite mit klarem Angebot. Buchungssystem für Erstgespräche. Automatische Onboarding-Mails an neue Kunden.',
  },
];
