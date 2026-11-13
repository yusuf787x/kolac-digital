/**
 * Branchenwissen fuer den Instagram-Outreach: was Yusuf der Branche baut, die
 * groessten Probleme in ihren Worten (Recherche 12.11.2026, Quellen in
 * docs/OFFER-STUDIOS.md) und das Zielbild. Genutzt vom Textgenerator
 * (/api/outreach/draft, scripts/outreach/draft.mts) und der Antwort-Hilfe.
 */
import type { OutreachLead } from './outreach';

export type Branch =
  | 'kosmetik'
  | 'friseur'
  | 'aesthetik'
  | 'kueche'
  | 'bad'
  | 'galabau'
  | 'tischlerei'
  | 'ausbau'
  | 'hochzeitslocation'
  | 'brautmode'
  | 'aufbereitung'
  | 'kfz'
  | 'juwelier'
  | 'sonstiges';

export interface Playbook {
  label: string;
  /** Wie man den Betrieb in der Branche nennt, Mehrzahl ("Küchenstudios"). */
  plural: string;
  /** Standard-Anrede, wenn die Bio nichts anderes nahelegt. */
  anrede: 'du' | 'ihr' | 'Sie';
  /** Was Yusuf baut, ein Satz. */
  system: string;
  /** Probleme in den Worten der Inhaber, wichtigstes zuerst. */
  pains: string[];
  /** Was der Betrieb gewinnt. */
  outcome: string;
  /** Was der kostenlose Entwurf zeigt. */
  freebie: string;
}

export const PLAYBOOKS: Record<Branch, Playbook> = {
  kosmetik: {
    label: 'Kosmetik, Nägel, Wimpern',
    plural: 'Studios',
    anrede: 'du',
    system: 'Website mit Online-Buchung: Kundinnen buchen selbst in freie Zeiten, Erinnerung am Vortag automatisch, Anamnese und Einwilligung vorher am Handy, alles in einem Kalender statt verteilt auf Insta, WhatsApp und Telefon',
    pains: [
      'Das Handy vibriert mitten in der Behandlung, und abends sitze ich noch an den DMs, wann wer kommen kann',
      'Bis ich antworte, hat die Neue schon woanders gebucht',
      'Kundinnen vergessen ihren Termin, und die Lücke ist einfach weg',
      'Anamnese und Einwilligung auf Papier, jedes Mal',
      'Treatwell nimmt bis zu 35 % Provision auf neue Kundinnen',
    ],
    outcome: 'in Ruhe arbeiten, abends Feierabend, und die Termine kommen trotzdem rein',
    freebie: 'eine Vorschau ihrer Seite mit eigenen Bildern, Behandlungen und Online-Buchung',
  },
  friseur: {
    label: 'Friseur, Barbier',
    plural: 'Salons',
    anrede: 'ihr',
    system: 'Website mit Online-Buchung: Kunden buchen selbst in freie Zeiten, bei der richtigen Person und mit der richtigen Dauer, Erinnerung am Vortag automatisch, alles in einem Kalender',
    pains: [
      'Mitten im Schnitt klingelt das Telefon, und ich muss mit nassen Händen rangehen',
      'Kunden kommen einfach nicht, 8 bis 15 % der Termine fallen so aus',
      'Wer abends einen Termin will, ruft am nächsten Tag woanders an',
    ],
    outcome: 'kein Telefon mehr am Stuhl, weniger leere Plätze, und der Kalender füllt sich auch nachts',
    freebie: 'eine Vorschau ihrer Seite mit Leistungen, Preisen und Online-Buchung',
  },
  aesthetik: {
    label: 'Ästhetische Medizin',
    plural: 'Praxen',
    anrede: 'Sie',
    system: 'Website mit Online-Terminbuchung, Aufklärung und Einwilligung digital vor dem Termin, Erinnerungen und Bewertungsanfragen automatisch, alles in einem System',
    pains: [
      'Patientinnen fragen per DM nach Preisen für Botox und Filler, und das Team schreibt den ganzen Tag zurück',
      'Aufklärungsbögen und Einwilligungen auf Papier halten jeden Termin auf',
      'Beratungstermine, die einfach nicht wahrgenommen werden',
    ],
    outcome: 'ein Team, das behandelt statt tippt, und Patientinnen, die vorbereitet kommen',
    freebie: 'eine Vorschau ihrer Seite mit Behandlungen und Online-Terminbuchung',
  },
  kueche: {
    label: 'Küchenstudio',
    plural: 'Küchenstudios',
    anrede: 'ihr',
    system: 'Website mit euren echten Küchen und einer Beratungsanfrage, bei der Kunden vorher Grundriss, Budget, Geräte und Zeitpunkt angeben und den Termin direkt buchen, mit automatischer Erinnerung, alle Anfragen aus Insta, Google und Telefon an einer Stelle',
    pains: [
      'Wir planen drei Stunden, und dann wird die Planung woanders nachgebaut',
      'Leute kommen ohne Maße und ohne Budget und wollen erst mal wissen, was eine Küche kostet',
      'Entscheidungen dauern Monate, und beim Nachfassen rutscht immer jemand durch',
    ],
    outcome: 'Beratungen nur noch mit Leuten, die wirklich kaufen wollen, und die Planer wissen vorher, worum es geht',
    freebie: 'eine Vorschau ihrer Seite mit eigenen Küchen und der Beratungsanfrage',
  },
  bad: {
    label: 'Badsanierung',
    plural: 'Badsanierer',
    anrede: 'ihr',
    system: 'Website mit euren Bädern und einer Anfrage, bei der Kunden vorher Fotos vom alten Bad, Größe, Budgetrahmen und Wunschzeitraum schicken, dann erst der Besichtigungstermin, alles an einer Stelle statt auf der Baustelle am Handy',
    pains: [
      'Wir fahren zur Besichtigung, schreiben drei Stunden am Angebot, und dann kommt nichts mehr',
      'Viele haben drei Angebote auf dem Tisch und eine Preisvorstellung, die nie passt',
      'Das Handy klingelt auf der Baustelle, und Anfragen gehen unter',
    ],
    outcome: 'weniger Besichtigungen für die Tonne, mehr Aufträge pro Angebot',
    freebie: 'eine Vorschau ihrer Seite mit eigenen Bädern und der Anfrage mit Foto-Upload',
  },
  galabau: {
    label: 'Garten- und Landschaftsbau',
    plural: 'GaLaBau-Betriebe',
    anrede: 'ihr',
    system: 'Website mit euren Gärten und einer Anfrage, bei der Kunden vorher Fotos, Fläche, Budgetrahmen und Wunschzeitraum angeben, dann erst die Besichtigung, alle Anfragen an einer Stelle',
    pains: [
      'Im Frühjahr wollen alle gleichzeitig, und die Hälfte der Besichtigungen bringt nichts',
      'Ein Angebot dauert Stunden, und viele melden sich danach nie wieder',
      'Auf der Baustelle kann keiner ans Telefon, und abends wird nur noch zurückgerufen',
    ],
    outcome: 'Besichtigungen nur bei ernsthaften Anfragen, und die Kolonne bleibt auf der Baustelle',
    freebie: 'eine Vorschau ihrer Seite mit eigenen Projekten und der Anfrage mit Fotos',
  },
  tischlerei: {
    label: 'Tischlerei, Schreinerei',
    plural: 'Tischlereien',
    anrede: 'ihr',
    system: 'Website mit euren Möbeln und Projekten und einer Anfrage, bei der Kunden vorher Maße, Fotos, Holz und Budgetrahmen angeben, alles an einer Stelle',
    pains: [
      'Ein Angebot dauert drei Stunden, weil Maße und Angaben fehlen und man fünfmal nachfragen muss',
      'Manche vergleichen Maßarbeit mit einem Ikea-Preis',
      'Wir haben genug Arbeit in der Werkstatt, das Büro bleibt liegen',
    ],
    outcome: 'Anfragen, die schon alles enthalten, und mehr Zeit in der Werkstatt',
    freebie: 'eine Vorschau ihrer Seite mit eigenen Projekten und der Anfrage mit Maßen und Fotos',
  },
  ausbau: {
    label: 'Überdachung, Wintergarten, Pool, Kamin',
    plural: 'Betriebe',
    anrede: 'ihr',
    system: 'Website mit euren Projekten und einer Anfrage, bei der Kunden vorher Fotos, Maße, Budgetrahmen und Zeitpunkt angeben, dann erst der Vor-Ort-Termin, alles an einer Stelle',
    pains: [
      'Viele wollen erst mal nur einen Preis und melden sich nach dem Aufmaß nicht mehr',
      'Ein Angebot kostet Stunden, und am Ende entscheidet der günstigste',
      'Anfragen kommen über Telefon, Mail und Insta und gehen unter',
    ],
    outcome: 'Termine nur bei Leuten, die wirklich bauen wollen, und Kunden, die vorher wissen, was sie erwartet',
    freebie: 'eine Vorschau ihrer Seite mit eigenen Projekten und der Anfrage',
  },
  hochzeitslocation: {
    label: 'Hochzeits- und Eventlocation',
    plural: 'Locations',
    anrede: 'ihr',
    system: 'Website, auf der Paare sehen, ob ihr Datum frei ist, Gästezahl und Budget angeben und den Besichtigungstermin direkt buchen, mit automatischer Erinnerung und Infopaket, alle Anfragen an einer Stelle',
    pains: [
      'Jeden Tag die gleiche Frage per DM: Ist der Samstag im Juni noch frei?',
      'Besichtigungen mit Paaren, für die es am Ende zu teuer oder zu groß ist',
      'Paare suchen 12 bis 18 Monate vorher und schreiben zehn Locations gleichzeitig an, wer zuerst antwortet, gewinnt',
    ],
    outcome: 'weniger Hin und Her, Besichtigungen nur mit passenden Paaren, und ihr seid die, die zuerst antworten',
    freebie: 'eine Vorschau ihrer Seite mit Bildern, Verfügbarkeitsanfrage und Besichtigungsbuchung',
  },
  brautmode: {
    label: 'Brautmode',
    plural: 'Brautmodengeschäfte',
    anrede: 'ihr',
    system: 'Website, auf der Bräute ihren Anprobetermin selbst buchen und vorher Hochzeitsdatum, Stil, Budget und Begleitung angeben, mit Erinnerung am Vortag, alles in einem Kalender',
    pains: [
      'Eine Anprobe blockiert zwei Stunden, und dann kommt die Braut einfach nicht',
      'Termine laufen über Telefon und WhatsApp, und keiner weiß vorher, was die Braut sucht',
      'Bräute schauen online und entscheiden sich, bevor sie überhaupt angerufen haben',
    ],
    outcome: 'volle Anprobetermine mit vorbereiteten Bräuten und kaum noch Ausfälle',
    freebie: 'eine Vorschau ihrer Seite mit Kollektion und Anprobe-Buchung',
  },
  aufbereitung: {
    label: 'Fahrzeugaufbereitung, Folierung',
    plural: 'Aufbereiter',
    anrede: 'du',
    system: 'Website mit deinen Vorher-Nachher-Bildern und einer Anfrage, bei der Kunden Fahrzeug, Fotos und Wunschpaket angeben und direkt einen Termin buchen, alles an einer Stelle statt in zehn WhatsApp-Chats',
    pains: [
      'Jeden Tag: Was kostet Keramik für meinen Golf? Ohne Fotos, ohne Zustand, und nach dem Preis ist Funkstille',
      'Anfragen verteilt auf WhatsApp, Insta und Telefon, während man eigentlich poliert',
      'Gute Arbeit sieht man auf Insta, aber bei Google findet einen keiner für Keramikversiegelung in der Stadt',
    ],
    outcome: 'Anfragen mit allen Infos, feste Termine statt Chat-Ping-Pong, und mehr Kunden über Google',
    freebie: 'eine Vorschau seiner Seite mit Vorher-Nachher-Bildern und Terminanfrage',
  },
  kfz: {
    label: 'Kfz-Betrieb: Werkstatt, Smart-Repair, Ausbeulen, Lackierer',
    plural: 'Kfz-Betriebe',
    anrede: 'du',
    system: 'Website, auf der Kunden Fahrzeug und Fotos vom Schaden hochladen und direkt einen Termin anfragen, jede Leistung mit eigener Seite, damit Google dich für Dellen, Kratzer oder Reparatur in deiner Stadt findet',
    pains: [
      'Ständig Anrufe: Was kostet die Delle? Und dann muss ich die Fotos erst per WhatsApp hinterherfragen',
      'Ich bin mitten in der Arbeit am Auto, das Telefon klingelt, und der Kunde ruft einfach den Nächsten an',
      'Bei Google stehen Ketten und Portale vor mir, obwohl ich hier der Spezialist bin',
    ],
    outcome: 'Anfragen mit Fotos und Fahrzeugdaten, weniger Telefon in der Werkstatt und mehr Kunden über Google',
    freebie: 'eine Vorschau seiner Seite mit Leistungen, Vorher-Nachher-Bildern und Anfrage mit Foto-Upload',
  },
  juwelier: {
    label: 'Juwelier, Trauringe',
    plural: 'Juweliere',
    anrede: 'ihr',
    system: 'Website, auf der Paare eure Trauringe sehen und ihre Beratung direkt buchen, mit Wunschbudget und Datum vorab und automatischer Erinnerung, alles an einer Stelle',
    pains: [
      'Paare vergleichen Trauringe online und kommen gar nicht mehr in den Laden',
      'Beratungen ohne Termin, und dann stehen drei Paare gleichzeitig da',
      'Bei Google gewinnen die großen Online-Shops, nicht der Juwelier vor Ort',
    ],
    outcome: 'mehr Paare im Laden, Beratungen mit Termin und Ruhe, und bei Google vor den Online-Shops',
    freebie: 'eine Vorschau ihrer Seite mit Trauringen und Beratungsbuchung',
  },
  sonstiges: {
    label: 'Sonstige',
    plural: 'Betriebe',
    anrede: 'ihr',
    system: 'Website mit Online-Anfrage oder Buchung, bei der Kunden vorher alles Wichtige angeben, Erinnerungen automatisch, alles an einer Stelle',
    pains: ['Anfragen kommen über Telefon, Mail und Insta und gehen unter', 'Viel Hin und Her, bevor überhaupt ein Termin steht'],
    outcome: 'weniger Zeit am Handy, mehr Zeit für die Arbeit',
    freebie: 'eine Vorschau ihrer Seite mit Online-Anfrage',
  },
};

const RULES: [RegExp, Branch][] = [
  [/ästhet|aesthet|medical spa|skin care clinic|dermatolog|faltenbehandlung|botox|hyaluron/i, 'aesthetik'],
  [/küche|kueche|kitchen/i, 'kueche'],
  [/badsan|badstudio|bäder|baeder|sanitär|bathroom|plumb/i, 'bad'],
  [/garten|landschaft|galabau|landscap/i, 'galabau'],
  [/tischler|schreiner|möbel|carpent|cabinet|joiner/i, 'tischlerei'],
  [/überdach|ueberdach|wintergarten|terrasse|pool|swimming pool|kamin|ofen|fireplace|stove/i, 'ausbau'],
  [/hochzeitsloc|eventloc|location|veranstaltung|wedding venue|event venue|banquet|festsaal/i, 'hochzeitslocation'],
  [/braut|bridal/i, 'brautmode'],
  [/aufbereit|folier|detailing|car wash|keramikversiegel|wrap/i, 'aufbereitung'],
  [/kfz|ausbeul|beulen|dellen|smart.?repair|lackier|karosserie|autowerkstatt|werkstatt|reifen|autoglas|autoservice|motoren|car repair|auto repair|body shop/i, 'kfz'],
  [/juwel|trauring|goldschmied|jewel/i, 'juwelier'],
  [/friseur|barb|hair salon|haarstudio|coiffeur|hairdresser/i, 'friseur'],
  [/kosmetik|beaut|nagel|nail|wimpern|lash|brow|spa|massage|wellness|waxing|sugaring|haarentfern|hair removal|permanent|make-up|fuß|fuss|podolog|foot|tanning|facial|tattoo|piercing/i, 'kosmetik'],
];

/**
 * Branche zuerst aus Kategorie und Name (was der Betrieb ist), erst dann aus
 * der Suche, ueber die er gefunden wurde. Sonst wird z. B. ein Ausbeulservice,
 * der bei "Fahrzeugaufbereitung Gütersloh" auftaucht, zum Aufbereiter.
 */
export function branchOf(lead: Pick<OutreachLead, 'category' | 'query' | 'name'>): Branch {
  const own = `${lead.category ?? ''} ${lead.name}`;
  return (
    RULES.find(([re]) => re.test(own))?.[1] ??
    RULES.find(([re]) => re.test(lead.query ?? ''))?.[1] ??
    'sonstiges'
  );
}

/** Orte, in die Yusuf ab Bielefeld vorbeifahren kann (rund eine Stunde), klein geschrieben. */
const NEARBY = [
  'bielefeld', 'herford', 'bünde', 'buende', 'gütersloh', 'guetersloh', 'paderborn', 'detmold', 'lemgo', 'lage',
  'bad salzuflen', 'löhne', 'loehne', 'bad oeynhausen', 'minden', 'enger', 'spenge', 'hiddenhausen', 'kirchlengern',
  'rödinghausen', 'vlotho', 'verl', 'harsewinkel', 'rheda', 'wiedenbrück', 'schloß holte', 'schloss holte', 'stukenbrock',
  'oerlinghausen', 'leopoldshöhe', 'halle (westf', 'halle westf', 'werther', 'steinhagen', 'versmold', 'borgholzhausen',
  'delbrück', 'salzkotten', 'bad lippspringe', 'schlangen', 'horn-bad meinberg', 'blomberg', 'extertal', 'kalletal',
  'barntrup', 'dörentrup', 'augustdorf', 'porta westfalica', 'lübbecke', 'espelkamp', 'hüllhorst', 'preußisch oldendorf',
  'rietberg', 'langenberg', 'herzebrock', 'bad driburg', 'hövelhof', 'büren', 'bad wünnenberg', 'altenbeken', 'höxter',
  'osnabrück', 'melle', 'bad essen', 'bückeburg', 'rinteln', 'hameln',
];

export const isNearby = (city?: string) => !!city && NEARBY.some((c) => city.toLowerCase().includes(c));

// --- Referenzen: passender Beweis je Betrieb ---

export interface Reference {
  id: string;
  /** Echter Name, erst in der Antwort (mit Link). */
  name: string;
  /** Stadt fuer den lokalen Bezug (klein geschrieben verglichen). */
  city: string;
  /** Wer das war, ohne Namen, fuer die erste Nachricht: "einen Autoaufbereiter". */
  who: string;
  /** Branchen, fuer die diese Referenz der beste Beweis ist. */
  branches: Branch[];
  /** Zusaetzlich passend, wenn Kategorie, Suche oder Name darauf passen (z. B. Kfz). */
  match?: RegExp;
  /** Beweis-Satz ohne Namen und ohne Link, nur belegte Zahlen. */
  proof: string;
  /** Oeffentliche Seite zum Projekt, erst in der Antwort verlinken. */
  url: string;
  /** Nur als lokaler Bezug geeignet, nicht als Hauptbeweis (kein messbares Ergebnis). */
  localOnly?: boolean;
}

/**
 * Reihenfolge = Staerke des Beweises. Nur Fakten aus lib/portfolio.ts und den
 * Case Studies, nichts aufrunden. MC-Autopflege ist neu (live seit 12.11.2026):
 * noch keine Zahlen zu Anfragen, also nur Ladezeit und Umfang nennen.
 */
export const REFERENCES: Reference[] = [
  {
    id: 'bacara-aesthetik',
    name: 'Bacara Ästhetik',
    city: 'bünde',
    who: 'eine Ästhetik-Praxis',
    branches: ['aesthetik', 'kosmetik', 'friseur', 'brautmode', 'hochzeitslocation', 'juwelier'],
    proof: 'Für eine Praxis in Bünde hab ich so ein System gebaut, da kamen über 800 Termine online rein, ohne einen einzigen Anruf.',
    url: 'kolac-digital.de/case-studys/bacara-aesthetik',
  },
  {
    id: 'mc-autopflege',
    name: 'MC-Autopflege',
    city: 'herford',
    who: 'einen Autoaufbereiter',
    branches: ['aufbereitung', 'kfz'],
    match: /beul|dell|smart.?repair|lackier|polier|folier|aufbereit|autopflege|fahrzeugpflege|detailing|keramik|car wash/i,
    proof: 'Für einen Autoaufbereiter in Herford hab ich gerade die alte Website komplett neu gebaut: Google bewertet die Ladezeit auf dem Handy jetzt mit 99 statt 68 von 100, und jede Leistung und zwölf Orte drumherum haben eine eigene Seite. (Die Seite ist neu, darum keine Zahlen zu Anfragen nennen.)',
    url: 'kolac-digital.de/portfolio/mc-autopflege',
  },
  {
    id: 'carhifi-herford',
    name: 'CarHiFi Herford',
    city: 'herford',
    who: 'einen Car-HiFi-Spezialisten',
    branches: ['kueche', 'bad', 'galabau', 'tischlerei', 'ausbau'],
    match: /hifi|car audio|tuning/i,
    proof: 'Für einen Car-HiFi-Spezialisten in Herford hab ich eine Website mit Anfrage gebaut, bei der Kunden vorher Fahrzeug und Wunsch angeben: 74 % mehr Anfragen, und die kommen schon vorsortiert rein.',
    url: 'kolac-digital.de/case-studys/carhifi-herford',
  },
  {
    id: 'paderpuls',
    name: 'PaderPuls Krankenfahrdienst',
    city: 'paderborn',
    who: 'einen Krankenfahrdienst',
    branches: [],
    match: /kranken|fahrdienst|pflege|taxi|patienten/i,
    proof: 'Für einen Krankenfahrdienst in Paderborn hab ich die alte Website neu aufgebaut, mit eigenen Seiten für jede Leistung und jeden Ort im Kreis, seitdem kommen spürbar mehr Anfragen und Anrufe über die Seite.',
    url: 'kolac-digital.de/portfolio/paderpuls',
  },
  {
    id: 'motorenfachmann',
    name: 'Motorenfachmann',
    city: 'lage',
    who: 'einen Kfz-Meisterbetrieb',
    branches: ['kfz'],
    match: /motor|getriebe|werkstatt|kfz-meister|autohaus|autoservice|reifen|kfz/i,
    proof: 'Für einen Kfz-Meisterbetrieb in Lage hab ich die Website für Google aufgeräumt: Die Startseite steht im Onpage-Check jetzt bei 95 statt 60 Prozent.',
    url: 'kolac-digital.de/portfolio/motorenfachmann',
  },
  {
    id: 'fahrschule-kreuzer',
    name: 'Fahrschule Kreuzer',
    city: 'bielefeld',
    who: 'eine Fahrschule',
    branches: [],
    match: /fahrschul/i,
    proof: 'Für eine Fahrschule in Bielefeld-Brackwede hab ich die erste eigene Website gebaut, seitdem kommen Anmeldungen online rein statt nur per Anruf.',
    url: 'kolac-digital.de/portfolio/fahrschule-kreuzer',
  },
  {
    id: 'af-gebaeudeservice',
    name: 'AF-Gebäudeservice',
    city: 'owl',
    who: 'einen Gebäudeservice',
    branches: [],
    match: /reinigung|gebäude|gebaeude|hausmeister/i,
    proof: 'Für einen Gebäudeservice in OWL hab ich Website und Anfrageformular gebaut, seitdem kommen Anfragen auch außerhalb der Bürozeiten rein.',
    url: 'kolac-digital.de/portfolio/af-gebaeudeservice',
  },
  {
    id: 'pader-automobilzentrum',
    name: 'Pader Automobilzentrum',
    city: 'paderborn',
    who: 'ein Automobilzentrum',
    branches: [],
    proof: 'Für ein neues Automobilzentrum in Paderborn hab ich Website und Google-Profil von null aufgebaut.',
    url: 'kolac-digital.de/portfolio/pader-automobilzentrum',
    localOnly: true,
  },
];

const sameCity = (r: Reference, city?: string) => !!city && city.toLowerCase().includes(r.city);

/**
 * Bester Beweis fuer einen Betrieb: zuerst passende Branche, dann gleiche Stadt,
 * sonst der staerkste (Bacara). Dazu optional eine andere Referenz aus derselben
 * Stadt als lokaler Bezug ("in Paderborn hab ich auch …").
 */
export function referenceFor(
  lead: Pick<OutreachLead, 'category' | 'query' | 'name' | 'city'>,
  branch: Branch = branchOf(lead),
): { main: Reference; local?: Reference; exact: boolean } {
  const own = `${lead.category ?? ''} ${lead.name}`;
  const usable = REFERENCES.filter((r) => !r.localOnly);
  // Zuerst die Branche; gibt es dort mehrere Referenzen, entscheidet das Stichwort
  // (Ausbeulen → MC-Autopflege, Werkstatt → Motorenfachmann). Stichworte allein
  // nur bei "sonstiges", sonst wird aus "Gartenpflege" ein Krankenfahrdienst.
  const inBranch = usable.filter((r) => r.branches.includes(branch));
  const exact =
    inBranch.find((r) => r.match?.test(own)) ??
    inBranch[0] ??
    (branch === 'sonstiges' ? usable.find((r) => r.match?.test(own)) : undefined);
  const main = exact ?? usable.find((r) => sameCity(r, lead.city)) ?? usable[0];
  const local = REFERENCES.find((r) => r !== main && sameCity(r, lead.city));
  return { main, local, exact: !!exact };
}

/** Zeilen fuer den Kontext der ersten Nachricht (ohne Link). */
export function proofLines(lead: Pick<OutreachLead, 'category' | 'query' | 'name' | 'city'>, branch: Branch = branchOf(lead)): string[] {
  const { main, local, exact } = referenceFor(lead, branch);
  const proof = exact
    ? `Beweis (nur diesen, sinngemäß, ohne Namen und ohne Link): ${main.proof}`
    : `Beweis: Keine Referenz aus genau dieser Branche. Nimm aus dieser Liste den einen, der dem Betrieb am nächsten kommt (ähnliche Kunden, ähnliches Problem), sinngemäß, ohne Namen und ohne Link:\n${REFERENCES.filter((r) => !r.localOnly)
        .map((r) => `- ${r.proof}`)
        .join('\n')}`;
  return [
    proof,
    local
      ? `Lokaler Bezug (optional, höchstens ein Halbsatz, ohne Namen): Yusuf hat in ${lead.city} auch schon für ${local.who} gearbeitet.`
      : '',
  ];
}

/** Hinweis fuer den Kontext: in der Naehe den Entwurf vor Ort zeigen. */
export function visitLine(lead: Pick<OutreachLead, 'city'>): string {
  return isNearby(lead.city)
    ? `Nähe: ${lead.city} liegt in Yusufs Gegend (OWL). Er baut den Entwurf und zeigt ihn persönlich vor Ort, Schlussfrage: wann es passt, dass er vorbeikommt.`
    : 'Nähe: nicht in Yusufs Gegend. Den Entwurf schickt er als Link zum Anschauen am Handy.';
}

// --- Scan-Funde als Aufhaenger mit kostenlosem Angebot ---

const FIX: [RegExp, string][] = [
  [/Keine eigene Website/i, 'Der Entwurf wäre direkt die eigene Website, mit Bildern, Leistungen und Bewertungen'],
  [/lädt nicht|bricht ab/i, 'Yusuf schaut kostenlos nach, woran es liegt, und der Entwurf lädt zuverlässig'],
  [/nicht fürs Handy/i, 'Der Entwurf ist fürs Handy gebaut, kein Zoomen mehr'],
  [/Nicht sicher|HTTPS/i, 'Yusuf stellt kostenlos auf eine sichere Verbindung um, dann verschwindet die Warnung im Browser'],
  [/Online-Buchung/i, 'Yusuf baut kostenlos eine Online-Buchung oder Anfrage mit allen Infos in den Entwurf ein (je nach Branche)'],
  [/Kontaktformular/i, 'Yusuf baut kostenlos eine anklickbare Telefonnummer und ein Anfrageformular ein'],
  [/Instagram: kein Link/i, 'Yusuf baut kostenlos eine Seite für den Link in der Bio, über die man direkt bucht oder anfragt'],
  [/Ladezeit/i, 'Der Entwurf lädt schnell, Ziel ist eine Note über 90 von 100'],
  [/Suchbegriff auf Seite 1/i, 'Yusuf baut die Seite so, dass Google versteht, was und wo, mit eigenen Seiten für die Leistungen'],
  [/Ort steht nicht im Seitentitel/i, 'Yusuf schreibt Titel und Beschreibung für Google mit dem Ort kostenlos'],
  [/anklickbare Telefonnummer/i, 'Yusuf macht die Nummer mit einem Tipp anrufbar'],
  [/wenig Text/i, 'Der Entwurf erklärt jede Leistung mit eigenem Text'],
  [/ins Leere/i, 'Yusuf repariert die Links kostenlos'],
  [/Server braucht|langsam/i, 'Der Entwurf lädt schnell, auch auf dem Handy'],
  [/Beschreibungstext/i, 'Yusuf schreibt die Beschreibung für Google kostenlos'],
  [/Im Fuß steht noch/i, 'Im Entwurf ist alles auf dem aktuellen Stand'],
];

/**
 * Funde der Pruefung, die in die Nachricht duerfen, je mit dem, was Yusuf
 * kostenlos dafuer macht. Reihenfolge wie im Scan (wichtigster zuerst).
 * Ohne eigene Website wird das selbst zum Fund.
 */
export function pitchFindings(lead: Pick<OutreachLead, 'website' | 'instagram' | 'scan'>): { finding: string; fix: string }[] {
  const raw = [...(lead.scan?.findings ?? [])];
  if (!lead.website && !raw.some((f) => /Keine eigene Website/i.test(f))) {
    raw.unshift(lead.instagram ? 'Keine eigene Website, nur der Google-Eintrag und das Instagram-Profil' : 'Keine eigene Website, nur der Google-Eintrag');
  }
  const out: { finding: string; fix: string }[] = [];
  for (const finding of raw) {
    const fix = FIX.find(([re]) => re.test(finding))?.[1];
    if (fix) out.push({ finding, fix });
  }
  return out;
}

export function findingLines(lead: Pick<OutreachLead, 'website' | 'instagram' | 'scan'>): string {
  const f = pitchFindings(lead);
  const score = typeof lead.scan?.seoScore === 'number' ? `Ergebnis des SEO-Checks (in der Nachricht nennen): ${lead.scan.seoScore} von 100 Punkten.\n` : '';
  if (!f.length) return `${score}Funde des Scans: keine, also die Liste weglassen.`;
  f.splice(3);
  return `${score}Funde des Scans, wichtigster zuerst, mit dem, was Yusuf kostenlos dafür macht:\n${f.map((x) => `- ${x.finding} → ${x.fix}`).join('\n')}`;
}

/**
 * Systemprompt fuer die erste Nachricht und das Nachfassen. Fest, damit er gecacht
 * wird; alles Betriebsbezogene steht in der Nutzer-Nachricht (draftContext).
 */
export const DRAFT_SYSTEM = `Du schreibst die erste Instagram-DM und eine Nachfass-Nachricht für Yusuf Kolac (Kolac Digital, Bielefeld). Yusuf baut lokalen Betrieben in OWL ein System aus Website, Anfragen oder Online-Buchung und Automatisierung, komplett für sie (done for you). Er schickt jede Nachricht selbst ab.

Aufbau der ersten Nachricht (nach einer bewährten LinkedIn-Vorlage, für Instagram lockerer und kürzer):
1. "Hey <Vorname>," wenn ein Vorname bekannt ist, sonst "Hey ihr," oder "Hey," (bei Sie-Form "Hallo Frau/Herr <Nachname>," oder "Hallo,"). Nie einen Namen erfinden.
2. Icebreaker, ein Satz, so persönlich wie möglich und nur aus den Daten. Vorrang: ein Beitrag oder die Bio, dann Spezialisierung aus Name und Kategorie (z. B. Keramikversiegelung, Massivholz, Scheunenhochzeit), Standorte, Jahre im Geschäft, erst zuletzt die Bewertungen. Ehrlich, konkret, kein Schleimen, keine Floskel wie "das gibt's nicht geschenkt".
3. "Ich bin Yusuf, ich bau <Branche> <das System in Kurzform>, komplett für euch." (Anrede anpassen.)
4. Der Scan, wenn Funde vorliegen (Pflicht): Yusuf hat einen kurzen Scan über den Auftritt des Betriebs laufen lassen, z. B. "Ich hab mal einen kurzen Scan über deine Seite laufen lassen, dabei ist mir aufgefallen:". Gibt es ein Ergebnis des SEO-Checks, nenn es dabei: "Ich hab deine Seite durch meinen SEO-Check laufen lassen: 46 von 100 Punkten. Aufgefallen ist mir:". Dann ALLE Funde aus der Nutzer-Nachricht als kurze Liste mit "- ", je Punkt nur 2 bis 6 Wörter in einfachen Worten (z. B. "- Bei Google nirgends auf Seite 1").
4b. Was das für den Betrieb heißt (Pflicht, wenn Funde oder eine Punktzahl unter 70 vorliegen): zwei Sätze mit zusammen 25 bis 45 Wörtern, ausgeschrieben, nicht im Telegrammstil. Sie übersetzen die Funde in Kunden: wenig Sichtbarkeit bei Google, Besucher finden nicht schnell, was sie suchen, deshalb kaum Anfragen über die Website und weniger Neukunden, z. B. "Heißt für dich: Bei Google findet dich kaum jemand, und wer doch auf der Seite landet, findet nicht schnell, was er sucht. So kommen über die Website kaum Anfragen und wenig Neukunden." Nur Folgen, die aus den Funden folgen (keine Platzierung auf Seite 1 → wenig Sichtbarkeit; keine Buchung oder Anfrage → Anfragen gehen verloren; wenig Text oder fehlender Ort → Besucher und Google verstehen nicht, was angeboten wird). Keine erfundenen Zahlen. Ohne eigene Website: "Ich hab dich bei Google gefunden, aber keine eigene Website, nur den Eintrag (und Insta)." Als ehrlicher Hinweis, nie als Kritik. Formulierung jedes Mal neu.
5. Der Schmerz in ihren Worten, als Brücke vom Fund: "Das hör ich oft, die meisten <Branche> sagen mir: „…“" mit EINEM Problem aus der Liste, das zum Fund und zum Betrieb passt, als wörtliches Zitat in „…“.
6. Das Angebot: Genau das verbessert Yusuf: Die Funde behebt er kostenlos bzw. baut das Fehlende kostenlos ein (siehe "→" bei den Funden), direkt in einem Entwurf für <Name des Betriebs>, damit er besser gefunden wird, Besucher sofort finden, was sie suchen, und mehr Anfragen reinkommen (passend zum Zielbild). In der Nähe (siehe "Nähe"): Yusuf kommt vorbei und zeigt den Entwurf vor Ort, dauert eine Viertelstunde. Sonst: Er schickt den Link. Gefällt er nicht: weg damit, kein Stress. Nie behaupten, der Entwurf sei schon fertig.
7. Beweis in einem Satz ohne Link: der Beweis aus der Nutzer-Nachricht, sinngemäß und in der gewählten Anrede. Nur diesen Beweis, keine anderen Zahlen oder Kunden erfinden, keinen Kundennamen nennen. Ist ein lokaler Bezug angegeben, darf er als Halbsatz dazu.
8. "Ich liefer lieber erst, dann reden wir." und eine kurze Schlussfrage. In der Nähe nach dem Termin fragen ("Wann passt es dir, dass ich kurz vorbeikomme?", "Wann bist du am besten im Laden?"), sonst "Lust drauf?" oder "Soll ich?".
9. "LG Yusuf"
Ohne Funde: Punkt 4 weglassen, nach Punkt 3 direkt der Schmerz ("Die meisten <Branche>, mit denen ich spreche, sagen mir: „…“"), dann der kostenlose Entwurf.

Regeln:
- 650 bis 900 Zeichen inklusive Grußformel, nie über 950 (Instagram schneidet bei 1000 ab). Platz sparen bei Icebreaker, Zitat und Beweis (je ein kurzer Satz), nie beim Satz, was das für den Betrieb heißt. Kurze Absätze, Instagram-Ton: locker, ehrlich, wie ein Mensch, nicht wie Werbung.
- Funde nur so stark formulieren, wie sie tragen: keine pauschalen Urteile über Baukästen (nicht "Wix ist langsam"), keine erfundenen Messwerte, keine Fachbegriffe ("HTTPS" nur in Klammern hinter "Browser zeigt ‚Nicht sicher‘").
- Kein Link, keine Domain, keine E-Mail-Adresse, kein Preis, keine Emojis außer höchstens einem.
- Keine Floskeln ("Ich hoffe, es geht dir gut", "kurze Frage", "Sehr geehrte"), keine Versprechen wie "garantiert" oder "100 %".
- Eine Anrede durchhalten: du bei Einzelpersonen, ihr bei Teams, Sie bei förmlicher Bio oder Arztpraxis. Nicht mischen.
- Nichts behaupten, was nicht in den Daten steht. Ein Fund "Keine Online-Buchung" heißt nur: auf der Website wurde keine gefunden.

Nicht schreiben, wenn der Betrieb nicht passt: Einkaufszentrum, Kette oder Filiale eines Konzerns, Waschstraße statt Aufbereiter, keine Branche aus der Liste, oder die Daten widersprechen sich. Dann nur {"skip": "kurzer Grund für Yusuf"} ausgeben.

Nachfass-Nachricht: höchstens 350 Zeichen, gleiche Anrede, "falls untergegangen", ein konkreter Punkt aus der ersten Nachricht (die Punktzahl des SEO-Checks oder der wichtigste Fund und was er für den Betrieb heißt), Entwurf kostenlos (in der Nähe: zeig ich dir vor Ort), eine Frage, und "wenn nicht, alles gut, dann meld ich mich nicht nochmal". Mit "LG Yusuf".

Antworte ausschließlich mit einem JSON-Objekt, ohne Text davor oder danach:
{"dm": "…", "followup": "…"} oder {"skip": "…"}`;

/**
 * Systemprompt fuer das Nachfassen nach dem Versand: bezieht sich auf die
 * Nachricht, die wirklich rausging. Fest, damit er gecacht wird.
 */
export const FOLLOWUP_SYSTEM = `Du schreibst die Nachfass-Nachricht auf Instagram für Yusuf Kolac (Kolac Digital, Bielefeld). Yusuf hat dem Betrieb vor ein paar Tagen eine erste DM geschickt (steht in der Nutzer-Nachricht) und keine Antwort bekommen. Er baut lokalen Betrieben Websites mit Anfrage oder Online-Buchung, komplett für sie, und bietet einen kostenlosen Entwurf an.

Aufbau:
1. Gleiche Anrede wie in der ersten Nachricht ("Hey <Vorname>," / "Hey ihr," / "Hey,").
2. Locker: "falls meine Nachricht untergegangen ist" oder ähnlich, jedes Mal anders formuliert.
3. EIN konkreter Punkt aus der ersten Nachricht, damit es nicht wie eine Massen-Erinnerung wirkt: die Punktzahl des SEO-Checks oder der wichtigste Fund, und in einem Halbsatz, was er für den Betrieb heißt (z. B. "dein SEO-Check lag bei 31 von 100, gerade findet dich bei Google kaum jemand").
4. Das Angebot noch einmal kurz: Entwurf kostenlos. Hat die erste Nachricht Vorbeikommen angeboten, wieder vor Ort anbieten und nach einem Termin fragen ("Hast du diese oder nächste Woche eine Viertelstunde?"), sonst fragen, ob er den Entwurf schicken soll.
5. "Wenn nicht, alles gut, dann meld ich mich nicht nochmal."
6. "LG Yusuf"

Regeln: 200 bis 350 Zeichen. Kein Link, kein Preis, keine Emojis außer höchstens einem, keine Floskeln, nichts behaupten, was nicht in der ersten Nachricht oder den Daten steht. Nie behaupten, der Entwurf sei schon fertig. Gleiche Anrede durchhalten.

Antworte ausschließlich mit einem JSON-Objekt: {"followup": "…"}`;

export function followupContext(lead: OutreachLead & { contact?: string }, branch = branchOf(lead)): string {
  return [
    `Branche: ${PLAYBOOKS[branch].label}. Zielbild: ${PLAYBOOKS[branch].outcome}.`,
    `Betrieb: ${lead.name}${lead.city ? `, ${lead.city}` : ''}`,
    findingLines(lead),
    visitLine(lead),
    '',
    `Erste Nachricht, die Yusuf geschickt hat:\n${lead.dm ?? '(nicht gespeichert)'}`,
    // Die alte Pruefung hat "Nicht sicher" oft falsch gemeldet (http-Adresse aus Google Maps)
    /nicht sicher|https/i.test(lead.dm ?? '') && lead.scan?.https !== false
      ? 'Wichtig: Den Punkt „Nicht sicher“ / HTTPS aus der ersten Nachricht NICHT wiederholen, er hat sich als ungenau herausgestellt. Nimm einen anderen Punkt.'
      : '',
    '',
    'Schreib die Nachfass-Nachricht.',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

export function draftContext(lead: OutreachLead & { contact?: string }, branch = branchOf(lead)): string {
  const p = PLAYBOOKS[branch];
  const lines = [
    `Branche: ${p.label} (Mehrzahl: ${p.plural}). Übliche Anrede: ${p.anrede}.`,
    `System, das Yusuf dieser Branche baut: ${p.system}.`,
    `Probleme der Branche in ihren Worten:\n${p.pains.map((x) => `- „${x}“`).join('\n')}`,
    `Zielbild: ${p.outcome}.`,
    `Der kostenlose Entwurf zeigt: ${p.freebie}.`,
    ...proofLines(lead, branch),
    '',
    `Betrieb: ${lead.name}${lead.city ? `, ${lead.city}` : ''}${lead.category ? ` (${lead.category})` : ''}`,
    lead.contact ? `Ansprechpartner: ${lead.contact}` : '',
    lead.rating ? `Google: ${lead.rating} Sterne bei ${lead.reviews ?? '?'} Bewertungen` : '',
    lead.instagram ? `Instagram: @${lead.instagram}` : '',
    lead.ig?.fullName ? `Profilname: ${lead.ig.fullName}` : '',
    lead.ig?.bio ? `Bio: ${lead.ig.bio.replace(/\n/g, ' / ')}` : '',
    typeof lead.ig?.followers === 'number' ? `Follower: ${lead.ig.followers}` : '',
    lead.website ? `Website: vorhanden` : 'Keine eigene Website',
    findingLines(lead),
    visitLine(lead),
    '',
    'Schreib die erste Nachricht und die Nachfass-Nachricht.',
  ];
  return lines.filter((l) => l !== '').join('\n');
}

export function parseDraft(text: string): { dm: string; followup: string } | { skip: string } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as { dm?: unknown; followup?: unknown; skip?: unknown };
    if (typeof j.skip === 'string' && j.skip.trim()) return { skip: j.skip.trim() };
    if (typeof j.dm !== 'string' || typeof j.followup !== 'string') return null;
    return { dm: j.dm.trim(), followup: j.followup.trim() };
  } catch {
    return null;
  }
}
