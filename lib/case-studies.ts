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
    | 'bell'
    | 'configurator'
    | 'inbox'
    | 'cart'
    | 'panel'
    | 'search'
    | 'star'
    | 'chart';
  title: string;
  description: string;
}

export interface VideoTestimonial {
  /** YouTube-Video-ID (nur der Teil nach v=). */
  youtubeId: string;
  name: string;
  company: string;
  description: string;
  /** Alt-Text fuer das Thumbnail. */
  alt: string;
}

export interface CaseStudy {
  slug: string;
  /** Kurzname fuer Overview-Karte und Header. */
  company: string;
  /** Branche/Kategorie. */
  category: string;
  /** Kurze Ergebnis-Zeile fuer die Overview-Karte. */
  resultTeaser: string;
  /**
   * Icon-Key fuer die Overview-Karte. Ersetzt den Dashboard-Screenshot,
   * damit die Karten sofort erkennbar sind ohne "kaputt-aussehende"
   * geschwaerzte Bilder zu zeigen.
   */
  overviewIconKey: CaseValueBlock['iconKey'];
  /** Screenshot-Pfad in /public. Wird als Hero-/Dashboard-Bild genutzt. */
  screenshot: string;
  /** Alt-Text fuer den Screenshot. */
  screenshotAlt: string;
  hero: {
    headline: string;
    subline: string;
  };
  /** Kurzer Vorstellungs-Block direkt nach dem Hero: wer ist der
   *  Gruender, was macht der Betrieb. Damit der Leser sofort einordnen
   *  kann, ueber wen die Case eigentlich geht. */
  founder: {
    headline: string;
    paragraph: string;
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
  /** Optionales Video-Testimonial (YouTube-Lazy-Load-Card). */
  videoTestimonial?: VideoTestimonial;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'bacara-aesthetik',
    company: 'Bacara Ästhetik',
    category: 'Ästhetische Medizin',
    resultTeaser: 'Über 800 Termine online gebucht, ohne einen einzigen Anruf.',
    overviewIconKey: 'calendar',
    screenshot: '/images/bacara-dashboard.png',
    screenshotAlt:
      'Dashboard von Bacara Ästhetik mit Terminübersicht, Patientenverwaltung und Automatisierungen auf einen Blick.',
    hero: {
      headline: 'Deine Praxis läuft. Der Papierkram frisst deinen Feierabend.',
      subline:
        'So haben wir für Bacara Ästhetik aus Zettelwirtschaft, drei verschiedenen Tools und ständigen Rückrufen ein einziges System gemacht. Termine buchen sich jetzt von selbst.',
    },
    founder: {
      headline: 'Wer steht hinter Bacara Ästhetik?',
      paragraph:
        'Dr. Bugrahan Bacara führt seine Privatpraxis für ästhetische Medizin in Bünde. Botox, Hyaluron, Peelings, Fadenlifting. Behandlungen die Vertrauen brauchen, weil man das Ergebnis im Gesicht trägt. Die Praxis hat sich als eine der führenden Adressen für minimalinvasive Ästhetik in Ostwestfalen etabliert. Die Nachfrage ist da, die Bewertungen sind top.',
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
    videoTestimonial: {
      youtubeId: '2N4I0o2B_bQ',
      name: 'Dr. Bugrahan Bacara',
      company: 'Bacara Ästhetik, Bünde',
      description:
        'Website-Relaunch und Social-Media-Aufbau für eine der führenden Ästhetik-Praxen in OWL.',
      alt: 'Dr. Bugrahan Bacara Kundenstimme',
    },
  },
  {
    slug: 'carhifi-herford',
    company: 'CarHifi Herford',
    category: 'Car-Hifi und Fachhandel',
    resultTeaser:
      'Aus zwanzig Minuten Telefonat wurden dreißig Sekunden Konfigurator.',
    overviewIconKey: 'configurator',
    screenshot: '/images/carhifi-dashboard.png',
    screenshotAlt:
      'Backend von CarHifi Herford mit Fahrzeug-Datenbank, Soundpaketen und Bestellübersicht.',
    hero: {
      headline: 'Jede Anfrage ein 20-Minuten-Telefonat. Jeden Tag aufs Neue.',
      subline:
        'So haben wir für CarHifi-Herford aus einer alten Visitenkarten-Website ein System gemacht, das Kunden selbst durch die Beratung führt und Anfragen fertig vorbereitet einsammelt.',
    },
    founder: {
      headline: 'Wer steht hinter CarHifi Herford?',
      paragraph:
        'Halim Özdemir betreibt CarHifi Herford seit über zehn Jahren. Auto-Soundsysteme, Subwoofer, Endstufen, Dämmung. Wer in Ostwestfalen ordentlich Sound in seinem Wagen will, kommt zu ihm. Die Bewertungen sind top, die Werkstatt gut ausgelastet. Aber das meiste läuft noch über Telefon und Vor-Ort-Beratung.',
    },
    problem: {
      headline: 'Kennst du das?',
      paragraphs: [
        'Du kannst dein Handwerk. Deine Kunden vertrauen dir. Aber jeden Tag erklärst du am Telefon das Gleiche. Was passt in welches Auto, was kostet es, was bringt es.',
        'Ein Kunde ruft an, will wissen welcher Lautsprecher in seinen Wagen passt. Zwanzig Minuten später weiß er es. Der nächste ruft an, die gleiche Frage von vorne.',
        'Deine Website? Eine digitale Visitenkarte. Wer etwas kaufen will, muss anrufen oder vorbeikommen. Und wenn du was ändern willst, brauchst du jemanden der das für dich macht.',
      ],
    },
    situation: {
      headline: 'So war es bei CarHifi-Herford',
      paragraphs: [
        'Halim führt einen Car-Hifi-Betrieb in Herford. Er kennt sich aus, seine Kunden sind zufrieden, die Bewertungen top. Aber die Website war zehn Jahre alt. Eine reine Visitenkarte.',
        'Kein Shop. Kein Weg für Kunden herauszufinden was in ihr Auto passt. Jede Anfrage lief über Telefon oder Laufkundschaft. Auf dem Handy kaum bedienbar, bei Google fast nicht mehr auffindbar.',
        'Jede Beratung fing bei null an. Das kostet Zeit, jeden Tag.',
      ],
    },
    values: {
      headline: 'Von der Visitenkarte zum System',
      intro:
        'Wir haben aus der alten Seite ein System gemacht, das rund um die Uhr für Halim arbeitet. Es berät, es verkauft, es sammelt Anfragen ein. Auch wenn der Laden zu ist.',
      blocks: [
        {
          iconKey: 'configurator',
          title: 'Der Konfigurator berät statt dir',
          description:
            'Kunde wählt Auto, Modell und Werksanlage. Das System schlägt passende Soundpakete vor. Vorher zwanzig Minuten am Telefon. Jetzt dreißig Sekunden.',
        },
        {
          iconKey: 'inbox',
          title: 'Anfragen kommen fertig vorbereitet rein',
          description:
            'Ein Klick und die Anfrage landet bei Halim, mit allen Infos ausgefüllt. Kein Rätselraten, kein Nachfragen.',
        },
        {
          iconKey: 'cart',
          title: 'Der Shop verkauft rund um die Uhr',
          description:
            'Produkte online kaufbar. Warenkorb, Bezahlung, Kundenkonto. Jede Bestellung landet sofort im System.',
        },
        {
          iconKey: 'panel',
          title: 'Halim pflegt alles selbst',
          description:
            'Autos, Soundpakete, Produkte, Bestellungen. Alles über ein aufgeräumtes Backend. Ohne Technik-Wissen, ohne Agentur für jede Änderung.',
        },
        {
          iconKey: 'search',
          title: 'Google findet die Seite wieder',
          description:
            'Modern, schnell, mobil optimiert. Lokale Kunden landen jetzt bei Halim statt bei der Konkurrenz.',
        },
        {
          iconKey: 'star',
          title: 'Bewertungen und Content arbeiten mit',
          description:
            'Echte Google-Bewertungen laufen direkt auf der Seite. TikTok-Videos eingebunden. Content den er eh macht, verkauft mit.',
        },
      ],
    },
    results: {
      headline: 'Was sich verändert hat',
      points: [
        'Aus zwanzig Minuten Telefonat werden dreißig Sekunden Konfigurator.',
        'Anfragen und Bestellungen landen automatisch im System, keine Mail geht mehr verloren.',
        'Halim pflegt alles selbst, ohne Agentur für jede Änderung.',
        'Die Seite verkauft und berät rund um die Uhr, auch wenn der Laden zu ist.',
      ],
      closing:
        'Halim muss nicht mehr jede Anfrage von Grund auf erklären. Das System macht die Vorarbeit, er macht den Abschluss.',
    },
    bridge: {
      headline: 'Nicht nur für Car-Hifi',
      paragraphs: [
        'Das Gleiche was hier für einen Car-Hifi-Betrieb läuft, funktioniert für jeden der beratungsintensive Produkte oder Leistungen verkauft. Eine Werkstatt. Ein Fachhändler. Ein Handwerker der ständig die gleichen Fragen beantwortet.',
        'Wenn du jeden Tag das Gleiche erklärst und Anfragen an dir hängenbleiben, dann bauen wir dir ein System das die Vorarbeit übernimmt.',
        'Kein Baukasten von der Stange. Etwas das zu deinem Betrieb passt.',
      ],
    },
    technical: {
      headline: 'Für alle die es genau wissen wollen',
      paragraph:
        'Individuell entwickelt, kein fertiges System von der Stange. Online-Shop mit Bezahlung über Stripe. Eigene Fahrzeug-Datenbank mit Marken, Modellen, Generationen und Werksanlagen, an die Halim seine Soundpakete koppelt. Alles hängt zusammen, eine Änderung wirkt überall. Google-Bewertungen und TikTok live eingebunden. Impressum, AGB, Datenschutz und Cookie-Banner rechtssicher.',
    },
  },
  {
    slug: 'kolac-digital',
    company: 'Kolac Digital',
    category: 'Eigenes Backoffice',
    resultTeaser:
      'Angebote, Rechnungen, Verträge, Steuer. Ein Klick statt fünf Tools.',
    overviewIconKey: 'dashboard',
    screenshot: '/images/kolac-digital-dashboard.png',
    screenshotAlt:
      'Kolac Digital Dashboard mit Kunden, Vertrieb, Rechnungen, Verträgen, Ausgaben und UStVA-Übersicht.',
    hero: {
      headline:
        'Ich predige kein Wasser und trinke Wein. Das System, mit dem ich meine Agentur führe.',
      subline:
        'Kunden, Angebote, Verträge, Rechnungen, Belege, Steuer. Alles in einem selbst gebauten Dashboard. Weil ich meinen Kunden nichts empfehlen will, was ich nicht selbst benutze.',
    },
    founder: {
      headline: 'Wer steht hinter Kolac Digital?',
      paragraph:
        'Yusuf Kolac betreibt Kolac Digital aus Bielefeld. Webseiten, Systeme und digitale Prozesse für kleine und mittelständische Betriebe in OWL, NRW und ganz Deutschland. Wenn du eine Praxis, eine Werkstatt oder einen Fachhandel führst und in der Verwaltung ertrinkst, bin ich der, der dir ein System baut das dir das abnimmt.',
    },
    problem: {
      headline: 'Kennst du das?',
      paragraphs: [
        'Du hast eine kleine Firma. Angebote in Word. Rechnungen in einem alten Programm. Belege in einem Ordner, oder auf dem Handy, oder in beiden. Verträge werden gedruckt, unterschrieben, abgeheftet.',
        'Am Monatsende sitzt du am Rechner und sortierst. Was ist reingekommen, was ist rausgegangen, was fehlt noch. Umsatzsteuer-Voranmeldung wird zum eigenen Projekt.',
        'Es funktioniert. Aber es kostet dich jeden Monat einen Tag. Und wenn du dir was Neues aufbaust, wird es nicht besser sondern schlimmer.',
      ],
    },
    situation: {
      headline: 'So war es bei mir selbst',
      paragraphs: [
        'Ich baue Systeme die Betriebe entlasten. Aber ich selbst hatte lange keins. Excel für Einnahmen, ein anderes für Ausgaben, Word für Angebote, DocuSign für Verträge, ein Terminplaner nebendran. Belege in Google Drive, halb sortiert.',
        'Wenn ein Kunde eine Rechnung wollte, dauerte das zehn Minuten. Wenn er einen Vertrag zum Unterschreiben brauchte, noch länger. Und am Monatsende die Buchhaltung, immer die gleiche Sortier-Arbeit.',
        'Das war nicht das Bild, das ich nach außen vermittelt habe. Und irgendwann war klar: das muss ich mir selbst bauen.',
      ],
    },
    values: {
      headline: 'Ein Dashboard, das die Verwaltung übernimmt',
      intro:
        'Ich habe mir das gebaut, was ich meinen Kunden verspreche. Alles was in einer Agentur oder einem kleinen Betrieb anfällt, läuft an einem Ort zusammen. Wo möglich, macht das System die Arbeit von selbst.',
      blocks: [
        {
          iconKey: 'automation',
          title: 'Monatliche Rechnungen laufen von allein',
          description:
            'Kunden mit Wartungsvertrag werden per SEPA-Lastschrift eingezogen. Sobald das Geld da ist, wird die Rechnung erstellt, per Mail verschickt und in Drive gesichert. Ich bekomme nur eine Bestätigung.',
        },
        {
          iconKey: 'document',
          title: 'Verträge digital unterschreiben',
          description:
            'PDF hochladen, Signaturfeld markieren, Link schicken. Der Kunde unterschreibt am Handy mit dem Finger. Beide bekommen das signierte PDF zurück, mit Audit-Trail für die Rechtssicherheit.',
        },
        {
          iconKey: 'inbox',
          title: 'Belege werden erkannt statt getippt',
          description:
            'Foto von einem Beleg reicht. Betrag, Datum, Lieferant und Kategorie werden automatisch ausgelesen. Ich kontrolliere kurz, speichere, fertig.',
        },
        {
          iconKey: 'panel',
          title: 'Steuer-Voranmeldung ohne Sortier-Marathon',
          description:
            'Monat auswählen, alles ist schon fertig aufgeteilt. USt, Vorsteuer, Reverse Charge für Meta und Google. Drei CSV-Exporte, ab damit ins ELSTER.',
        },
        {
          iconKey: 'dashboard',
          title: 'Vertrieb, Kunden, Angebote an einem Ort',
          description:
            'Pipeline als Kanban, Kunden mit voller Historie, Angebote werden auf Klick zu Rechnungen. Was ich brauche, ist einen Klick weit weg, statt in fünf Tools verstreut.',
        },
        {
          iconKey: 'chart',
          title: 'Berichte zeigen was wirklich läuft',
          description:
            'Umsatz, Ausgaben, Gewinn pro Monat. Auf welchen Kunden ich meine Zeit verbrannt habe und welcher wirklich zieht. Statt einmal im Jahr eine Überraschung vom Steuerberater ein klarer Blick jederzeit.',
        },
      ],
    },
    results: {
      headline: 'Was sich verändert hat',
      points: [
        'Monatliche Retainer-Rechnungen brauchen null Klicks. Ich sehe sie erst, wenn sie beim Kunden im Postfach sind.',
        'Verträge sind nach 3 Minuten unterschrieben und archiviert, statt am nächsten Tag per Post.',
        'Belege werden beim Kauf sofort abfotografiert und sind für immer weg. Nicht mehr als Sortier-Stapel am Ende des Monats.',
        'Die Umsatzsteuer-Voranmeldung mache ich in unter 15 Minuten. Vorher war das ein Nachmittag.',
      ],
      closing:
        'Ich habe wieder Zeit für das, wofür ich mein Geld verdiene. Für Kunden und für neue Projekte.',
    },
    bridge: {
      headline: 'Genau so bauen wir es auch für dich',
      paragraphs: [
        'Das Dashboard hier ist auf eine Digitalagentur zugeschnitten. Für dich wäre es anders geschnitten. Andere Bereiche, andere Automatisierungen, andere Reports.',
        'Aber die Kernidee bleibt: alles was du jeden Tag oder jeden Monat brauchst, an einem Ort. Wo möglich, macht das System die Arbeit für dich.',
        'Kein Baukasten von der Stange. Etwas das zu deinem Betrieb passt.',
      ],
    },
    technical: {
      headline: 'Für alle die es genau wissen wollen',
      paragraph:
        'Komplett selbst entwickelt mit Next.js. Firebase Firestore als Datenbank, Firebase Storage für Dateien, Firebase Auth für Login. Datenbank und Storage nur für meine E-Mail freigegeben, kein Self-Signup, sonst nichts. Alle API-Routen prüfen den Firebase-ID-Token gegen meine feste User-ID. Öffentliche Endpoints (Signing-Links für Verträge, GoCardless-Webhook, Cron) sind Token- oder HMAC-geschützt und laufen nur bei gültiger Signatur. Rechnungen und Angebote als PDF mit @react-pdf/renderer, Verträge signiert mit pdf-lib und Audit-Trail. Belegerkennung über Claude Vision. Zahlungsabwicklung über GoCardless mit HMAC-SHA256-Webhooks. Auto-Backup in Google Drive und Google Sheets über OAuth. Deployment auf Vercel mit HTTPS und täglichen Cron-Jobs. Alle Secrets als Environment Variables, nichts im Client-Code.',
    },
  },
];

export function findCaseStudy(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
