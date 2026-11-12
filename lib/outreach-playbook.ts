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
  [/juwel|trauring|goldschmied|jewel/i, 'juwelier'],
  [/friseur|barb|hair salon|haarstudio|coiffeur|hairdresser/i, 'friseur'],
  [/kosmetik|beaut|nagel|nail|wimpern|lash|brow|spa|massage|wellness|waxing|sugaring|haarentfern|hair removal|permanent|make-up|fuß|fuss|podolog|foot|tanning|facial|tattoo|piercing/i, 'kosmetik'],
];

export function branchOf(lead: Pick<OutreachLead, 'category' | 'query' | 'name'>): Branch {
  const text = `${lead.category ?? ''} ${lead.query ?? ''} ${lead.name}`;
  return RULES.find(([re]) => re.test(text))?.[1] ?? 'sonstiges';
}

/** Beweis, den Yusuf ohne Link nennen darf (die Case Study kommt erst in der Antwort). */
export const PROOF =
  'Bacara Ästhetik in Bünde: über 800 Termine online gebucht, ohne einen einzigen Anruf, ein System statt fünf (Website, Buchung, Erinnerungen, Einwilligungen, Bewertungen). Öffentliche Case Study: kolac-digital.de/case-studys/bacara-aesthetik';

/**
 * Systemprompt fuer die erste Nachricht und das Nachfassen. Fest, damit er gecacht
 * wird; alles Betriebsbezogene steht in der Nutzer-Nachricht (draftContext).
 */
export const DRAFT_SYSTEM = `Du schreibst die erste Instagram-DM und eine Nachfass-Nachricht für Yusuf Kolac (Kolac Digital, Bielefeld). Yusuf baut lokalen Betrieben in OWL ein System aus Website, Anfragen oder Online-Buchung und Automatisierung, komplett für sie (done for you). Er schickt jede Nachricht selbst ab.

Aufbau der ersten Nachricht (nach einer bewährten LinkedIn-Vorlage, für Instagram lockerer und kürzer):
1. "Hey <Vorname>," wenn ein Vorname bekannt ist, sonst "Hey ihr," oder "Hey," (bei Sie-Form "Hallo Frau/Herr <Nachname>," oder "Hallo,"). Nie einen Namen erfinden.
2. Icebreaker, ein bis zwei Sätze, so persönlich wie möglich und nur aus den Daten. Vorrang: ein Beitrag oder die Bio, dann Spezialisierung aus Name und Kategorie (z. B. Keramikversiegelung, Massivholz, Scheunenhochzeit), Standorte, Jahre im Geschäft, erst zuletzt die Bewertungen. Ehrlich, konkret, kein Schleimen, keine Floskel wie "das gibt's nicht geschenkt".
3. Brücke: ein Satz, der vom Icebreaker zum Thema führt, gern als kleines Zukunftsbild. Formulierung jedes Mal neu, nicht immer "bestimmt".
4. "Ich bin Yusuf, ich bau <Branche> <das System in Kurzform>, komplett für euch." (Anrede anpassen.)
5. Der Schmerz in ihren Worten: "Die meisten <Branche>, mit denen ich spreche, sagen mir: …" und dann EIN Problem aus der Liste, das zu diesem Betrieb passt, als wörtliches Zitat in „…“. Optional ein Fund aus der Prüfung, wenn er dazu passt (z. B. keine Online-Buchung, keine eigene Website). Als Wiedererkennen formulieren, nie als Kritik.
6. Das Angebot: kostenlos einen Entwurf für <Name des Betriebs>, damit <Zielbild>. Gefällt er nicht: Link löschen, kein Stress.
7. Beweis in einem Satz ohne Link, z. B. "Für eine Praxis in Bünde hab ich so ein System gebaut, da kamen über 800 Termine rein, ohne einen einzigen Anruf." Nur diesen Beweis, keine anderen Zahlen oder Kunden erfinden.
8. "Ich liefer lieber erst, dann reden wir." und eine kurze Schlussfrage ("Wie sieht's aus?", "Lust drauf?", "Soll ich?").
9. "LG Yusuf"

Regeln:
- 550 bis 740 Zeichen inklusive Grußformel. Kurze Absätze, Instagram-Ton: locker, ehrlich, wie ein Mensch, nicht wie Werbung.
- Kein Link, keine Domain, keine E-Mail-Adresse, kein Preis, keine Emojis außer höchstens einem.
- Keine Floskeln ("Ich hoffe, es geht dir gut", "kurze Frage", "Sehr geehrte"), keine Versprechen wie "garantiert" oder "100 %".
- Eine Anrede durchhalten: du bei Einzelpersonen, ihr bei Teams, Sie bei förmlicher Bio oder Arztpraxis. Nicht mischen.
- Nichts behaupten, was nicht in den Daten steht. Ein Fund "Keine Online-Buchung" heißt nur: auf der Website wurde keine gefunden.

Nicht schreiben, wenn der Betrieb nicht passt: Einkaufszentrum, Kette oder Filiale eines Konzerns, Waschstraße statt Aufbereiter, keine Branche aus der Liste, oder die Daten widersprechen sich. Dann nur {"skip": "kurzer Grund für Yusuf"} ausgeben.

Nachfass-Nachricht: höchstens 260 Zeichen, gleiche Anrede, "falls untergegangen", Entwurf kostenlos, eine Frage, und "wenn nicht, alles gut, dann meld ich mich nicht nochmal".

Antworte ausschließlich mit einem JSON-Objekt, ohne Text davor oder danach:
{"dm": "…", "followup": "…"} oder {"skip": "…"}`;

export function draftContext(lead: OutreachLead & { contact?: string }, branch = branchOf(lead)): string {
  const p = PLAYBOOKS[branch];
  const lines = [
    `Branche: ${p.label} (Mehrzahl: ${p.plural}). Übliche Anrede: ${p.anrede}.`,
    `System, das Yusuf dieser Branche baut: ${p.system}.`,
    `Probleme der Branche in ihren Worten:\n${p.pains.map((x) => `- „${x}“`).join('\n')}`,
    `Zielbild: ${p.outcome}.`,
    `Der kostenlose Entwurf zeigt: ${p.freebie}.`,
    `Beweis: ${PROOF.split('. Öffentliche')[0]}.`,
    '',
    `Betrieb: ${lead.name}${lead.city ? `, ${lead.city}` : ''}${lead.category ? ` (${lead.category})` : ''}`,
    lead.contact ? `Ansprechpartner: ${lead.contact}` : '',
    lead.rating ? `Google: ${lead.rating} Sterne bei ${lead.reviews ?? '?'} Bewertungen` : '',
    lead.instagram ? `Instagram: @${lead.instagram}` : '',
    lead.ig?.fullName ? `Profilname: ${lead.ig.fullName}` : '',
    lead.ig?.bio ? `Bio: ${lead.ig.bio.replace(/\n/g, ' / ')}` : '',
    typeof lead.ig?.followers === 'number' ? `Follower: ${lead.ig.followers}` : '',
    lead.website ? `Website: vorhanden` : 'Keine eigene Website',
    lead.scan?.findings.length ? `Funde der Website-Prüfung: ${lead.scan.findings.join('; ')}` : '',
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
