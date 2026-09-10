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
    title: 'Wovon der Preis einer Webseite wirklich abhaengt',
    angle:
      'Die Faktoren erklaeren, die den Preis bestimmen: Seitenzahl, Funktionen wie Terminbuchung oder Kundenverwaltung, Datenuebernahme, Anbindung an vorhandene Programme. Baukasten, Freelancer und Agentur gegenueberstellen. WICHTIG: keine eigenen Zahlen oder Spannen nennen, sondern auf das kostenlose Erstgespraech mit festem Angebot verweisen.',
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
  {
    title: 'Jeder verpasste Anruf kostet dich einen Auftrag',
    angle:
      'Zeigen, was Erreichbarkeit im Alltag wirklich bedeutet. Reaktionszeit, Rueckrufquote, warum Anfragende beim Zweiten landen. Fuehrt zur digitalen Anfragestrecke, Beispiel AF-Gebaeudeservice.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'handwerker erreichbarkeit anfragen',
      'verpasste anrufe kunden verlieren',
      'anfragen nicht verpassen betrieb',
      'rueckrufquote handwerk',
    ],
  },
  {
    title:
      'Excel, WhatsApp und ein Zettel: wie viele Tools braucht ein Kleinbetrieb wirklich?',
    angle:
      'Ehrliche Antwort geben: manche brauchen nur drei. Zeigen, ab wann ein verbundenes System guenstiger ist als fuenf einzelne Abos. Nicht pauschal zum Umstieg raten.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'kundenverwaltung kleinbetrieb',
      'excel kundendaten grenzen',
      'tools handwerksbetrieb',
      'crm kleines unternehmen noetig',
    ],
  },
  {
    title: 'Wo deine Woche wirklich hingeht: 7 Tage Zeitprotokoll fuer Selbststaendige',
    angle:
      'Anleitung zum Selbstmessen, danach Entscheidungshilfe, was sich zu automatisieren lohnt. Sehr wenig Verkaufsdruck, dafuer gut weiterzugeben.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'zeitprotokoll selbststaendige',
      'wo geht meine zeit hin',
      'zeitfresser betrieb finden',
      'arbeitszeit analysieren kleinbetrieb',
    ],
  },
  {
    title: 'Wenn alles an dir haengt: welche Ablaeufe du zuerst aus dem Kopf bekommst',
    angle:
      'Kein Technikartikel, sondern Reihenfolge und Entlastung. Was zuerst dokumentiert, was zuerst automatisiert gehoert und was ruhig im Kopf bleiben darf.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'alles haengt an mir selbststaendig',
      'ablaeufe dokumentieren kleinbetrieb',
      'aufgaben abgeben unternehmer',
    ],
  },
  {
    title: 'Cookie-Banner, Kontaktformular, Google Fonts: was du wirklich brauchst',
    angle:
      'Mit dem Halbwissen im Markt aufraeumen. WICHTIG: nur den gesicherten Stand wiedergeben, im Zweifel allgemein formulieren und am Ende klar auf anwaltliche Pruefung verweisen. Keine Rechtsberatung vortaeuschen.',
    category: 'Webseiten mit System',
    targetKeywords: [
      'dsgvo webseite kleinunternehmen',
      'cookie banner pflicht',
      'google fonts lokal einbinden',
      'kontaktformular dsgvo konform',
    ],
  },
  {
    title: 'Barrierefreie Webseite: betrifft das deinen Betrieb?',
    angle:
      'Das Barrierefreiheitsstaerkungsgesetz einordnen und die Ausnahme fuer Kleinstunternehmen erklaeren. WICHTIG: Fristen, Schwellenwerte und Geltungsbereich vor dem Schreiben pruefen, nichts aus dem Gedaechtnis behaupten. Am Ende auf fachliche Pruefung verweisen.',
    category: 'Webseiten mit System',
    targetKeywords: [
      'barrierefreie webseite pflicht',
      'bfsg kleinunternehmen',
      'barrierefreiheit webseite handwerk',
    ],
  },
  {
    title: 'Impressum, Datenschutz, Abmahnung: die Rechtstexte fuer kleine Betriebe',
    angle:
      'Praktisch erklaeren, was in die Pflichttexte gehoert und wo die Grenze zur Rechtsberatung liegt. WICHTIG: klar auf Anwalt oder Fachdienst verweisen, keine fertigen Textbausteine als rechtssicher ausgeben.',
    category: 'Webseiten mit System',
    targetKeywords: [
      'impressum pflichtangaben kleinunternehmen',
      'datenschutzerklaerung webseite betrieb',
      'abmahnung webseite vermeiden',
    ],
  },
  {
    title: 'Wem gehoert deine Webseite eigentlich?',
    angle:
      'Domain, Quellcode, Zugaenge, Hosting. Was passiert, wenn der Dienstleister nicht mehr erreichbar ist. Ehrlich sagen, worauf man beim Vertrag achten sollte, und dass bei uns die Zugaenge beim Kunden liegen.',
    category: 'Preise und Ablauf',
    targetKeywords: [
      'wem gehoert die webseite',
      'domain uebertragen agentur',
      'zugangsdaten webseite dienstleister',
      'webseite mitnehmen agenturwechsel',
    ],
  },
  {
    title: 'Mitarbeiter ueber die eigene Webseite finden',
    angle:
      'Karriereseite, ehrliche Stellenanzeige, Bewerbung ohne Anschreiben in zwei Minuten. Zeigen, warum die eigene Seite oft besser funktioniert als Portale.',
    category: 'Branchen',
    targetKeywords: [
      'mitarbeiter finden handwerk',
      'karriereseite kleiner betrieb',
      'stellenanzeige eigene webseite',
      'bewerber gewinnen handwerksbetrieb',
    ],
  },
  {
    title: 'Google-Bewertungen bekommen, ohne zu betteln',
    angle:
      'Ein System dafuer beschreiben, die rechtlichen Grenzen nennen (keine gekauften Bewertungen, keine Anreize) und zeigen, wie man auf negative Bewertungen antwortet.',
    category: 'SEO und Sichtbarkeit',
    targetKeywords: [
      'google bewertungen bekommen',
      'kunden um bewertung bitten',
      'negative google bewertung antworten',
    ],
  },
  {
    title: 'Lohnt sich ein Onlineshop fuer einen lokalen Betrieb?',
    angle:
      'Ehrliche Antwort ist meistens nein, ausser bei bestimmten Konstellationen. Diese Konstellationen klar benennen. Mironi als Beleg fuer den Fall, wo es passt.',
    category: 'Branchen',
    targetKeywords: [
      'onlineshop lokaler betrieb',
      'lohnt sich onlineshop kleines unternehmen',
      'shop oder nur webseite',
    ],
  },
  {
    title: 'Konfigurator statt Beratungstelefonat: fuer welche Betriebe das passt',
    angle:
      'CarHiFi Herford als Aufhaenger. Zeigen, wann ein Konfigurator Anfragen vorsortiert und wann er nur Aufwand macht.',
    category: 'Webseiten mit System',
    targetKeywords: [
      'konfigurator webseite',
      'anfragen vorqualifizieren',
      'produktkonfigurator kleinbetrieb',
    ],
  },
  {
    title: 'Relaunch oder nur ueberarbeiten? Woran du erkennst, was reicht',
    angle:
      'Entscheidungshilfe mit klaren Kriterien. Ehrlich sagen, wann ein Relaunch Geldverschwendung ist.',
    category: 'Preise und Ablauf',
    targetKeywords: [
      'webseite relaunch noetig',
      'homepage ueberarbeiten oder neu',
      'wann relaunch webseite',
    ],
  },
  {
    title: 'Agentur wechseln: die fuenf Warnzeichen und wie du sauber rauskommst',
    angle:
      'Warnzeichen benennen und den Ablauf eines sauberen Wechsels beschreiben. Sachlich bleiben, nicht ueber Wettbewerber herziehen.',
    category: 'Preise und Ablauf',
    targetKeywords: [
      'agentur wechseln webseite',
      'unzufrieden mit webagentur',
      'webseite umziehen neue agentur',
    ],
  },
  {
    title: 'Was passiert, wenn eine Webseite zwei Jahre nicht gepflegt wird',
    angle:
      'Sicherheitsluecken, veraltete Inhalte, Vertrauensverlust, Ranking-Verfall. Sachlich beschreiben, ohne Angst zu machen.',
    category: 'Webseiten mit System',
    targetKeywords: [
      'webseite nicht gepflegt folgen',
      'webseite wartung noetig',
      'veraltete webseite risiko',
    ],
  },
  {
    title: 'KI im Kleinbetrieb: was heute schon Zeit spart und was nicht',
    angle:
      'Ehrlich abgrenzen statt zu hypen. Konkrete Einsatzfelder nennen, die heute funktionieren, und die nennen, wo es noch nicht taugt.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'ki im handwerk',
      'ki kleinbetrieb sinnvoll',
      'ki zeit sparen unternehmen',
    ],
  },
  {
    title: 'Foerderung fuer Digitalisierung in NRW: was es gibt und fuer wen es passt',
    angle:
      'WICHTIG: Programme, Hoehen und Fristen vor dem Schreiben pruefen, da sie sich haeufig aendern. Lieber die Anlaufstellen nennen als konkrete Summen behaupten, die veralten koennen.',
    category: 'Preise und Ablauf',
    targetKeywords: [
      'foerderung digitalisierung nrw',
      'zuschuss webseite kleinunternehmen',
      'digitalisierungsfoerderung handwerk',
    ],
  },
];
