/**
 * Branchenseiten unter /webseiten/{slug}. Jede Seite zielt auf eine
 * Suche wie "webseite fahrschule erstellen lassen" und gewinnt Kunden
 * aus ganz Deutschland, nicht nur aus OWL.
 *
 * Nur Branchen aufnehmen, in denen wir ein echtes Projekt zeigen können
 * (portfolioSlug) und bei denen die Google-Treffer schlagbar sind, siehe
 * docs/blog-keyword-strategie.md. Keine Seiten mit ausgetauschtem
 * Branchennamen: Probleme, Funktionen und Fragen sind je Branche eigen.
 * Keine Preise oder Spannen nennen.
 */

export interface BranchenFeature {
  icon: string;
  title: string;
  text: string;
}

export interface BranchenFaq {
  question: string;
  answer: string;
}

export interface BranchenSeite {
  slug: string;
  /** Kurzname für Breadcrumb und interne Links, z.B. "Fahrschulen". */
  name: string;
  /** Wer die Seite liest, für Überschriften, z.B. "Reinigungsfirmen". */
  zielgruppe: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string;
  problemsTitle: string;
  problems: string[];
  featuresTitle: string;
  featuresIntro: string;
  features: BranchenFeature[];
  /** Projekt aus lib/portfolio.ts, das als Referenz gezeigt wird. */
  portfolioSlug: string;
  /** Weitere Projekte aus lib/portfolio.ts, klein unter der Hauptreferenz. */
  weitereReferenzen?: string[];
  /** Einordnung der Referenz, wenn sie nicht genau dieselbe Branche ist. */
  referenceNote?: string;
  /**
   * Passender Ratgeber-Artikel. Der Artikel verlinkt dann automatisch
   * zurück auf diese Seite, deshalb nur eintragen, wenn er wirklich zur
   * Branche gehört.
   */
  ratgeber?: { href: string; title: string };
  faqs: BranchenFaq[];
  /** Quelle im Kontaktformular, steht in der Anfrage-Mail. */
  formSource: string;
}

const kostenAntwort = (beispielKlein: string, beispielGross: string) =>
  `Das hängt vom Umfang ab. ${beispielKlein} ist schneller gebaut als ${beispielGross}. Nach dem kostenlosen Erstgespräch bekommst du ein festes Angebot zum Festpreis, mit allen Positionen. Hosting, Wartung und kleine Änderungen sind im Monatspreis enthalten, und der startet erst, wenn deine Seite live ist.`;

const deutschlandweitAntwort =
  'Ja. Wir sitzen in Bielefeld, arbeiten aber mit Betrieben in ganz Deutschland. Das Erstgespräch läuft per Telefon oder Video Call, den Entwurf siehst du online. Über die Hälfte unserer Kunden treffen wir nie persönlich.';

export const branchenSeiten: BranchenSeite[] = [
  {
    slug: 'fahrschule',
    name: 'Fahrschulen',
    zielgruppe: 'Fahrschulen',
    metaTitle:
      'Webseite für Fahrschulen erstellen lassen · mit Online-Anmeldung | Kolac Digital',
    metaDescription:
      'Webseite für deine Fahrschule mit Online-Anmeldung, Führerscheinklassen und Kursterminen. Individuell gebaut, bei Google sichtbar, in der Regel in einer Woche live.',
    eyebrow: 'Webseite für Fahrschulen',
    h1: 'Webseite für deine Fahrschule, die Anmeldungen reinholt.',
    intro:
      'Fahrschüler suchen bei Google und am Handy. Sie wollen sofort sehen, welche Führerscheinklassen du anbietest, wann der nächste Theoriekurs startet und wo dein Standort ist. Wir bauen dir eine Website, die genau das zeigt und Anmeldungen direkt online einsammelt. Für Fahrschulen in ganz Deutschland.',
    problemsTitle: 'Kennst du das aus deiner Fahrschule?',
    problems: [
      'Interessenten rufen an, während du im Auto sitzt und Fahrstunden gibst.',
      'Jeden Tag die gleichen Fragen: Was kostet der Führerschein, welche Klasse brauche ich, wann ist Theorie?',
      'Anmeldungen kommen per WhatsApp, Mail und Zettel. Am Ende fehlt immer eine Angabe.',
      'Eltern wollen sich vorher informieren und finden online nur deine Telefonnummer.',
      'Bei Google stehen andere Fahrschulen aus deiner Stadt vor dir, obwohl deine Ausbildung besser ist.',
    ],
    featuresTitle: 'Was deine Fahrschul-Website kann.',
    featuresIntro:
      'Wir bauen die Seite entlang der Fragen, die Fahrschüler und Eltern wirklich haben. Nicht entlang einer Vorlage.',
    features: [
      {
        icon: '🪪',
        title: 'Führerscheinklassen klar erklärt',
        text: 'Eine eigene Unterseite für jede Klasse, zum Beispiel B, BE, B96, BF17 oder A. Mit Ablauf, Voraussetzungen und dem, was Fahrschüler mitbringen müssen.',
      },
      {
        icon: '📝',
        title: 'Anmeldung online',
        text: 'Ein Anmeldeformular fragt alle Angaben auf einmal ab, bei Minderjährigen auch die Einwilligung der Eltern. Das klappt auch außerhalb deiner Bürozeiten, und die Anmeldung landet sortiert bei dir statt im WhatsApp-Verlauf.',
      },
      {
        icon: '📅',
        title: 'Kurstermine auf einen Blick',
        text: 'Theoriekurse, Intensivkurse und Ferienkurse stehen mit Datum auf der Seite. Neue Kurse trägst du selbst ein, ohne Programmierer.',
      },
      {
        icon: '📍',
        title: 'Gefunden in deiner Stadt',
        text: 'Lokales SEO für „Fahrschule“ plus Ort und Stadtteil, dazu dein Google-Unternehmensprofil mit Öffnungszeiten. Hast du mehrere Filialen, bekommt jeder Standort eigene Angaben.',
      },
      {
        icon: '💬',
        title: 'Antworten, bevor jemand anruft',
        text: 'Preise, Dauer der Ausbildung, Prüfungen, Fahrstunden: Die häufigsten Fragen beantwortet die Seite. Du sparst Zeit am Telefon.',
      },
      {
        icon: '👥',
        title: 'Fahrlehrer, die man kennenlernt',
        text: 'Fahrschüler wollen wissen, mit wem sie fahren. Fotos von deinem Team und euren Fahrzeugen schaffen Vertrauen. Das Fotoshooting ist bei uns dabei.',
      },
    ],
    portfolioSlug: 'fahrschule-kreuzer',
    ratgeber: {
      href: '/blog/fahrschule-mehr-anmeldungen-webseite',
      title: 'Fahrschule: mehr Anmeldungen über Google und die eigene Webseite',
    },
    faqs: [
      {
        question: 'Was gehört auf die Webseite einer Fahrschule?',
        answer:
          'Die Führerscheinklassen mit Ablauf und Voraussetzungen, dein Standort mit Öffnungszeiten, die nächsten Kurstermine, ein Anmeldeformular und eine Vorstellung von dir und deinen Fahrlehrern. Dazu Antworten auf die Fragen, die du sonst jeden Tag am Telefon hörst. Mehr braucht es für den Anfang nicht.',
      },
      {
        question: 'Können sich Fahrschüler direkt online anmelden?',
        answer:
          'Ja. Das Anmeldeformular fragt alle Angaben ab, die du brauchst, und schickt sie dir sortiert zu. Bei Minderjährigen kommt die Einwilligung der Eltern dazu. Den Ausbildungsvertrag schließt ihr danach ganz normal ab.',
      },
      {
        question: 'Wird meine Fahrschule bei Google gefunden?',
        answer:
          'Wir bauen die Seite so, dass Google sie für Suchen wie „Fahrschule“ plus dein Ort versteht. Dazu gehören saubere Technik, ein gepflegtes Google-Unternehmensprofil und Texte, die deine Klassen und deinen Standort klar nennen. Einen garantierten ersten Platz verspricht niemand seriös. Bei der Fahrschule Kreuzer in Bielefeld-Brackwede hat der Weg funktioniert.',
      },
      {
        question: 'Was kostet es, eine Webseite für eine Fahrschule erstellen zu lassen?',
        answer: kostenAntwort(
          'Eine Seite mit Klassen, Standort und Anmeldung',
          'ein System mit Kursbuchung und Schülerverwaltung',
        ),
      },
      {
        question: 'Meine Fahrschule ist nicht in OWL. Geht das trotzdem?',
        answer: deutschlandweitAntwort,
      },
    ],
    formSource: 'Branchenseite Fahrschule',
  },
  {
    slug: 'gebaeudereinigung',
    name: 'Gebäudereinigung',
    zielgruppe: 'Reinigungsfirmen',
    metaTitle:
      'Webseite für Gebäudereinigung erstellen lassen · mehr Aufträge | Kolac Digital',
    metaDescription:
      'Webseite für deine Reinigungsfirma: Leistungen klar dargestellt, Anfrageformular für Firmenkunden und lokales SEO. Individuell gebaut, in der Regel in einer Woche live.',
    eyebrow: 'Webseite für Gebäudereinigung',
    h1: 'Webseite für deine Gebäudereinigung, die Aufträge bringt.',
    intro:
      'Hausverwaltungen, Büros und Praxen suchen ihre Reinigungsfirma bei Google. Sie vergleichen mehrere Anbieter und fragen bei denen an, die professionell wirken und schnell erreichbar sind. Wir bauen dir eine Website, die Vertrauen schafft und jede Angebotsanfrage auch dann annimmt, wenn du gerade im Objekt bist. Für Reinigungsunternehmen in ganz Deutschland.',
    problemsTitle: 'Kennst du das aus deiner Reinigungsfirma?',
    problems: [
      'Anfragen kommen nur per Telefon. Wenn du im Objekt bist, ist der Auftrag weg.',
      'Für ein Angebot fehlen dir Fläche, Turnus und Adresse. Also telefonierst du jeder Anfrage hinterher.',
      'Auftraggeber prüfen dich online und finden nur einen Eintrag im Branchenbuch.',
      'Bei Google stehen große Reinigungsfirmen und Portale vor dir, obwohl du in der Region näher dran bist.',
    ],
    featuresTitle: 'Was deine Website für die Gebäudereinigung kann.',
    featuresIntro:
      'Firmenkunden entscheiden nüchtern: Passt die Leistung, stimmt das Einsatzgebiet, wirkt der Betrieb zuverlässig? Die Seite beantwortet genau das.',
    features: [
      {
        icon: '🧽',
        title: 'Jede Leistung einzeln',
        text: 'Unterhaltsreinigung, Büroreinigung, Glas- und Fensterreinigung, Baureinigung oder Bauendreinigung: Jeder Reinigungsdienst bekommt eine eigene Unterseite. So findet Google dich für genau die Reinigung, die gesucht wird.',
      },
      {
        icon: '📋',
        title: 'Angebotsanfrage mit allen Angaben',
        text: 'Objektart, Fläche, Turnus, Adresse und Wunschtermin in einem Formular. Du kannst direkt ein Angebot rechnen, statt erst zurückzurufen.',
      },
      {
        icon: '🏢',
        title: 'Gemacht für Firmenkunden',
        text: 'Hausverwaltungen und Unternehmen wollen Referenzen, Einsatzgebiet und einen festen Ansprechpartner sehen. Die Seite zeigt das auf einen Blick.',
      },
      {
        icon: '📍',
        title: 'Sichtbar im Einsatzgebiet',
        text: 'Lokales SEO für deine Städte und ein gepflegtes Google-Unternehmensprofil. Damit Auftraggeber aus deiner Region dich finden, nicht nur die großen Reinigungsunternehmen.',
      },
      {
        icon: '🕐',
        title: 'Anfragen rund um die Uhr',
        text: 'Interessenten erreichen dich auch abends und am Wochenende. Du siehst alles gesammelt und meldest dich, wenn du Zeit hast.',
      },
      {
        icon: '👷',
        title: 'Echte Bilder statt Stockfotos',
        text: 'Fotos von deinem Team, euren Fahrzeugen und echten Einsätzen. Das schafft mehr Vertrauen als jedes Symbolbild. Das Fotoshooting vor Ort ist bei uns dabei.',
      },
    ],
    portfolioSlug: 'af-gebaeudeservice',
    ratgeber: {
      href: '/blog/webseite-gebaeudereinigung-firmenkunden',
      title: 'Webseite für Gebäudereinigung: was Firmenkunden sehen wollen',
    },
    faqs: [
      {
        question: 'Was muss auf die Webseite einer Reinigungsfirma?',
        answer:
          'Deine Reinigungsdienste einzeln erklärt, dein Einsatzgebiet, Referenzen oder Kundenstimmen, Bilder von echten Einsätzen, ein Anfrageformular und ein Ansprechpartner mit Telefonnummer. Firmenkunden achten außerdem auf ein vollständiges Impressum und darauf, dass der Betrieb dauerhaft erreichbar wirkt.',
      },
      {
        question: 'Wie komme ich über die Webseite an Firmenkunden?',
        answer:
          'Unternehmen und Hausverwaltungen suchen gezielt nach der Reinigung, die sie brauchen, und nach ihrem Ort, zum Beispiel „Büroreinigung“ plus Stadt. Deshalb bekommt jeder Reinigungsdienst eine eigene Seite, und das Anfrageformular fragt die Angaben ab, die du für ein Angebot brauchst. Je schneller dein Angebot kommt, desto eher bekommst du den Auftrag.',
      },
      {
        question: 'Ich habe kaum Zeit. Wie viel Arbeit habe ich mit der Webseite?',
        answer:
          'Wenig. Im Erstgespräch erzählst du, was du machst und für wen. Aufbau, Texte und Fotos erarbeiten wir mit dir, die Technik und das Google-Profil übernehmen wir. Danach kümmern wir uns um Hosting und Wartung, kleine Änderungen sind im Monatspreis drin.',
      },
      {
        question: 'Was kostet es, eine Webseite für eine Gebäudereinigung erstellen zu lassen?',
        answer: kostenAntwort(
          'Eine Seite mit Leistungen, Einsatzgebiet und Anfrageformular',
          'ein System, das Angebote und Einsatzpläne gleich mit verwaltet',
        ),
      },
      {
        question: 'Mein Betrieb ist nicht in OWL. Geht das trotzdem?',
        answer: deutschlandweitAntwort,
      },
    ],
    formSource: 'Branchenseite Gebäudereinigung',
  },
  {
    slug: 'kosmetikstudio',
    name: 'Kosmetikstudios',
    zielgruppe: 'Kosmetikstudios',
    metaTitle:
      'Webseite für Kosmetikstudios erstellen lassen · mit Online-Terminbuchung | Kolac Digital',
    metaDescription:
      'Webseite für dein Kosmetikstudio mit Online-Terminbuchung, Behandlungen und echten Bildern. Referenz: über 800 online gebuchte Termine bei Bacara Ästhetik.',
    eyebrow: 'Webseite für Kosmetikstudios',
    h1: 'Webseite für dein Kosmetikstudio, über die Kundinnen selbst Termine buchen.',
    intro:
      'Deine Kundinnen suchen am Handy, schauen sich Bilder an und wollen sofort einen Termin. Wenn sie dafür erst anrufen oder auf eine Antwort warten müssen, buchen sie woanders. Wir bauen dir eine Website mit Online-Terminbuchung, die so hochwertig aussieht wie deine Behandlungen. Für Kosmetikerinnen, Kosmetikstudios und Beauty-Salons in ganz Deutschland.',
    problemsTitle: 'Kennst du das aus deinem Studio?',
    problems: [
      'Während der Behandlung klingelt das Telefon. Als Kosmetikerin hast du die Hände voll und kannst nicht rangehen.',
      'Terminanfragen kommen per Instagram, WhatsApp und Anruf. Den Überblick behältst du nur mit Mühe.',
      'Kundinnen fragen jedes Mal nach Preis und Dauer der Behandlungen.',
      'Die Seite aus dem Baukasten sieht aus wie bei jedem anderen Studio und zeigt nicht, was dich besonders macht.',
    ],
    featuresTitle: 'Was die Website deines Kosmetikstudios kann.',
    featuresIntro:
      'Vertrauen entsteht über Bilder, Klarheit und einen Termin ohne Hürde. Darauf bauen wir die Seite auf.',
    features: [
      {
        icon: '📅',
        title: 'Online-Terminbuchung',
        text: 'Kundinnen sehen freie Zeiten und buchen selbst, auch abends und am Wochenende. Bestätigung und Erinnerung gehen automatisch raus. Das spart Telefonate und senkt Ausfälle.',
      },
      {
        icon: '💆',
        title: 'Behandlungen mit Preis und Dauer',
        text: 'Jede Behandlung mit Beschreibung, Dauer und Preis. Wer sich vorher informiert hat, kommt mit klaren Erwartungen und bucht direkt.',
      },
      {
        icon: '📸',
        title: 'Bilder, die Vertrauen schaffen',
        text: 'Echte Fotos aus deinem Studio statt Stockbildern, dazu Vorher-Nachher-Bilder, wo sie erlaubt sind. Das Fotoshooting vor Ort ist bei uns dabei.',
      },
      {
        icon: '🎨',
        title: 'Design, das zu dir passt',
        text: 'Farben, Schrift und Bildsprache passend zu deinem Studio und deiner Art von Kosmetik, statt einer Beauty-Vorlage. Gebaut fürs Handy, denn dort buchen die meisten Kundinnen.',
      },
      {
        icon: '📍',
        title: 'Gefunden in deiner Stadt',
        text: 'Suchmaschinenoptimierung für „Kosmetikstudio“ plus Ort und ein gepflegtes Google-Unternehmensprofil. So wächst deine Sichtbarkeit in der Stadt. Mit unserem NFC Tag sammelst du Bewertungen direkt am Tresen.',
      },
      {
        icon: '📱',
        title: 'Verbunden mit Instagram',
        text: 'Deine Social-Media-Kanäle führen direkt in die Buchung. Wer dich auf Instagram entdeckt, hat mit zwei Klicks einen Termin.',
      },
    ],
    portfolioSlug: 'bacara-aesthetik',
    referenceNote:
      'Bacara Ästhetik ist eine Praxis für ästhetische Behandlungen. Die Anforderungen sind die gleichen wie in deinem Studio: Termine ohne Telefon, Vertrauen auf den ersten Blick und Kunden, die wiederkommen.',
    ratgeber: {
      href: '/blog/webseite-mit-buchungssystem-terminkalender',
      title: 'Webseite mit Buchungssystem: was wirklich zählt',
    },
    faqs: [
      {
        question: 'Was gehört auf die Website eines Kosmetikstudios?',
        answer:
          'Deine Behandlungen mit Preis und Dauer, echte Bilder aus dem Studio, eine Online-Terminbuchung, Adresse mit Anfahrt und Öffnungszeiten und ein paar Worte über dich. Kundinnen wollen wissen, zu wem sie kommen. Deine Google-Bewertungen machen den Rest.',
      },
      {
        question: 'Brauche ich ein extra Buchungstool im Abo?',
        answer:
          'Nicht unbedingt. Wir können die Terminbuchung direkt in deine Website einbauen, dann zahlst du keine Provision pro Buchung an eine Plattform. Wenn du schon ein Tool nutzt und zufrieden bist, binden wir es stattdessen ein.',
      },
      {
        question: 'Wie werde ich als Kosmetikstudio bei Google gefunden?',
        answer:
          'Mit einer Website, die Google sauber lesen kann, eigenen Unterseiten für deine wichtigsten Behandlungen und einem gepflegten Google-Unternehmensprofil mit vielen Bewertungen. Wir richten das ein und geben dir einen NFC Tag, mit dem Kundinnen dich direkt nach dem Termin bewerten.',
      },
      {
        question: 'Was kostet es, eine Webseite für ein Kosmetikstudio erstellen zu lassen?',
        answer: kostenAntwort(
          'Eine Seite mit Behandlungen, Bildern und Kontakt',
          'eine Seite mit eigener Terminbuchung und Kundenverwaltung',
        ),
      },
      {
        question: 'Mein Studio ist nicht in OWL. Geht das trotzdem?',
        answer: deutschlandweitAntwort,
      },
    ],
    formSource: 'Branchenseite Kosmetikstudio',
  },
  {
    slug: 'fahrdienst',
    name: 'Fahrdienste',
    zielgruppe: 'Fahrdienste',
    metaTitle:
      'Webseite für Fahrdienste und Krankenfahrten erstellen lassen | Kolac Digital',
    metaDescription:
      'Webseite für deinen Fahrdienst: jede Fahrt mit eigener Seite, Hotline und WhatsApp mit einem Klick, gefunden in jedem Ort. Referenz: PaderPuls Krankenfahrdienst aus Paderborn.',
    eyebrow: 'Webseite für Fahrdienste',
    h1: 'Webseite für deinen Fahrdienst, über die Fahrten reinkommen.',
    intro:
      'Ob Krankenfahrten, Flughafentransfer oder Taxi: Wer einen Fahrdienst sucht, braucht schnell eine Antwort. Welche Fahrten bietest du an, übernimmt die Krankenkasse die Kosten, und wie erreiche ich dich sofort? Wir bauen dir eine Website, die genau das beantwortet und Anfragen auch dann annimmt, wenn du am Steuer sitzt. Für Fahrdienste in ganz Deutschland.',
    problemsTitle: 'Kennst du das aus deinem Fahrdienst?',
    problems: [
      'Das Telefon klingelt, während du fährst. Wer nicht durchkommt, ruft den nächsten Fahrdienst an.',
      'Patienten und Angehörige wissen nicht, ob die Krankenkasse die Fahrt bezahlt, und fragen jedes Mal nach.',
      'Die alte Seite aus dem Baukasten erklärt alles auf einer Seite und wird bei Google kaum gefunden.',
      'Du suchst Fahrerinnen und Fahrer, aber Bewerbungen kommen nur über Umwege.',
    ],
    featuresTitle: 'Was die Website deines Fahrdienstes kann.',
    featuresIntro:
      'Bei einem Fahrdienst zählt Vertrauen und Erreichbarkeit. Die Seite zeigt beides auf den ersten Blick.',
    features: [
      {
        icon: '🚑',
        title: 'Jede Fahrt eine eigene Seite',
        text: 'Dialysefahrten, Chemo- und Strahlentherapie, Arztfahrten, Rollstuhltransport, Flughafentransfer: Jede Leistung bekommt eine Unterseite mit Ablauf, Kosten und Verordnung.',
      },
      {
        icon: '📞',
        title: 'Hotline und WhatsApp mit einem Klick',
        text: 'Auf jeder Seite ist dein Fahrdienst sofort erreichbar. Dazu ein Rückruf-Formular für alle, die gerade niemanden erreichen.',
      },
      {
        icon: '📍',
        title: 'Gefunden in jedem Ort',
        text: 'Eigene Seiten für die Orte und Stadtteile, in denen du fährst, mit echten Fahrzeiten und den Kliniken vor Ort. So findet Google dich auch im Umland.',
      },
      {
        icon: '💶',
        title: 'Kosten und Krankenkasse erklärt',
        text: 'Die häufigsten Fragen zu Verordnung, Kosten und Abrechnung mit der Krankenkasse beantwortet die Seite, bevor jemand anruft.',
      },
      {
        icon: '🧑‍✈️',
        title: 'Fahrer finden über die Website',
        text: 'Eine Karriereseite mit Bewerbungsformular, damit neue Fahrerinnen und Fahrer direkt bei dir landen.',
      },
      {
        icon: '🗓️',
        title: 'Fahrten online anfragen',
        text: 'Planbare Fahrten wie Arzttermine oder Transfers lassen sich über ein Formular anfragen. Die Anfragen landen sortiert bei dir, nicht im Anrufbeantworter.',
      },
    ],
    portfolioSlug: 'paderpuls',
    faqs: [
      {
        question: 'Was gehört auf die Website eines Fahrdienstes?',
        answer:
          'Deine Fahrten einzeln erklärt, dein Einsatzgebiet, eine gut sichtbare Telefonnummer, Antworten zu Kosten und Krankenkasse und ein paar Worte über dein Team. Fahrgäste und Angehörige wollen wissen, wer sie fährt. Echte Fotos und Google-Bewertungen helfen dabei mehr als jede Grafik.',
      },
      {
        question: 'Wie wird mein Krankenfahrdienst bei Google gefunden?',
        answer:
          'Mit einer Unterseite für jede Fahrt, eigenen Seiten für die Orte, in denen du fährst, und einem gepflegten Google-Unternehmensprofil. Bei PaderPuls aus Paderborn wurden so aus fünf dünnen Seiten über 40 Seiten, die für Krankenfahrten in der Region gefunden werden.',
      },
      {
        question: 'Können Kunden Fahrten online buchen?',
        answer:
          'Für planbare Fahrten ja, über ein Anfrage- oder Buchungsformular. Dringende Fahrten laufen weiter übers Telefon, deshalb steht deine Nummer auf jeder Seite ganz oben.',
      },
      {
        question: 'Was kostet es, eine Webseite für einen Fahrdienst erstellen zu lassen?',
        answer: kostenAntwort(
          'Eine Seite mit deinen Fahrten, dem Einsatzgebiet und Kontakt',
          'eine Seite mit vielen Orts- und Leistungsseiten und Karrierebereich',
        ),
      },
      {
        question: 'Mein Fahrdienst ist nicht in OWL. Geht das trotzdem?',
        answer: deutschlandweitAntwort,
      },
    ],
    formSource: 'Branchenseite Fahrdienst',
  },
  {
    slug: 'kfz-werkstatt',
    name: 'Kfz-Werkstätten',
    zielgruppe: 'Kfz-Werkstätten',
    metaTitle:
      'Webseite für Kfz-Werkstätten erstellen lassen · mehr Aufträge | Kolac Digital',
    metaDescription:
      'Webseite für deine Kfz-Werkstatt: jede Leistung mit eigener Seite, Anfrage mit Fahrzeugdaten, gefunden in deiner Stadt. Referenzen: Motorenfachmann und Pader Automobilzentrum.',
    eyebrow: 'Webseite für Kfz-Werkstätten',
    h1: 'Webseite für deine Kfz-Werkstatt, die Aufträge bringt.',
    intro:
      'Wer eine Werkstatt sucht, hat meistens ein Problem mit dem Auto und will schnell wissen: Macht ihr das, was kostet es ungefähr, und wann habt ihr Zeit? Wir erstellen dir eine Homepage, die das beantwortet, bei Google für deine Leistungen gefunden wird und Anfragen sortiert zu dir bringt. Für Kfz-Werkstätten, Autowerkstätten und Meisterbetriebe in ganz Deutschland.',
    problemsTitle: 'Kennst du das aus deiner Werkstatt?',
    problems: [
      'Du liegst unter dem Auto, das Telefon klingelt. Der Kunde ruft die nächste Autowerkstatt an.',
      'Deine Homepage aus dem Baukasten ist alt, zeigt nicht, was du kannst, und sieht am Handy schlecht aus.',
      'Bei Google stehen Ketten und Portale vor dir, obwohl du in deiner Stadt der Spezialist bist.',
      'Kunden fragen nach Leistungen, die du längst anbietest, weil sie nirgends stehen.',
    ],
    featuresTitle: 'Was die Website deiner Werkstatt kann.',
    featuresIntro:
      'Kunden suchen nach ihrem Problem, nicht nach deinem Namen. Deshalb baut die Seite auf deinen Leistungen auf.',
    features: [
      {
        icon: '🔧',
        title: 'Jede Leistung eine eigene Seite',
        text: 'Inspektion, Motorinstandsetzung, Getriebe, Klimaservice oder Reifen: Jede Leistung bekommt eine Unterseite mit Ablauf und ungefähren Kosten. So findet Google dich für genau die Reparatur, die gesucht wird.',
      },
      {
        icon: '📝',
        title: 'Anfrage mit Fahrzeugdaten',
        text: 'Marke, Modell, Baujahr, Problem und gern ein Foto: Das Anfrageformular fragt alles ab, was du für eine erste Einschätzung brauchst.',
      },
      {
        icon: '💬',
        title: 'WhatsApp und Rückruf',
        text: 'Ein WhatsApp-Knopf auf jeder Seite und ein Rückruf-Formular. Kunden erreichen dich online, auch wenn du gerade nicht ans Telefon kannst.',
      },
      {
        icon: '📍',
        title: 'Gefunden in deiner Stadt',
        text: 'Lokales SEO für „Kfz-Werkstatt“ plus Ort, dazu dein Google-Unternehmensprofil mit Bewertungen und Öffnungszeiten. Holst du Fahrzeuge bundesweit ab, bekommen auch deine Einsatzgebiete eigene Seiten.',
      },
      {
        icon: '⚙️',
        title: 'Technik, die Google versteht',
        text: 'Eine Adresse, eigener Titel und eigene Beschreibung für jede Seite, Firmendaten für Google. Bei Motorenfachmann stieg der Onpage-Score so von 60 auf 95 Prozent.',
      },
      {
        icon: '📸',
        title: 'Fotos aus deiner Werkstatt',
        text: 'Echte Bilder von dir, deinem Team und deinen Arbeitsplätzen statt Stockfotos. Das Fotoshooting vor Ort ist bei uns dabei.',
      },
    ],
    portfolioSlug: 'motorenfachmann',
    weitereReferenzen: ['carhifi-herford', 'pader-automobilzentrum'],
    ratgeber: {
      href: '/blog/webseite-fahrschule-praxis-werkstatt',
      title: 'Fahrschule, Praxis, Werkstatt: was online zählt',
    },
    faqs: [
      {
        question: 'Was gehört auf die Website einer Kfz-Werkstatt?',
        answer:
          'Deine Leistungen einzeln erklärt, Adresse mit Öffnungszeiten, eine gut sichtbare Telefonnummer, ein Anfrageformular und ein paar Worte über dich und dein Team. Dazu Google-Bewertungen und echte Fotos aus der Werkstatt. Kunden wollen sehen, wem sie ihr Auto anvertrauen.',
      },
      {
        question: 'Ich habe schon eine Website. Muss die komplett neu?',
        answer:
          'Nicht unbedingt. Bei Motorenfachmann haben wir die bestehende Seite übernommen und technisch wie inhaltlich aufgeräumt, statt alles neu zu bauen. Ob ein Relaunch oder eine Überarbeitung mehr bringt, sagen wir dir im Erstgespräch ehrlich.',
      },
      {
        question: 'Ich eröffne gerade meinen Betrieb. Womit fange ich an?',
        answer:
          'Mit einer SEO-Analyse, einer schlanken Website und deinem Google-Unternehmensprofil, am besten alles zum Start. So haben wir es bei Pader Automobilzentrum in Paderborn gemacht: Erst geklärt, welche Suchen Aufträge bringen, etwa „Autoankauf Paderborn“ oder „Reifenwechsel Paderborn“, dann die Seiten genau darauf ausgerichtet und das Google-Profil passend dazu angelegt.',
      },
      {
        question: 'Wie wird meine Werkstatt bei Google gefunden?',
        answer:
          'Mit einer Unterseite für jede Leistung, Texten, die deine Stadt und dein Einsatzgebiet klar nennen, sauberer Technik und einem gepflegten Google-Unternehmensprofil. Einen garantierten ersten Platz verspricht niemand seriös, aber Google versteht deine Seite dann eindeutig.',
      },
      {
        question: 'Was kostet es, eine Webseite für eine Kfz-Werkstatt erstellen zu lassen?',
        answer: kostenAntwort(
          'Eine Seite mit Leistungen, Öffnungszeiten und Anfrageformular',
          'eine Seite mit vielen Leistungs- und Ortsseiten oder eigenem Konfigurator',
        ),
      },
      {
        question: 'Meine Werkstatt ist nicht in OWL. Geht das trotzdem?',
        answer: deutschlandweitAntwort,
      },
    ],
    formSource: 'Branchenseite Kfz-Werkstatt',
  },
  {
    slug: 'autoaufbereitung',
    name: 'Autoaufbereitung',
    zielgruppe: 'Autoaufbereiter',
    metaTitle:
      'Webseite für Autoaufbereitung erstellen lassen · mit Terminanfrage | Kolac Digital',
    metaDescription:
      'Webseite für deine Autoaufbereitung: Pakete, Vorher-Nachher-Bilder, Anfrage mit Fotos und Terminwunsch, schnell geladen und in deiner Stadt gefunden. Referenz: MC-Autopflege Herford.',
    eyebrow: 'Webseite für Autoaufbereitung',
    h1: 'Webseite für deine Autoaufbereitung, die deine Arbeit zeigt und Kunden bringt.',
    intro:
      'Wer sein Auto professionell aufbereiten lassen will, sucht bei Google nach Autoaufbereitung, Autoreinigung oder Lackaufbereitung in seiner Stadt und entscheidet nach dem, was er sieht. Er will sehen, wie deine Ergebnisse aussehen, was deine Dienstleistungen umfassen und wie er schnell an einen Termin kommt. Wir erstellen dir eine Website, die das auf einen Blick zeigt, am Handy sofort lädt und Kunden mit allen Infos zu dir bringt. Für Autoaufbereiter, Unternehmen der Fahrzeugaufbereitung und Fahrzeugpflege sowie Autopflege-Betriebe in ganz Deutschland.',
    problemsTitle: 'Kennst du das aus deiner Aufbereitung?',
    problems: [
      'Jeden Tag die gleiche Nachricht: Was kostet Keramik für meinen Golf? Ohne Fotos, ohne Zustand, und nach deinem Preis kommt nichts mehr.',
      'Du polierst gerade, das Handy klingelt, und die Nachrichten verteilen sich auf WhatsApp, Instagram und Telefon.',
      'Auf Instagram sieht man deine Arbeit, aber bei Google findet dich für Lackaufbereitung in deiner Stadt keiner.',
      'Deine Online-Präsenz aus dem Baukasten ist alt, lädt am Handy ewig und zeigt nicht, was du kannst.',
      'Kunden halten deine Fahrzeugreinigung für eine Waschstraße und sehen nicht, wie viel Handarbeit in jeder Aufbereitung steckt, von der Reinigung bis zum Schutz des Lacks.',
    ],
    featuresTitle: 'Was die Website deiner Autoaufbereitung kann.',
    featuresIntro:
      'Bei der Autoaufbereitung verkauft das Ergebnis: Glanz, sauberer Innenraum, geschützter Lack. Deshalb baut die Seite auf deinen Fotos und deinen Leistungen auf, und das Formular liefert dir alles Wichtige vorab.',
    features: [
      {
        icon: '✨',
        title: 'Vorher-Nachher, das überzeugt',
        text: 'Deine Ergebnisse als Galerie zu jeder Leistung, von der Innenreinigung über die Politur bis zur Versiegelung. Echte Fotos von deinen Fahrzeugen und deinem Team statt Stockbilder, das Fotoshooting vor Ort ist bei uns dabei.',
      },
      {
        icon: '📦',
        title: 'Leistungen und Pakete klar erklärt',
        text: 'Innenreinigung, Außenreinigung, Komplettaufbereitung, Lackaufbereitung mit Politur, Lackschutz durch Keramikversiegelung, Smart-Repair oder Leasingrückgabe: Jede Dienstleistung mit Ablauf, Vorteilen und, wenn du willst, deinem Ab-Preis. Kunden sehen sofort den Unterschied zur Waschstraße.',
      },
      {
        icon: '📸',
        title: 'Formular mit Fahrzeug und Fotos',
        text: 'Marke, Modell, Zustand, Wunschpaket und Fotos vom Lack oder Innenraum: Das Formular fragt alles ab, was du für ein ehrliches Angebot brauchst. Dazu ein Wunschdatum, damit aus dem ersten Kontakt direkt ein Termin wird.',
      },
      {
        icon: '📍',
        title: 'Gefunden in deiner Stadt und Umgebung',
        text: 'Mehr Sichtbarkeit durch eine eigene Seite für jede Leistung und Ortsseiten für dein Einzugsgebiet, jeweils mit Fahrstrecke zu dir. Dazu dein Google-Unternehmensprofil mit Bewertungen und Öffnungszeiten.',
      },
      {
        icon: '⚡',
        title: 'Schnell auf dem Handy',
        text: 'Die meisten Kunden suchen am Handy. Bei MC-Autopflege in Herford bewertet Google die Ladezeit auf dem Handy jetzt mit 99 statt 68 von 100, der Hauptinhalt steht nach 1,2 statt 8,2 Sekunden.',
      },
      {
        icon: '⭐',
        title: 'Vertrauen auf den ersten Blick',
        text: 'Deine Bewertungen zufriedener Kunden von Google und anderen Portalen zusammengefasst, Jahre im Geschäft, Marken und Fahrzeuge, die du pflegst. Ein professioneller Auftritt mit eigenem Design statt Vorlage, damit Kunden wissen, wem sie ihr Auto anvertrauen.',
      },
    ],
    portfolioSlug: 'mc-autopflege',
    weitereReferenzen: ['carhifi-herford', 'motorenfachmann'],
    faqs: [
      {
        question: 'Was gehört auf die Webseite einer Autoaufbereitung?',
        answer:
          'Deine Leistungen einzeln erklärt, Vorher-Nachher-Bilder, Adresse mit Öffnungszeiten, eine anklickbare Telefonnummer zum direkten Anrufen und ein Formular, in dem Kunden Fahrzeug, Zustand und Fotos angeben. Dazu deine Bewertungen und ein paar Worte über dich und dein Unternehmen. Bei der Fahrzeugaufbereitung entscheiden Kunden mit den Augen, deshalb gehören die Fotos nach vorne.',
      },
      {
        question: 'Können Kunden direkt online einen Termin anfragen oder buchen?',
        answer:
          'Ja. Für einfache Leistungen wie eine Innenreinigung bucht der Kunde direkt einen freien Platz in deinem Kalender. Für eine Lackaufbereitung ist ein Formular mit Fotos meist besser, weil du den Zustand des Lacks sehen willst, bevor du dich festlegst. Beides lässt sich kombinieren.',
      },
      {
        question: 'Soll ich meine Preise auf die Website schreiben?',
        answer:
          'Ab-Preise für feste Leistungen helfen: Interessenten sortieren sich selbst vor und melden sich gezielter. Bei Keramikversiegelung, Smart-Repair oder stark verschmutzten Fahrzeugen bleibt es beim Angebot nach Begutachtung. Wir zeigen dir im Erstgespräch, wie andere Aufbereiter das lösen.',
      },
      {
        question: 'Ich habe schon eine Website. Verliere ich beim Wechsel meine Google-Platzierungen?',
        answer:
          'Nicht, wenn der Umzug sauber läuft. Bei MC-Autopflege sind alle bisherigen Adressen und Seitentitel gleich geblieben, alte Links leiten auf die passende neue Seite weiter, und die Sitemap war am ersten Tag bei Google eingereicht. Die Platzierungen messen wir vor und nach dem Umzug.',
      },
      {
        question: 'Wie wird meine Autoaufbereitung bei Google gefunden?',
        answer:
          'Mit einer eigenen Seite für jede Leistung, Ortsseiten für dein Einzugsgebiet, Texten für Suchen wie Autoreinigung oder Aufbereitung plus Ort, schneller Technik und einem gepflegten Google-Unternehmensprofil. Einen garantierten ersten Platz verspricht niemand seriös, aber Google versteht dann eindeutig, was du anbietest und wo.',
      },
      {
        question: 'Was kostet es, eine Webseite für eine Autoaufbereitung erstellen zu lassen?',
        answer: kostenAntwort(
          'Eine Seite mit Paketen, Bildern und Anfrageformular',
          'eine Seite mit vielen Leistungs- und Ortsseiten oder Online-Buchung',
        ),
      },
      {
        question: 'Mein Betrieb ist nicht in OWL. Geht das trotzdem?',
        answer: deutschlandweitAntwort,
      },
    ],
    formSource: 'Branchenseite Autoaufbereitung',
  },
];

export function findBranchenSeite(slug: string): BranchenSeite | undefined {
  return branchenSeiten.find((b) => b.slug === slug);
}
