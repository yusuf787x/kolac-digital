/**
 * Zentrale Datenquelle fuer alle Case Studies. Neue Cases werden hier
 * ergaenzt und tauchen automatisch auf der Uebersicht /case-studys
 * sowie unter /case-studys/{slug} auf.
 */

export interface CaseValueBlock {
  /** Nummer/Kuerzel fuer die Icon-Auswahl (kalender, dashboard, ...). */
  iconKey:
    | 'calendar'
    | 'dashboard'
    | 'automation'
    | 'document'
    | 'shield'
    | 'bell';
  title: string;
  description: string;
}

export interface CaseStudy {
  slug: string;
  /** Kurzname fuer Overview-Karte und Header. */
  company: string;
  /** Branche/Kategorie. */
  category: string;
  /** Kurze Ergebnis-Zeile fuer die Overview-Karte. */
  resultTeaser: string;
  /** Screenshot-Pfad in /public. Wird als Hero-/Dashboard-Bild genutzt. */
  screenshot: string;
  /** Alt-Text fuer den Screenshot. */
  screenshotAlt: string;
  hero: {
    headline: string;
    subline: string;
  };
  problem: {
    headline: string;
    paragraphs: string[];
  };
  situation: {
    headline: string;
    paragraphs: string[];
  };
  values: {
    headline: string;
    intro: string;
    blocks: CaseValueBlock[];
  };
  results: {
    headline: string;
    points: string[];
    closing: string;
  };
  bridge: {
    headline: string;
    paragraphs: string[];
  };
  technical: {
    headline: string;
    paragraph: string;
  };
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'bacara-aesthetik',
    company: 'Bacara Ästhetik',
    category: 'Ästhetische Medizin',
    resultTeaser: 'Über 800 Termine online gebucht, ohne einen einzigen Anruf.',
    screenshot: '/images/bacara-dashboard.png',
    screenshotAlt:
      'Dashboard von Bacara Ästhetik mit Terminübersicht, Patientenverwaltung und Automatisierungen auf einen Blick.',
    hero: {
      headline: 'Deine Praxis läuft. Der Papierkram frisst deinen Feierabend.',
      subline:
        'So haben wir für Bacara Ästhetik aus Zettelwirtschaft, drei verschiedenen Tools und ständigen Rückrufen ein einziges System gemacht. Termine buchen sich jetzt von selbst.',
    },
    problem: {
      headline: 'Kennst du das?',
      paragraphs: [
        'Du bist gut in dem was du machst. Deine Patienten kommen gerne, dein Kalender ist voll. Aber abends sitzt du am Schreibtisch und tippst Termine ab, schreibst Rechnungen, suchst in WhatsApp nach einer Anfrage von letzter Woche.',
        'Eine Patientin will einen Termin. Sie ruft an, keiner geht ran, sie schreibt eine Mail, die geht unter. Am Ende bucht sie woanders.',
        'Deine Website ist ein digitaler Flyer. Sie sieht okay aus, aber sie nimmt dir keine Arbeit ab. Die Termine landen trotzdem alle bei dir auf dem Tisch.',
        'Du wolltest eigentlich behandeln, nicht verwalten.',
      ],
    },
    situation: {
      headline: 'So war es bei Bacara Ästhetik',
      paragraphs: [
        'Dr. Bacara führt eine ästhetisch-medizinische Privatpraxis in Bünde. Die Behandlungen erstklassig, die Nachfrage da. Aber die Organisation lief über einen Flickenteppich: eine Wix-Website, ein externes Buchungstool, Excel-Listen und viel Handarbeit.',
        'Jeder Termin musste manuell eingetragen werden. Patientendaten lagen an mehreren Stellen. Erinnerungen an Termine, Bewertungsanfragen, alles per Hand oder gar nicht.',
        'Das kostet Zeit, jeden Tag. Und Zeit ist in einer Praxis das Knappste was es gibt.',
      ],
    },
    values: {
      headline: 'Ein System statt fünf Baustellen',
      intro:
        'Wir haben alles zusammengeführt. Website, Terminverwaltung und ein eigenes Portal für Patienten. Alles an einem Ort, alles in Deutschland gehostet, alle Daten sicher.',
      blocks: [
        {
          iconKey: 'calendar',
          title: 'Termine buchen sich von selbst',
          description:
            'Patienten wählen online ihre Behandlung, sehen freie Zeiten in Echtzeit und buchen selbst. Kein Anruf, kein Rückruf, kein Termin der verloren geht.',
        },
        {
          iconKey: 'dashboard',
          title: 'Alles über einen Bildschirm',
          description:
            'Ein Dashboard zeigt den Tag auf einen Blick. Wer kommt, welche Rechnungen offen sind, was ansteht. Die Patientenakte hat alles an einem Ort.',
        },
        {
          iconKey: 'automation',
          title: 'Die Routine läuft ohne dich',
          description:
            'Terminerinnerungen, Bewertungsanfragen, Geburtstagsgrüße, Hinweise wenn ein Produkt zur Neige geht. Das System schickt das automatisch raus. Einmal einstellen, dann läuft es.',
        },
        {
          iconKey: 'document',
          title: 'Einwilligungen digital, kein Papier mehr',
          description:
            'Der Patient unterschreibt direkt auf dem iPad. Alles wird sicher gespeichert und ist jederzeit auffindbar.',
        },
        {
          iconKey: 'shield',
          title: 'Alle Daten sicher in Deutschland',
          description:
            'Patientendaten verlassen den deutschen Server nicht. Verschlüsselt, DSGVO-konform, jeder Zugriff protokolliert.',
        },
        {
          iconKey: 'bell',
          title: 'Erinnerungen und Bestätigungen automatisch',
          description:
            'Jede Buchung wird bestätigt, an jeden Termin wird erinnert. Weniger Ausfälle, weniger Rückfragen.',
        },
      ],
    },
    results: {
      headline: 'Was sich verändert hat',
      points: [
        'Über 800 Termine online gebucht, ohne einen einzigen Anruf.',
        'Ein System statt fünf. Weniger Klicks, weniger Suchen, weniger Fehler.',
        'Die tägliche Verwaltung läuft größtenteils automatisch.',
        'Alle Patientendaten sicher und DSGVO-konform in Deutschland.',
      ],
      closing:
        'Dr. Bacara kann sich wieder auf das konzentrieren was zählt. Die Patienten.',
    },
    bridge: {
      headline: 'Nicht nur für Praxen',
      paragraphs: [
        'Das Gleiche was hier für eine Arztpraxis läuft, funktioniert genauso für andere Betriebe. Ein Handwerker der Anfragen und Angebote verwaltet. Ein Studio das Termine vergibt. Ein Dienstleister der den Überblick über Kunden und Rechnungen behalten will.',
        'Wenn dein Geschäft läuft, du aber zu viel Zeit mit Verwaltung verlierst, dann bauen wir dir ein System das dir genau diese Zeit zurückgibt.',
        'Kein Baukasten von der Stange. Etwas das zu deinem Betrieb passt.',
      ],
    },
    technical: {
      headline: 'Für alle die es genau wissen wollen',
      paragraph:
        'Komplett selbst entwickelt, kein fertiges System von der Stange. Gehostet in Deutschland bei Mittwald, Patientendaten verlassen den deutschen Server nicht. Sensible Daten verschlüsselt in der Datenbank. Zugriffe werden lückenlos protokolliert. Rechnungen GoBD-konform und unveränderbar. Rollen und Rechte für Inhaber, Ärzte und Mitarbeiter. Externer Kalender-Sync nur pseudonymisiert, extern erscheint kein Name und keine Behandlungsart.',
    },
  },
];

export function findCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
