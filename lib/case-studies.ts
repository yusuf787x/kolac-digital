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

/** Weiterer Screenshot fuer die Galerie unter dem Haupt-Screenshot.
 *  Wird auch von lib/portfolio.ts genutzt. */
export interface ProjectScreenshot {
  /** Pfad in /public, am besten im Format 16:10. */
  src: string;
  alt: string;
  /** Kurze Ueberschrift ueber dem Bild. */
  title: string;
  /** Ein bis zwei Saetze, was man im Bild sieht. */
  caption: string;
  /** Adresszeile im Browser-Mockup. */
  url: string;
}

export interface CaseStudy {
  slug: string;
  /** Optionaler SEO-Titel. Ohne Angabe: "{company} · Case Study · Kolac Digital". */
  metaTitle?: string;
  /** Optionale Meta-Beschreibung. Ohne Angabe: resultTeaser. */
  metaDescription?: string;
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
  /** Fiktive URL in der Browser-Mockup-Adresszeile (z.B. dashboard.beispiel.de). */
  dashboardUrl: string;
  /** Kopfzeile + kurze Einleitung ueber dem Screenshot-Mockup. */
  screenshotSection: {
    headline: string;
    description: string;
  };
  /** Optionale weitere Screenshots, erscheinen unter dem Haupt-Screenshot. */
  gallery?: ProjectScreenshot[];
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
    dashboardUrl: 'dashboard.bacara-aesthetik.de',
    screenshotSection: {
      headline: 'So sieht der Überblick aus',
      description:
        'Termine heute, offene Rechnungen, neue Buchungen. Links die ganze Praxis: Kalender, Patienten, Einwilligungen, Automatisierungen, Warenwirtschaft. Alles an einem Ort.',
    },
    hero: {
      headline: 'Deine Praxis läuft. Der Papierkram frisst deinen Feierabend.',
      subline:
        'So haben wir für Bacara Ästhetik aus Zettelwirtschaft, drei verschiedenen Tools und ständigen Rückrufen ein einziges System gemacht. Termine buchen sich jetzt von selbst.',
    },
    founder: {
      headline: 'Wer steht hinter Bacara Ästhetik?',
      paragraph:
        'Dr. Bugrahan Bacara führt seine Privatpraxis für ästhetische Medizin in Bünde. Botox, Hyaluron, Vitamininfusionen etc.. Behandlungen die Vertrauen brauchen, weil man das Ergebnis im Gesicht trägt. Die Praxis hat sich als eine der führenden Adressen für minimalinvasive Ästhetik in Ostwestfalen etabliert. Die Nachfrage ist da, die Bewertungen sind top.',
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
    slug: 'akquise-helfer',
    company: 'Akquise-Helfer',
    category: 'Vertriebsdienstleister',
    resultTeaser:
      'Vier Unternehmen, zwei Inhaber, ein System. Nachdem mehrere Dienstleister abgesagt hatten.',
    overviewIconKey: 'panel',
    screenshot: '/images/akquisehelfer-dashboard.jpg',
    screenshotAlt:
      'Dashboard der Individualsoftware von Akquise-Helfer mit konsolidierter Ansicht über vier Unternehmen, Umsatzsteuer je Person und Aufschlüsselung je Betrieb. Konkrete Zahlen sind unkenntlich gemacht.',
    dashboardUrl: 'system.akquise-helfer.de',
    screenshotSection: {
      headline: 'Ein Cockpit für vier Unternehmen',
      description:
        'Oben die konsolidierte Sicht über alle Betriebe, rechts die Umsatzsteuer je Person, unten die Aufschlüsselung je Unternehmen mit eigener EÜR. Links die dreizehn Bereiche, die je Unternehmen einzeln freigeschaltet werden. Die Beträge im Bild sind unkenntlich gemacht.',
    },
    hero: {
      headline: 'Die Software, die angeblich nicht baubar war',
      subline:
        'Akquise-Helfer hatte mit mehreren Dienstleistern gesprochen. Alle sagten ab: zu komplex, nicht umsetzbar. Heute läuft das System auf dem eigenen Server und deckt Buchhaltung, Vertrieb und Projekte für vier Unternehmen ab.',
    },
    founder: {
      headline: 'Wer dahintersteht',
      paragraph:
        'Akquise-Helfer aus Hofbieber macht strategische Telefonakquise und Kundengewinnung für mittelständische Betriebe. Kein Callcenter-Skript, keine Provision, keine Mindestlaufzeit. Geführt wird das Unternehmen von zwei Personen, die daneben noch weitere Firmen betreiben. Genau daraus entstand die Aufgabe, an der andere gescheitert sind.',
    },
    problem: {
      headline: 'Warum Standardsoftware hier nicht funktioniert',
      paragraphs: [
        'Zwei Inhaber, vier Unternehmen, teils gemeinsam geführt, teils strikt getrennt. Das eine Unternehmen gehört steuerlich der einen Person, ein anderes der zweiten, eines wird gemeinsam bespielt. Wer welche Zahlen sehen darf, ist in jedem Fall anders.',
        'Handelsübliche Buchhaltungsprogramme kennen genau ein Unternehmen. Wer mehrere führt, zahlt mehrere Lizenzen, pflegt Kunden mehrfach und hat trotzdem keinen Blick über alles. Umgekehrt zeigen Mehrfirmen-Systeme jedem alles, sobald er drin ist. Beides passte nicht.',
        'Dazu kam die steuerliche Feinheit: Jedes Unternehmen gibt eine eigene EÜR ab, die Umsatzsteuer wird aber je Person zusammengefasst, weil umsatzsteuerlich die Person der Unternehmer ist. Kein Standardprodukt bildet das ab.',
        'Mehrere Dienstleister wurden angefragt. Alle winkten ab. Die Begründung war jedes Mal ähnlich: zu komplex, nicht sinnvoll umsetzbar.',
      ],
    },
    situation: {
      headline: 'Was vorher der Alltag war',
      paragraphs: [
        'Belege sammelten sich in Monatsordnern, die Zuordnung passierte im Kopf oder in Tabellen. Rechnungen und Angebote entstanden in getrennten Dokumenten, Kunden lagen mehrfach in verschiedenen Listen.',
        'Beim Blick auf die Zahlen musste jedes Unternehmen einzeln zusammengesucht werden. Eine Frage wie "wie stehen wir insgesamt da" war eine halbe Tagesaufgabe.',
        'Für ein Unternehmen, dessen Kerngeschäft die systematische Akquise für andere ist, war das ein unangenehmer Widerspruch: außen Struktur verkaufen, innen mit Ordnern arbeiten.',
      ],
    },
    values: {
      headline: 'Was wir gebaut haben',
      intro:
        'Kein Baukasten, kein zugekauftes System. Eine Anwendung, die genau die Struktur dieses Unternehmens abbildet und auf dem eigenen Server läuft.',
      blocks: [
        {
          iconKey: 'panel',
          title: 'Trennung von Eigentum und Zugriff',
          description:
            'Wem ein Unternehmen steuerlich gehört und wer es sehen darf, sind zwei verschiedene Dinge. Genau so ist es gebaut. Ein Betrieb kann gemeinsam bespielt werden, während zwei andere für die jeweils andere Person unsichtbar bleiben, nicht einmal im Umschalter tauchen sie auf.',
        },
        {
          iconKey: 'shield',
          title: 'Rechte als Matrix aus Unternehmen mal Bereich',
          description:
            'Ein Mitarbeiter hat keine feste Rolle, sondern je Unternehmen eine eigene Auswahl an Bereichen. Eine Aushilfe sieht bei einem Betrieb nur Leads und Zeiterfassung, bei den anderen gar nichts. Nicht freigegebene Bereiche verschwinden aus der Navigation, der direkte Aufruf wird abgefangen.',
        },
        {
          iconKey: 'chart',
          title: 'EÜR je Unternehmen, Umsatzsteuer je Person',
          description:
            'Jeder Betrieb gibt seine eigene Einnahmenüberschussrechnung ab. Die Umsatzsteuer wird dagegen je Person zusammengefasst, weil das steuerlich so gehört. Dazu eine Gesamtübersicht über alles für die Führungsebene.',
        },
        {
          iconKey: 'inbox',
          title: 'Belege lesen sich selbst ein',
          description:
            'Der Ordner in der Cloud wird abgerufen, Datum, Betrag, Absender und Umsatzsteuer werden erkannt und als Entwurf angelegt. Was nicht sicher gelesen wurde, etwa eine abfotografierte Quittung, wird als unsicher markiert statt still falsch übernommen. Beim Prüfen steht das Dokument direkt neben dem Formular.',
        },
        {
          iconKey: 'document',
          title: 'Rechnungen und Angebote als echtes PDF',
          description:
            'Die Vorschau im Dialog ist das Dokument, das später beim Kunden landet, und sie aktualisiert sich beim Tippen. Positionen können Überschriften, Fließtext oder optionale Zeilen sein. Layout, Logo, Akzentfarbe und Bankverbindung sind je Unternehmen einstellbar, inklusive QR-Code fürs Überweisen.',
        },
        {
          iconKey: 'automation',
          title: 'Nach Zahlungseingang gerechnet',
          description:
            'Maßgeblich ist das Datum, an dem das Geld geflossen ist, nicht das Rechnungsdatum. Eine als bezahlt markierte Rechnung fällt automatisch in die Voranmeldung dieses Zeitraums. Unbezahlte Rechnungen tauchen in keiner Voranmeldung und in keiner EÜR auf.',
        },
        {
          iconKey: 'search',
          title: 'Leads, Kunden und Projekte in einem Strang',
          description:
            'Das Kerngeschäft ist Akquise, also liegt das Lead-Management im selben System wie alles andere. Kunden haben mehrere Ansprechpartner, Tags und Wiedervorlagen. Ein Negativ-Filter beantwortet Fragen wie: zeige alle Kontakte, die nicht angerufen wurden und keine Wiedervorlage haben.',
        },
        {
          iconKey: 'calendar',
          title: 'Zeiten, Reisekosten und Widerspruchserkennung',
          description:
            'Zeiten werden je Projekt und Person erfasst und lassen sich auswerten. Bei den Reisekosten rechnet das System Familienheimfahrten und Unterwegstage nach den geltenden Sätzen und meldet sich, wenn sich zwei Angaben am selben Tag widersprechen.',
        },
      ],
    },
    results: {
      headline: 'Was sich geändert hat',
      points: [
        'Vier Unternehmen laufen in einem System statt in vier getrennten Insellösungen.',
        'Die Frage nach dem Gesamtbild beantwortet ein Blick aufs Dashboard statt einer Sammelaktion.',
        'Belege kommen aus dem Cloud-Ordner herein und werden vorausgefüllt, statt einzeln abgetippt zu werden.',
        'Jede Person sieht genau die Unternehmen und Bereiche, die für sie gedacht sind, ohne dass jemand daran denken muss.',
        'Die Buchhaltung folgt der tatsächlichen Steuersystematik: EÜR je Betrieb, Umsatzsteuer je Person, gerechnet nach Zahlungseingang.',
        'Alle Daten liegen auf dem eigenen Server des Kunden, nicht bei einem Anbieter.',
      ],
      closing:
        'Das Entscheidende ist nicht die Zahl der Bereiche, sondern dass die Software der Struktur des Unternehmens folgt statt umgekehrt. Genau daran waren die vorherigen Anfragen gescheitert.',
    },
    bridge: {
      headline: 'Wann sich so etwas lohnt',
      paragraphs: [
        'Nicht jeder Betrieb braucht eine eigene Software. Wer ein Unternehmen führt und mit einem üblichen Buchhaltungsprogramm zurechtkommt, sollte dabei bleiben. Das sagen wir auch im Erstgespräch, wenn es so ist.',
        'Interessant wird es, sobald die eigene Struktur nicht in fertige Produkte passt: mehrere Firmen, ungewöhnliche Zuständigkeiten, Abläufe, die sonst niemand so hat. Dann zahlt man bei Standardlösungen doppelt, einmal für die Lizenz und einmal für die Umwege im Alltag.',
        'Wenn du dir gerade anhörst, dass dein Vorhaben zu komplex sei, lohnt sich ein zweites Gespräch. Manchmal ist es das. Oft ist es nur noch nicht sauber zerlegt worden.',
      ],
    },
    technical: {
      headline: 'Technisch dahinter',
      paragraph:
        'Next.js mit React, Docker als Container, Caddy als vorgelagerter Server mit verschlüsselter Verbindung. Gehostet auf dem eigenen Server des Kunden, ausdrücklich auf dessen Wunsch. PDFs werden im Browser erzeugt und selbst gerendert statt an den Betrachter des Browsers abgegeben, damit die Vorschau überall gleich aussieht. Die Belegerkennung und die Cloud-Anbindung laufen über eine eigene Server-Schicht, Zugangsdaten liegen verschlüsselt in einem eigenen Speicherbereich.',
    },
  },
  {
    slug: 'wagenpuls',
    metaTitle:
      'Branchensoftware entwickeln lassen: wagenpuls für Autohändler · Case Study',
    metaDescription:
      'Wie Kolac Digital mit wagenpuls eine Branchensoftware für Autohändler als SaaS entwickelt hat. Ankauf, Bestand, §25a, Verträge und mobile.de in einem System, in rund acht Wochen marktreif.',
    company: 'wagenpuls',
    category: 'Branchensoftware für Autohändler',
    resultTeaser:
      'Eine eigene Branchensoftware für Autohändler, als SaaS-Produkt in rund acht Wochen marktreif.',
    overviewIconKey: 'chart',
    screenshot: '/images/wagenpuls/ueberblick.webp',
    screenshotAlt:
      'Überblick von wagenpuls, der Software für Autohändler: Rohertrag des Monats, verkaufte Fahrzeuge, Standzeit, überfällige Zahlungen und gebundenes Kapital. Alle Daten sind erfundene Beispieldaten.',
    dashboardUrl: 'wagenpuls.de',
    screenshotSection: {
      headline: 'So sieht der Händler seinen Betrieb',
      description:
        'Oben der Rohertrag des Monats, verkaufte Fahrzeuge und die durchschnittliche Standzeit. Darunter die überfälligen Zahlungen und das Kapital, das gerade auf dem Hof steht. Links die elf Bereiche vom Ankauf bis zu den Auswertungen. Alle Zahlen im Bild sind Beispieldaten.',
    },
    gallery: [
      {
        src: '/images/wagenpuls/ankaufsrechner.webp',
        alt: 'Ankaufsanfrage in wagenpuls mit Ankaufsrechner, der aus Verkaufspreis, Aufbereitung, Transport und Zielmarge den maximalen Ankaufspreis nach §25a berechnet.',
        title: 'Ankauf: der Rechner sagt, was du höchstens zahlen darfst',
        caption:
          'Die Anfrage kommt über das Formular rein. Rechts rechnet wagenpuls rückwärts vom erwarteten Verkaufspreis über Aufbereitung, Transport, Zielmarge und Umsatzsteuer auf die Differenz bis zum maximalen Ankaufspreis. Das Angebot geht aus derselben Ansicht raus.',
        url: 'wagenpuls.de/ankauf',
      },
      {
        src: '/images/wagenpuls/bestand.webp',
        alt: 'Bestandsliste in wagenpuls mit Fahrzeugkarten, Standtagen, Einkaufs- und Verkaufspreis, erwarteter Marge und Börsen-Häkchen für mobile.de und AutoScout24.',
        title: 'Bestand: Standtage und Marge auf jeder Karte',
        caption:
          'Jedes Fahrzeug zeigt Standtage, Einkauf, Kosten und erwartete Marge. Per Häkchen geht es zu mobile.de oder AutoScout24, darunter die Schnellaktionen von Reservierung bis Verkauf.',
        url: 'wagenpuls.de/fahrzeuge',
      },
      {
        src: '/images/wagenpuls/fahrzeugakte.webp',
        alt: 'Fahrzeugakte in wagenpuls mit Vorgangsleiste von Ankauf über Aufbereitung und Inserat bis Abrechnung sowie dem erwarteten Deckungsbeitrag.',
        title: 'Fahrzeugakte: der ganze Weg eines Autos an einer Stelle',
        caption:
          'Die Vorgangsleiste zeigt, wo das Fahrzeug gerade steht und was als Nächstes kommt. Kosten, Kalkulation, Fotos, Inserate und Dokumente hängen direkt am Fahrzeug, oben rechts steht immer der erwartete Deckungsbeitrag.',
        url: 'wagenpuls.de/fahrzeuge/akte',
      },
      {
        src: '/images/wagenpuls/kalkulation.webp',
        alt: 'Kalkulation in wagenpuls mit automatisch erkanntem Steuerfall Differenzbesteuerung nach §25a, Marge, Umsatzsteuer aus der Marge, Rohertrag und Preisuntergrenze.',
        title: 'Kalkulation: §25a ohne Kopfrechnen',
        caption:
          'Der Steuerfall wird aus dem Ankauf abgeleitet. Die Umsatzsteuer wird aus der Marge gerechnet, Kosten mindern die Bemessungsgrundlage nicht. Mit dem Regler spielt der Händler Verkaufspreise durch und sieht sofort, ab wann er draufzahlt.',
        url: 'wagenpuls.de/fahrzeuge/kalkulation',
      },
    ],
    hero: {
      headline: 'Eine eigene Branchensoftware für Autohändler. In acht Wochen am Markt.',
      subline:
        'wagenpuls ist eine Software für freie Autohändler, vom Ankauf bis zur Abrechnung. Wir haben sie konzipiert, gestaltet und entwickelt. Mit Selbstregistrierung, Bezahlung und Schnittstellen zu mobile.de und DATEV, in rund acht Wochen von der ersten Zeile bis zum Produkt am Markt.',
    },
    founder: {
      headline: 'Wer steht hinter wagenpuls?',
      paragraph:
        'Hinter wagenpuls steht die Flamira UG aus Göttingen. Flamira tritt als Anbieter auf und kümmert sich um Vertrieb und Marketing. Die Zielgruppe ist klar umrissen: freie Autohändler mit fünf bis hundertzwanzig Fahrzeugen, denen die etablierten Systeme zu groß, zu teuer und zu schwerfällig sind. Kolac Digital hat das Produkt gestaltet und umgesetzt, von der Fachlogik bis zur Landingpage.',
    },
    problem: {
      headline: 'Kennst du das?',
      paragraphs: [
        'Du kennst deine Branche besser als jeder Softwarehersteller. Du siehst jeden Tag, wo die Betriebe Zeit und Geld verlieren. Und du siehst auch, dass die Software, die es dafür gibt, entweder veraltet, überladen oder viel zu teuer ist.',
        'Die Idee für ein besseres Produkt ist da. Was fehlt, ist jemand, der sie baut. Große Softwarehäuser rechnen in Jahren und sechsstelligen Budgets. Freelancer bauen dir eine Oberfläche, aber nicht die Fachlogik dahinter. Und ein eigenes Entwicklerteam aufzubauen, bevor der erste Kunde zahlt, ist ein Risiko, das kaum jemand tragen will.',
        'Genau an dieser Stelle bleiben die meisten Ideen für eine eigene Branchensoftware liegen.',
      ],
    },
    situation: {
      headline: 'Die Ausgangslage im freien Autohandel',
      paragraphs: [
        'Freie Autohändler rechnen oft im Kopf. Was ein Fahrzeug nach Aufbereitung, Reparatur und Steuer wirklich gebracht hat, weiß man erst beim Steuerberater. Anfragen liegen in WhatsApp, im Postfach und auf Zetteln. Kaufverträge entstehen in Word, werden ausgedruckt, unterschrieben und wieder eingescannt.',
        'Dazu kommt das Steuerrecht. Wer von privat kauft, verkauft meist nach §25a UStG mit Differenzbesteuerung. Ein Fehler in der Marge kostet Umsatzsteuer, mit der niemand gerechnet hat. Die E-Rechnung muss längst empfangen werden, ausstellen wird ab 2027 Pflicht.',
        'Die etablierten Händlersysteme lösen das, kosten aber ein Vielfaches, oft mit Einrichtungsgebühr, Schulung und Außendienst. Für einen Hof mit zwanzig Autos rechnet sich das nicht. Genau diese Lücke sollte wagenpuls schließen: dieselben Grundfunktionen, selbst einzurichten, zu einem Preis, der auch für kleine Betriebe passt.',
      ],
    },
    values: {
      headline: 'Was wir gebaut haben',
      intro:
        'Keine Demo, kein Klickdummy. Ein mandantenfähiges Produkt, das Händler selbst testen, buchen und im Alltag nutzen. Am Anfang stand die Fachlogik für den Alltag eines Händlers, daraus wurde Schritt für Schritt ein Produkt für viele.',
      blocks: [
        {
          iconKey: 'chart',
          title: 'Marge je Fahrzeug in Echtzeit',
          description:
            'Jede Ausgabe hängt am Fahrzeug, nicht in einem Ordner daneben. Der Deckungsbeitrag oben in der Akte ändert sich mit jedem Beleg. Standtage, gebundenes Kapital und Preisuntergrenze sind jederzeit sichtbar.',
        },
        {
          iconKey: 'inbox',
          title: 'Ankaufsrechner, der rückwärts rechnet',
          description:
            'Alle Ankaufsanfragen landen an einer Stelle. Der Rechner sagt in Sekunden, was der Händler höchstens zahlen darf, damit seine Zielmarge nach Aufbereitung und Steuer steht. Anfragen, die älter als einen Tag sind, rutschen nach oben.',
        },
        {
          iconKey: 'shield',
          title: 'Steuerlogik nach §25a, abgesichert durch Tests',
          description:
            'Differenzbesteuerung, Regelbesteuerung, innergemeinschaftliche Lieferung und Ausfuhr werden aus Ankauf und Käufer abgeleitet. Die Rechenregeln sind durch automatisierte Tests abgesichert, damit eine Änderung an anderer Stelle die Steuer nicht unbemerkt verschiebt.',
        },
        {
          iconKey: 'document',
          title: 'Verträge, Rechnungen und Preisschilder aus einem Datensatz',
          description:
            'Kaufvertrag, Ankaufsvertrag, Übergabeprotokoll, Rechnung und Preisschild nach Pkw-EnVKV entstehen aus denselben Daten. Unterschrieben wird digital auf dem Handy des Kunden, mit Protokollseite und Prüfsumme.',
        },
        {
          iconKey: 'automation',
          title: 'mobile.de direkt angebunden',
          description:
            'Inserate gehen mit Bildern, Text und Ausstattung zu mobile.de, Änderungen werden übertragen, und nach dem Verkauf geht das Inserat von selbst offline. Anfragen aus den Börsen werden abgeholt, dem Fahrzeug zugeordnet und als Interessent angelegt.',
        },
        {
          iconKey: 'panel',
          title: 'Ein Produkt für viele Betriebe',
          description:
            'Händler registrieren sich selbst, testen vierzehn Tage mit Beispieldaten und buchen dann ein Paket. Jeder Betrieb ist technisch vom anderen getrennt, mit eigenen Benutzern, Rollen und Standorten.',
        },
        {
          iconKey: 'calendar',
          title: 'E-Rechnung, GoBD und DATEV eingebaut',
          description:
            'E-Rechnungen werden gelesen und im Format XRechnung ausgestellt. Festgeschriebene Belege lassen sich nicht mehr ändern. Der Steuerberater bekommt einen DATEV-Buchungsstapel statt eines Kartons voller Belege.',
        },
        {
          iconKey: 'dashboard',
          title: 'Ein Überblick, der sagt, was liegen bleibt',
          description:
            'Die Startseite zeigt keine Willkommensgrüße, sondern überfällige Zahlungen, Fahrzeuge ohne Preis, unbeantwortete Anfragen und Langsteher. Darunter die Zahlen des Monats im Vergleich zum Vormonat.',
        },
        {
          iconKey: 'search',
          title: 'Landingpage, Rundgang und Handbuch für Google',
          description:
            'Neben der Software haben wir den kompletten Auftritt gebaut: Landingpage, einen Rundgang mit echten Bildschirmfotos und ein Handbuch mit über siebzig Artikeln zu Fragen wie Differenzbesteuerung, Kaufvertrag oder Gewährleistung. So wird das Produkt dort gefunden, wo Händler suchen.',
        },
      ],
    },
    results: {
      headline: 'Was dabei herausgekommen ist',
      points: [
        'In rund acht Wochen von der ersten Zeile Code bis zum Produkt, das Händler selbst testen und buchen können.',
        'Elf Bereiche vom Ankauf über Bestand, Kalkulation, Verkauf und Finanzen bis zu den Auswertungen, in einer Anwendung.',
        'Die Steuerlogik und die übrigen Kernabläufe sind durch über tausend automatisierte Tests abgesichert.',
        'Schnittstellen zu mobile.de, AutoScout24, DATEV, sevdesk und Lexware Office sind im Produkt enthalten, nicht als Aufpreis.',
        'Selbstregistrierung, Testzugang mit Beispieldaten und Bezahlung laufen ohne Vertriebsgespräch.',
        'Server in Deutschland, Betriebe technisch getrennt, Anmeldung ohne Passwort über Einmal-Links.',
      ],
      closing:
        'Aus einer Idee mit viel Branchenwissen ist ein Produkt geworden, das am Markt steht und verkauft werden kann. Ohne eigenes Entwicklerteam und ohne jahrelange Entwicklungszeit.',
    },
    bridge: {
      headline: 'Wann es sich lohnt, eine Branchensoftware entwickeln zu lassen',
      paragraphs: [
        'Nicht jede Idee braucht eine eigene Software. Wenn es für deine Branche schon ein gutes, bezahlbares Produkt gibt, ist es meistens klüger, das zu nutzen. Das sagen wir dir auch im Erstgespräch.',
        'Interessant wird es, wenn du drei Dinge mitbringst: echtes Wissen über die Abläufe einer Branche, eine Lücke, die die vorhandenen Anbieter nicht schließen, und einen Weg zu den ersten Kunden. Dann ist eine eigene Branchensoftware als SaaS kein Hexenwerk mehr, sondern ein Projekt mit klarem Umfang.',
        'Wir übernehmen dabei das, was dir fehlt: Fachlogik in Software übersetzen, Gestaltung, Entwicklung, Schnittstellen, Bezahlung und den Auftritt, über den das Produkt gefunden wird. Du bringst die Branche mit, wir bauen das Produkt.',
      ],
    },
    technical: {
      headline: 'Für alle die es genau wissen wollen',
      paragraph:
        'Next.js 15 mit App Router und TypeScript im strikten Modus, Server Components als Standard, Eingaben über Server Actions mit zod geprüft. PostgreSQL mit Prisma als Datenbank, Geldbeträge als Cent-Ganzzahlen, damit keine Rundungsfehler entstehen. Mandantentrennung auf Datenebene. PDFs für Verträge, Rechnungen und Preisschilder mit @react-pdf/renderer, digitale Unterschrift mit pdf-lib und SHA-256-Prüfsumme auf einer Protokollseite. E-Rechnung im Format XRechnung nach EN 16931, DATEV-Export im Format EXTF nach SKR 03 mit getrennten Erlöskonten für Differenz- und Regelumsätze. mobile.de über die Seller-API angebunden. Anmeldung über Einmal-Links statt Passwort. Steuerlogik und Kernabläufe mit vitest getestet. Ausgeliefert als Docker-Container hinter Caddy auf einem Server in Deutschland.',
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
    dashboardUrl: 'dashboard.carhifi-herford.de',
    screenshotSection: {
      headline: 'So sieht der Überblick aus',
      description:
        'Neue Anfragen, kontaktierte Kunden, geplante Termine. Dazu die Konfigurator-Anfragen die reingekommen sind. Links Soundpakete, Komponenten und der Fahrzeugbaum. Alles pflegbar ohne Agentur.',
    },
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
    dashboardUrl: 'dashboard.kolac-digital.de',
    screenshotSection: {
      headline: 'So sieht der Überblick aus',
      description:
        'Umsatz aktueller Monat, offene Rechnungen, Ausgaben und die letzten Rechnungen mit einem Klick zum Detail. Links Kunden, Vertrieb, Verträge, Berichte. Alles was ich täglich brauche, auf einem Bildschirm.',
    },
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
        'Du hast deine eigene Firma. Angebote in Word. Rechnungen in einem alten Programm. Belege in einem Ordner, oder auf dem Handy, oder in beiden. Verträge werden gedruckt, unterschrieben, abgeheftet.',
        'Am Monatsende sitzt du am Rechner und sortierst. Von der Fehleranfälligkeit garnicht erst angefangen. Was ist reingekommen, was ist rausgegangen, was fehlt noch. Umsatzsteuer-Voranmeldung wird zum eigenen Projekt.',
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
