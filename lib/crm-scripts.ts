/**
 * Anruf-Leitfaden für SEO-Leads, je Branche, gefüllt mit den Daten der Akte
 * und des SEO-Checks. Ziel jedes Anrufs: ein Termin (20 Minuten per Video).
 * Preise werden am Telefon nicht genannt, die kommen im Termin.
 * Keine Gedankenstriche, einfache Sprache (Leser ist gestresst und hat wenig Zeit).
 */
import type { Customer } from './types';
import type { PublicSeoCheck } from './crm';
import { FUNNEL_MEETING_URL } from './seo-check/funnel';
import { site } from './site-config';

export interface Branchenprofil {
  key: string;
  label: string;
  /** Wonach Kunden suchen, {ort} wird ersetzt. */
  suchbeispiel: string;
  /** Warum gerade diese Branche Anfragen verliert (ein Satz). */
  winkel: string;
  fragen: string[];
  wertfrage: string;
  /** Interner Hinweis für Yusuf, z. B. passendes Zusatzprodukt. */
  tipp?: string;
}

export const BRANCHENPROFILE: Branchenprofil[] = [
  {
    key: 'autohaus',
    label: 'Autohaus',
    suchbeispiel: 'Auto verkaufen {ort}',
    winkel: 'Viele, die ihr Auto verkaufen wollen, landen bei den Ankaufportalen statt bei dir. Jedes Auto, das du direkt vom Privatkunden kaufst, ist günstiger als über die Börse.',
    fragen: [
      'Woher kommen bei dir gerade die meisten Ankäufe: Börsen, Laufkundschaft oder Google?',
      'Wie viele Ankauf-Anfragen bekommst du im Monat über deine Website?',
    ],
    wertfrage: 'Was verdienst du ungefähr an einem Auto, das du direkt vom Privatkunden ankaufst?',
    tipp: 'Autohändler: wagenpuls (Bestand, Ankauf, Inserate) kann im Termin ein zweites Thema sein.',
  },
  {
    key: 'werkstatt',
    label: 'Werkstatt',
    suchbeispiel: 'Werkstatt {ort}',
    winkel: 'Wer eine Werkstatt sucht, ruft meistens eine der drei Firmen aus der Google-Karte an. Steht man da nicht, ruft er woanders an.',
    fragen: [
      'Wie voll ist deine Werkstatt gerade, eher ausgebucht oder ist noch Luft?',
      'Welche Aufträge willst du mehr haben: Inspektion, Reparatur, Reifen oder TÜV?',
    ],
    wertfrage: 'Was bringt dir ein neuer Stammkunde im Jahr ungefähr?',
  },
  {
    key: 'aufbereitung',
    label: 'Fahrzeugaufbereitung',
    suchbeispiel: 'Autoaufbereitung {ort}',
    winkel: 'Bei Aufbereitung entscheiden Bilder und Bewertungen. Wer in der Karte oben steht und die besten Vorher-nachher-Bilder zeigt, bekommt den Auftrag.',
    fragen: [
      'Kommen deine Kunden eher über Empfehlung, Instagram oder Google?',
      'Welche Leistung willst du mehr verkaufen, zum Beispiel Keramikversiegelung oder Innenreinigung?',
    ],
    wertfrage: 'Was ist dir ein Auftrag im Schnitt wert?',
  },
  {
    key: 'makler',
    label: 'Immobilienmakler',
    suchbeispiel: 'Haus verkaufen {ort}',
    winkel: 'Eigentümer, die verkaufen wollen, landen bei Google zuerst bei Bewertungsportalen. Die geben den Kontakt dann an mehrere Makler weiter.',
    fragen: [
      'Woher kommen deine Verkaufsaufträge heute: Empfehlung, Portale oder Google?',
      'Wie viele Eigentümer melden sich im Monat über deine Website?',
    ],
    wertfrage: 'Was bringt dir ein Verkaufsauftrag ungefähr an Provision?',
  },
  {
    key: 'treppenlift',
    label: 'Treppenlift',
    suchbeispiel: 'Treppenlift {ort}',
    winkel: 'Angehörige suchen bei Google und landen oft bei Vergleichsportalen. Die geben die Anfrage an mehrere Händler weiter, und du kämpfst über den Preis.',
    fragen: [
      'Kaufst du gerade Anfragen über Portale ein, und was kostet dich eine?',
      'Wie viele Anfragen kommen direkt über deine eigene Website?',
    ],
    wertfrage: 'Was bringt dir ein verkaufter Lift ungefähr?',
  },
  {
    key: 'gebaeudereinigung',
    label: 'Gebäudereinigung',
    suchbeispiel: 'Büroreinigung {ort}',
    winkel: 'Firmen und Hausverwaltungen, die eine neue Reinigung suchen, googeln und rufen die ersten zwei, drei Firmen an. Dort musst du stehen.',
    fragen: [
      'Welche Kunden willst du mehr haben: Büros, Praxen oder Hausverwaltungen?',
      'Woher kommen deine Aufträge heute, eher über Empfehlung oder über Ausschreibungen?',
    ],
    wertfrage: 'Was bringt dir ein neues Objekt im Jahr ungefähr?',
  },
  {
    key: 'hoerakustik',
    label: 'Hörakustik',
    suchbeispiel: 'Hörgeräte {ort}',
    winkel: 'Wer Hörgeräte in deiner Stadt googelt, sieht oft zuerst die Ketten. Dabei wollen viele lieber zum Fachgeschäft vor Ort.',
    fragen: [
      'Wie viele neue Kunden kommen im Monat über Google, wie viele über Empfehlung oder den Ohrenarzt?',
      'Hast du gerade freie Termine für Hörtests?',
    ],
    wertfrage: 'Was bringt dir eine Versorgung ungefähr?',
  },
  {
    key: 'andere',
    label: 'Andere Branche',
    suchbeispiel: 'deine Leistung plus {ort}',
    winkel: 'Wer dich nicht kennt, sucht nach deiner Leistung und deinem Ort und ruft die ersten zwei, drei Firmen an.',
    fragen: [
      'Woher kommen bei dir heute die meisten neuen Kunden?',
      'Wie viele Anfragen kommen ungefähr im Monat über deine Website?',
    ],
    wertfrage: 'Was ist dir ein neuer Kunde ungefähr wert?',
  },
];

export function branchenprofil(key?: string): Branchenprofil {
  return BRANCHENPROFILE.find((b) => b.key === key) ?? BRANCHENPROFILE[BRANCHENPROFILE.length - 1];
}

export interface Leitfaden {
  /** Du oder Sie: Sie, wenn noch kein Ansprechpartner bekannt ist. */
  anrede: 'du' | 'sie';
  abschnitte: { titel: string; zeilen: string[]; hinweis?: string }[];
  einwaende: { frage: string; antwort: string }[];
  mailbox: string;
  /** Nur wenn die Person ihre Nummer selbst angegeben hat (Einwilligung). */
  whatsapp?: string;
  mail?: { betreff: string; text: string };
  tipp?: string;
}

const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/** Die nächsten zwei Werktage, ab morgen. */
function naechsteWerktage(now = new Date()): [string, string] {
  const out: string[] = [];
  const d = new Date(now);
  while (out.length < 2) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(WOCHENTAGE[d.getDay()]);
  }
  return [out[0], out[1]];
}

function wann(ms: number | undefined, now = Date.now()): string {
  if (!ms) return 'vor Kurzem';
  const tage = Math.floor((new Date(now).setHours(23, 59, 59, 999) - ms) / 86400000);
  if (tage <= 0) return 'heute';
  if (tage === 1) return 'gestern';
  if (tage < 7) return `am ${WOCHENTAGE[new Date(ms).getDay()]}`;
  return `am ${new Date(ms).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })}`;
}

const zahl = (n: number) => n.toLocaleString('de-DE');

export function baueLeitfaden(opts: {
  customer: Customer;
  vorname?: string;
  check?: PublicSeoCheck;
  branche?: string;
  domain: string;
}): Leitfaden {
  const { customer, check, domain } = opts;
  const b = branchenprofil(opts.branche ?? customer.branche);
  const vorname = (opts.vorname ?? customer.firstName ?? '').trim();
  const anrede: 'du' | 'sie' = vorname ? 'du' : 'sie';
  const main = check?.local?.[0];
  const ort =
    customer.city ||
    (main ? main.keyword.split(' ').slice(-1)[0].replace(/^./, (c) => c.toUpperCase()) : '') ||
    'deiner Stadt';
  const [tag1, tag2] = naechsteWerktage();
  const site_ = domain || 'deine Website';
  const checkWann = wann(check?.createdAt);

  // Befund: immer ein Satz mit Zahl, aus dem Check. Ohne Live-Daten aus den Punkten.
  let befund: string;
  if (main) {
    const platz = main.position ? `stehst du auf Platz ${main.position}` : 'stehst du nicht unter den ersten 20';
    const karte =
      main.hasMapPack && !main.mapPosition && main.mapPack.length
        ? ` In der Google-Karte stehen oben ${main.mapPack
            .slice(0, 2)
            .map((e) => `${e.name}${e.reviews != null ? ` mit ${zahl(e.reviews)} Bewertungen` : ''}`)
            .join(' und ')}, du nicht.`
        : main.mapPosition
          ? ` In der Google-Karte bist du auf Platz ${main.mapPosition}, das ist gut.`
          : '';
    befund = `Bei „${main.keyword}“ suchen ${main.volume ? `jeden Monat rund ${zahl(main.volume)} Leute` : 'Leute in deiner Gegend'}. Da ${platz}.${karte}`;
  } else if (check?.categories?.sichtbarkeit != null) {
    befund = `Deine Website ist technisch ${(check.categories.technik ?? 0) >= 80 ? 'gut' : 'okay'} (${check.categories.technik ?? '?'} von 100), aber bei der Sichtbarkeit bei Google kommst du nur auf ${check.categories.sichtbarkeit} von 100. Heißt: Wer dich nicht kennt, findet dich kaum.`;
  } else {
    befund = `Wenn jemand „${b.suchbeispiel.replace('{ort}', ort)}“ sucht, taucht ${site_} kaum auf.`;
  }

  const einstieg =
    anrede === 'du'
      ? [
          `Hi ${vorname}, hier ist Yusuf von Kolac Digital. Du hast ${checkWann} deine Website ${site_} bei uns durch den SEO-Check laufen lassen.`,
          'Hast du kurz 3 Minuten? Ich hab mir dein Ergebnis angeschaut.',
        ]
      : [
          'Guten Tag, hier ist Yusuf Kolac von Kolac Digital. Ich hätte gern kurz den Inhaber oder die Person, die sich um die Website kümmert.',
          `Über Ihre Website ${site_} wurde ${checkWann} bei uns der kostenlose SEO-Check gemacht. Ich hab mir das Ergebnis angeschaut. Haben Sie kurz 3 Minuten?`,
        ];

  const abschnitte: Leitfaden['abschnitte'] = [
    {
      titel: 'Einstieg',
      zeilen: einstieg,
      hinweis: 'Siezt er dich, sofort mitsiezen. War es nicht die Person selbst (Kollege, Familie, jemand von außen)? Kein Problem, die Antwort steht unten bei den Einwänden. Keine Zeit? „Wann passt es besser, heute Nachmittag oder morgen Vormittag?“ und unten „Später anrufen“ wählen.',
    },
    {
      titel: 'Fragen stellen und zuhören',
      zeilen: [...b.fragen, b.wertfrage],
      hinweis: 'Erst fragen, dann reden. Antworten unten in die Notiz schreiben, die Zahl aus der letzten Frage ist dein Argument im Termin.',
    },
    {
      titel: 'Befund nennen (ein Satz, mit Zahl)',
      zeilen: [befund, b.winkel],
    },
    {
      titel: 'Zum Termin führen',
      zeilen: [
        'Das am Telefon zu erklären wird dem nicht gerecht. Lass uns 20 Minuten per Video draufschauen: Ich zeige dir, wo genau du Anfragen verlierst und was du dagegen tun kannst.',
        'Das kostet nichts, und wenn du es danach selbst machen willst, ist das auch in Ordnung.',
        `Passt dir eher ${tag1} Vormittag oder ${tag2} Nachmittag?`,
      ],
      hinweis: 'Immer zwei Zeiten anbieten, nie „Wann hast du Zeit?“ fragen.',
    },
    {
      titel: 'Abschließen',
      zeilen: [
        `Super, ich schick dir gleich die Einladung${customer.email ? ` an ${customer.email}` : ''}. Stimmt die Adresse?`,
        'Schreib dir bis dahin kurz auf, wie viele Anfragen im Monat ungefähr über Google kommen.',
      ],
      hinweis: 'Danach unten „Termin gelegt“ wählen und den Termin im Kalender eintragen.',
    },
  ];

  const einwaende: Leitfaden['einwaende'] = [
    {
      frage: 'Ich hab gar keinen Check gemacht',
      antwort: `Kein Problem, das kommt vor. Vielleicht war es ein Kollege, oder jemand hat sich eure Seite von außen angeschaut. Das Ergebnis betrifft trotzdem eure Website: ${befund} Wer kümmert sich bei euch um die Website? Mit der Person würde ich mir das gern 20 Minuten anschauen.`,
    },
    { frage: 'Keine Zeit', antwort: 'Verstehe ich, genau deshalb nur 20 Minuten. Lieber Anfang oder Ende der Woche?' },
    { frage: 'Was kostet das?', antwort: 'Kommt darauf an, was du brauchst. Das sage ich dir im Termin ganz konkret, bevor du irgendwas entscheidest. Im Termin selbst kostet nichts.' },
    { frage: 'Ich wollte nur mal schauen', antwort: 'Klar, dafür ist der Check da. Hat dich das Ergebnis überrascht, oder war es so, wie du gedacht hast?' },
    { frage: 'Mach ich selbst / meine KI macht das', antwort: 'Super, dann zeig ich dir im Termin genau, wo du ansetzen musst. Den Rest kannst du selbst machen.' },
    { frage: 'Ich hab schon eine Agentur', antwort: 'Gut. Dann ist der Termin ein kostenloser zweiter Blick: Du siehst, ob an den richtigen Stellen gearbeitet wird.' },
    { frage: 'Schick mir was per Mail', antwort: `Mach ich. Damit es nicht untergeht, schick ich dir den Link für den Termin mit, such dir einfach eine Zeit aus.${customer.email ? ` Ist ${customer.email} richtig?` : ' An welche Adresse?'}` },
    { frage: 'Kein Budget gerade', antwort: 'Verstehe. Dann lass uns trotzdem kurz draufschauen, damit du weißt, was du zuerst selbst machen kannst. Wenn es besser läuft, reden wir weiter.' },
  ];

  const mailbox = `Hi${vorname ? ` ${vorname}` : ''}, hier ist Yusuf von Kolac Digital. ${anrede === 'du' ? `Du hast ${checkWann} den SEO-Check für ${site_} gemacht` : `Für Ihre Website ${site_} wurde ${checkWann} bei uns der SEO-Check gemacht`}, mir ist dabei ${main ? `bei „${main.keyword}“ ` : ''}etwas aufgefallen. Ich versuch es morgen nochmal, oder ${anrede === 'du' ? 'ruf mich zurück' : 'rufen Sie mich zurück'} unter ${site.phone}.`;

  const whatsapp = customer.phone && customer.wantsCall
    ? `Hi${vorname ? ` ${vorname}` : ''}, hier ist Yusuf von Kolac Digital. Ich hab versucht, dich wegen deines SEO-Checks zu ${site_} zu erreichen.${main ? ` Mir ist bei „${main.keyword}“ etwas aufgefallen.` : ''} Wann passt dir ein kurzer Anruf? Oder such dir direkt einen Termin aus: ${FUNNEL_MEETING_URL}`
    : undefined;

  const mail = customer.email
    ? {
        betreff: `Dein SEO-Check zu ${site_}`,
        text: `Hallo${vorname ? ` ${vorname}` : ''},\n\nich habe versucht, dich telefonisch zu erreichen. Mir ist bei deinem SEO-Check etwas aufgefallen:\n\n${befund}\n\nIn 20 Minuten per Video zeige ich dir, wo genau du Anfragen verlierst und was du dagegen tun kannst. Das kostet nichts. Such dir einfach eine Zeit aus:\n${FUNNEL_MEETING_URL}\n\nViele Grüße\nYusuf Kolac\n${site.phone}`,
      }
    : undefined;

  return { anrede, abschnitte, einwaende, mailbox, whatsapp, mail, tipp: b.tipp };
}
