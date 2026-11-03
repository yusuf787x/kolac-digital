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
  /** Einordnung der Referenz, wenn sie nicht genau dieselbe Branche ist. */
  referenceNote?: string;
  /** Passender Ratgeber-Artikel. */
  ratgeber: { href: string; title: string };
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
      href: '/blog/webseite-fahrschule-praxis-werkstatt',
      title: 'Fahrschule, Praxis, Werkstatt: was online zählt',
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
];

export function findBranchenSeite(slug: string): BranchenSeite | undefined {
  return branchenSeiten.find((b) => b.slug === slug);
}
