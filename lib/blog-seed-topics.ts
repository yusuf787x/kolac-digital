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

  // ------------------------------------------------------------------
  // Keyword-Recherche Oktober 2026 (siehe docs/blog-keyword-strategie.md).
  // Reihenfolge nach Kaufnaehe mal Schlagbarkeit. Jedes Thema grenzt
  // sich im angle ausdruecklich von bestehenden Artikeln ab.
  // ------------------------------------------------------------------
  {
    title: 'Excel abloesen: wann sich ein eigenes Tool statt Tabelle lohnt',
    angle:
      'Konkrete Warnzeichen, dass die Excel-Liste fuer Auftraege oder Kunden an ihre Grenze kommt: mehrere Versionen im Umlauf, nur eine Person blickt durch, Daten werden doppelt abgetippt, nichts erinnert an Fristen. Dann ehrlich: wann Excel voellig reicht. Am Ende eine Entscheidungshilfe und wie ein Umstieg ohne Datenverlust ablaeuft. Abgrenzung zum Artikel ueber die Zahl der Tools: hier geht es nur um den Wechsel von der Tabelle zu einem eigenen System.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'excel abloesen',
      'excel durch software ersetzen',
      'excel kundenverwaltung ersetzen',
      'excel auftragsliste alternative',
    ],
  },
  {
    title: 'Fertige Branchensoftware oder eigene Loesung: eine ehrliche Entscheidungshilfe',
    angle:
      'Fuer viele Betriebe ist fertige Software die richtige Wahl, das klar sagen. Dann die Faelle zeigen, in denen sie im Weg steht: Ablaeufe passen nicht ins Schema, mehrere Abos, die nicht miteinander reden, Funktionen, die man bezahlt und nie nutzt. Kriterien als Checkliste. Keine Anbieter schlechtreden, keine Preise nennen.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'handwerkersoftware oder individuell',
      'standardsoftware oder individualsoftware',
      'wann lohnt sich individualsoftware',
      'software an betrieb anpassen lassen',
    ],
  },
  {
    title: 'Kundenportal fuer kleine Betriebe: was es kann und wann es sich lohnt',
    angle:
      'Erklaeren, was ein Kundenportal im Alltag leistet: Kunden sehen Termine, Angebote, Rechnungen und Unterlagen selbst, statt anzurufen. Branchenbeispiele (Gebaeudeservice, Praxis, Werkstatt). Ehrlich sagen, ab welcher Kundenzahl und Wiederkehr es sich rechnet und wann eine gute E-Mail reicht.',
    category: 'Webseiten mit System',
    targetKeywords: [
      'kundenportal kleinunternehmen',
      'kundenportal handwerker',
      'kundenbereich webseite',
      'kundenportal erstellen lassen',
    ],
  },
  {
    title: 'Webseite fuer Gebaeudereinigung und Hausmeisterservice: was Firmenkunden sehen wollen',
    angle:
      'Reinigungsbetriebe gewinnen Firmen- und Hausverwaltungskunden, nicht Laufkundschaft. Zeigen, was diese Entscheider auf der Seite pruefen: Leistungsumfang je Objektart, Einsatzgebiet, Nachweise, schnelle Angebotsanfrage mit Flaechenangabe. Auf die digitale Anfragestrecke von AF-Gebaeudeservice stuetzen. Abgrenzung zum Artikel ueber verpasste Anrufe: hier geht es um die Seite selbst und die Zielgruppe Firmenkunden.',
    category: 'Branchen',
    targetKeywords: [
      'webseite gebaeudereinigung',
      'neukunden gebaeudereinigung',
      'gebaeudereinigung firmenkunden gewinnen',
      'hausmeisterservice webseite',
    ],
  },
  {
    title: 'Webseite fuers Autohaus: Fahrzeugbestand, Probefahrt und Inzahlungnahme',
    angle:
      'Was eine Autohaus-Seite heute koennen muss: aktueller Bestand ohne doppelte Pflege neben den Fahrzeugboersen, Probefahrt online anfragen, Inzahlungnahme mit Fotos vorbereiten, Werkstatttermin. Ehrlich sagen, wo die Boersen staerker sind und wofuer die eigene Seite trotzdem zaehlt. Abgrenzung zum Artikel Fahrschule, Praxis, Werkstatt: hier nur Autohandel.',
    category: 'Branchen',
    targetKeywords: [
      'autohaus webseite',
      'autohaus homepage erstellen lassen',
      'probefahrt online buchen',
      'fahrzeugbestand webseite einbinden',
    ],
  },
  {
    title: 'Angebote automatisch vorbereiten: so geht das im Handwerk',
    angle:
      'Zeigen, wie aus einer Anfrage mit Massen, Fotos und Leistungsauswahl automatisch ein Angebotsentwurf entsteht, den der Chef nur noch prueft und freigibt. Klar sagen, was sich automatisieren laesst und was Erfahrung braucht. Abgrenzung zum Artikel Angebote und Rechnungen digital: dort geht es ums papierlose Buero, hier um die Automatisierung der Angebotserstellung. Passt zur KI-Beratung, intern auf /ki-beratung verlinken.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'angebotserstellung automatisieren',
      'angebot automatisch erstellen handwerk',
      'automatisierung angebote',
      'angebote schneller schreiben handwerk',
    ],
  },
  {
    title: 'Wartung und wiederkehrende Auftraege im Griff: Objekte und Intervalle digital verwalten',
    angle:
      'Fuer Betriebe mit wiederkehrenden Leistungen (Wartung, Reinigung, Pruefungen): Kunde, Objekt, Anlage und Intervall gehoeren zusammen. Zeigen, wie automatische Erinnerungen, Pruefprotokolle und Folgeauftraege funktionieren und warum ein normales CRM das oft nicht abbildet. Abgrenzung zum Excel-Artikel: hier geht es speziell um Objekte und Intervalle.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'wartungsverwaltung kleinbetrieb',
      'kundenverwaltung handwerk objekte',
      'wartungsintervalle verwalten software',
      'kundenakte digital handwerk',
    ],
  },
  {
    title: 'Neue Patienten ueber Google: SEO fuer Zahnarztpraxen',
    angle:
      'Was Patienten bei der Zahnarztsuche wirklich pruefen: Behandlungsschwerpunkte, Erreichbarkeit, Online-Termin, Bewertungen, Angstpatienten-Hinweise. Pro Schwerpunkt eine eigene Seite statt einer Leistungsliste. WICHTIG: berufsrechtliche Werbegrenzen und Heilmittelwerbegesetz nur allgemein und mit Quelle nennen, am Ende auf Kammer oder Fachanwalt verweisen. Abgrenzung zum Artikel ueber Praxis-Webseiten: hier geht es um Sichtbarkeit bei Google.',
    category: 'SEO und Sichtbarkeit',
    targetKeywords: [
      'seo zahnarzt',
      'zahnarztpraxis neue patienten gewinnen',
      'zahnarzt google ranking',
      'zahnarzt webseite seo',
    ],
  },
  {
    title: 'Kosmetikstudio und Aesthetik: Webseite mit Online-Termin und klaren Grenzen bei Vorher-Nachher',
    angle:
      'Auf die Erfahrung mit Bacara Aesthetik stuetzen (ueber 800 online gebuchte Termine). Zeigen, was Kundinnen vor der Buchung sehen wollen, wie Behandlungsseiten aufgebaut sein sollten und warum der Buchungsweg kurz sein muss. WICHTIG: Regeln zu Vorher-Nachher-Bildern bei aesthetischen Eingriffen (Heilmittelwerbegesetz) vor dem Schreiben pruefen, mit Quelle belegen und auf rechtliche Pruefung verweisen. Abgrenzung zum Buchungssystem-Artikel: hier die ganze Seite fuer diese Branche.',
    category: 'Branchen',
    targetKeywords: [
      'webseite kosmetikstudio',
      'kosmetikstudio kunden gewinnen',
      'aesthetik praxis webseite',
      'vorher nachher bilder werbung erlaubt',
    ],
  },
  {
    title: 'Fahrschule: mehr Anmeldungen ueber Google und die eigene Webseite',
    angle:
      'Wie Fahrschueler und Eltern eine Fahrschule auswaehlen: Standort, Klassen, Wartezeit, Preise transparent erklaert, Online-Anmeldung. Auf das Projekt Fahrschule Kreuzer stuetzen. WICHTIG: aktuelle Lage zu Anmeldezahlen und der geplanten Fuehrerscheinreform vor dem Schreiben pruefen und mit Quelle belegen, nichts aus dem Gedaechtnis. Abgrenzung zum Artikel Fahrschule, Praxis, Werkstatt: hier nur Fahrschulen und das Ziel Anmeldungen.',
    category: 'Branchen',
    targetKeywords: [
      'fahrschule mehr anmeldungen',
      'fahrschule marketing',
      'fahrschule online anmeldung webseite',
      'fahrschueler gewinnen',
    ],
  },
  {
    title: 'Vom Kontaktformular direkt ins System: Anfragen ohne Abtippen',
    angle:
      'Zeigen, was passiert, wenn eine Anfrage von der Webseite automatisch als Kunde und Vorgang im Backend landet: keine Zettel, keine vergessenen Mails, Status fuer alle sichtbar. Typische Medienbrueche benennen. Abgrenzung: Der Artikel zu verpassten Anrufen behandelt die Erreichbarkeit, der zu Angeboten und Rechnungen das Buero. Hier geht es nur um die Verbindung Webseite zu Backend.',
    category: 'Webseiten mit System',
    targetKeywords: [
      'kontaktformular mit kundenverwaltung',
      'webseite mit crm verbinden',
      'anfragen automatisch erfassen',
      'webseite schnittstelle rechnungsprogramm',
    ],
  },
  {
    title: 'Was kostet eine eigene Software fuer einen kleinen Betrieb?',
    angle:
      'Die gaengigen Zahlen im Netz stammen aus Konzernprojekten und schrecken kleine Betriebe unnoetig ab. Erklaeren, wovon der Aufwand abhaengt (Zahl der Ablaeufe, Rollen und Rechte, Datenuebernahme, Schnittstellen) und wie man Abo-Kosten fertiger Software ueber mehrere Jahre fair dagegenrechnet. WICHTIG: keine eigenen Preise oder Spannen nennen, auf das Erstgespraech mit festem Angebot verweisen. Abgrenzung zum Artikel ueber den Preis einer Webseite: hier geht es um Software und Backend.',
    category: 'Preise und Ablauf',
    targetKeywords: [
      'individualsoftware kosten',
      'software entwickeln lassen kosten kleinunternehmen',
      'eigene software kosten',
      'individualsoftware oder abo',
    ],
  },
  {
    title: 'In der Nachbarstadt gefunden werden: Sichtbarkeit ueber den eigenen Ort hinaus',
    angle:
      'Viele Betriebe arbeiten in 30 Kilometern Umkreis, werden bei Google aber nur am eigenen Sitz gefunden. Erklaeren, was erlaubt und sinnvoll ist (Einzugsgebiet im Unternehmensprofil, echte Ortsseiten mit eigenen Projekten) und was schadet (Scheinadressen, kopierte Stadtseiten). Abgrenzung zum Artikel Lokales SEO fuer Handwerker: der behandelt die Grundlagen am eigenen Ort.',
    category: 'SEO und Sichtbarkeit',
    targetKeywords: [
      'in anderen staedten bei google gefunden werden',
      'einzugsgebiet google unternehmensprofil',
      'standortseiten seo',
      'seo umkreis handwerker',
    ],
  },
  {
    title: 'Google Ads oder SEO: was sich fuer deinen Betrieb zuerst lohnt',
    angle:
      'Klare Entscheidungshilfe nach Situation: neue Firma, saisonales Geschaeft, Notdienst, langfristiger Aufbau. Zeigen, wie beides zusammenspielt und warum Ads ohne gute Seite Geld verbrennen. Abgrenzung zum Artikel Google Ads mit kleinem Budget: dort geht es ums Budget, hier um die Reihenfolge und die Wahl zwischen beiden.',
    category: 'Google Ads',
    targetKeywords: [
      'google ads oder seo',
      'seo oder google ads kleinunternehmen',
      'seo oder werbung handwerker',
      'was lohnt sich mehr seo oder ads',
    ],
  },
  {
    title: 'Wartungsvertrag fuer die Webseite: was drinstehen sollte',
    angle:
      'Checkliste fuer den Vertrag: Updates, Sicherungen, Reaktionszeiten, kleine Aenderungen, Hosting, Laufzeit und Kuendigung, was bei Ende des Vertrags mit Daten und Zugaengen passiert. Keine Preise nennen. Abgrenzung: Der Artikel zur fehlenden Pflege zeigt die Folgen, der Artikel Wem gehoert deine Webseite das Eigentum. Hier geht es um die Vertragsinhalte.',
    category: 'Preise und Ablauf',
    targetKeywords: [
      'webseite wartungsvertrag',
      'website pflegevertrag inhalt',
      'webseite betreuung was gehoert dazu',
      'wartungsvertrag webseite kuendigen',
    ],
  },
  {
    title: 'WordPress oder individuelle Webseite: was fuer kleine Betriebe besser passt',
    angle:
      'Ehrlicher Vergleich aus Sicht eines Betriebs ohne IT: Plugins und Updates, Sicherheit, Ladezeit, Abhaengigkeiten, was passiert, wenn man Funktionen wie Buchung oder Kundenverwaltung braucht. Klar sagen, wann WordPress voellig in Ordnung ist. Zahlen zu Sicherheitsluecken nur mit Primaerquelle. Abgrenzung zum Baukasten-Artikel: dort Wix und Jimdo, hier WordPress.',
    category: 'Webseiten mit System',
    targetKeywords: [
      'wordpress oder individuelle webseite',
      'wordpress nachteile kleinbetrieb',
      'webseite ohne wordpress',
      'wordpress alternative handwerker',
    ],
  },
  {
    title: 'SEO selbst machen: was du allein schaffst und wo die Grenze liegt',
    angle:
      'Konkrete Aufgaben, die jeder Inhaber selbst erledigen kann (Unternehmensprofil pflegen, Leistungsseiten texten, Bewertungen, Fotos), mit Zeitaufwand. Dann ehrlich die Grenze: Technik, Seitenstruktur, Messung. Keine Angst machen, kein Verkaufsdruck. Abgrenzung zum Artikel Lokales SEO fuer Handwerker: hier steht die Frage selbst oder machen lassen im Mittelpunkt.',
    category: 'SEO und Sichtbarkeit',
    targetKeywords: [
      'seo selber machen kleinunternehmen',
      'seo selber machen handwerker',
      'seo checkliste kleinunternehmen',
      'seo oder agentur',
    ],
  },
  {
    title: 'KI-Chatbot oder Telefonassistent im Betrieb: was du kennzeichnen musst',
    angle:
      'Die Transparenzpflichten aus der KI-Verordnung der EU fuer Chatbots und Sprachassistenten verstaendlich erklaeren, dazu Datenschutz bei Gespraechsaufzeichnungen. WICHTIG: Geltungsbeginn, Umfang und moegliche Verschiebungen vor dem Schreiben pruefen und mit Primaerquelle (EUR-Lex, Bundesnetzagentur) belegen. Am Ende auf rechtliche Pruefung verweisen. Keine Anbieter empfehlen. Abgrenzung zum Artikel KI im Kleinbetrieb: dort Nutzen, hier Pflichten.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'ki chatbot kennzeichnungspflicht',
      'ki verordnung kleine unternehmen',
      'ki telefonassistent datenschutz',
      'ki einsetzen dsgvo betrieb',
    ],
  },
  {
    title: 'n8n, Make oder Zapier: brauchst du so ein Tool oder ein eigenes Backend?',
    angle:
      'Fuer Betriebe ohne IT erklaeren, was Automatisierungsplattformen koennen, wo sie im Alltag brechen (Wartung, Kosten pro Ausfuehrung, Datenschutz bei US-Diensten, niemand im Betrieb versteht die Ablaeufe) und wann ein eigenes Backend die ruhigere Loesung ist. Fair bleiben: fuer einfache Verknuepfungen sind die Tools gut. Intern auf /ki-beratung verlinken.',
    category: 'Prozesse digitalisieren',
    targetKeywords: [
      'n8n oder make',
      'zapier alternative dsgvo',
      'automatisierung ohne abo',
      'n8n fuer kleine unternehmen',
    ],
  },
  {
    title: 'Facebook- und Instagram-Werbung fuer Handwerker: lohnt sich das?',
    angle:
      'Ehrlich einordnen, fuer welche Gewerke Meta-Werbung funktioniert (sichtbare Ergebnisse wie Bad, Garten, Fassade) und fuer welche kaum. Unterschied zu Google: Bedarf wecken statt Nachfrage abholen. Was vorher stehen muss: eine Seite, die Anfragen sauber aufnimmt. Keine Kosten pro Anfrage erfinden, Zahlen nur mit Quelle. Abgrenzung zu den Google-Ads-Artikeln: hier nur Meta.',
    category: 'SEO und Sichtbarkeit',
    targetKeywords: [
      'meta ads handwerker',
      'facebook werbung handwerker',
      'instagram werbung handwerksbetrieb',
      'handwerker anfragen ueber facebook',
    ],
  },
];
