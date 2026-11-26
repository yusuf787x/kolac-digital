# Design System: Dashboard (intern)

Seit 26.11.2026, Vorbild ist wagenpuls (`~/Documents/Code/clients/wagenpuls/DESIGN.md`), in Kolac-Blau. Tokens in `app/dashboard/dashboard.css`, gültig nur unter `.dash` (gesetzt in `app/dashboard/layout.tsx`). Die öffentliche Website hat ihr eigenes `DESIGN.md` und bleibt davon unberührt.

Character: ruhiges, zeitgemäßes Werkzeug. Heller Grund, weiße Karten, Linien statt Schatten, weiche Formen; keine Verläufe, keine bunten Karten, keine Emojis als Navigationszeichen.

## Color
- `--k-canvas` #f1f3f6: Grund der Anwendung und der Seitenleiste
- `--k-bg` #ffffff (Karten, Felder), `--k-subtle` #f6f7f9 (Hover, Tabellenköpfe)
- `--k-fg` #141a26, `--k-muted` #5c6474 (auf Weiß 5,9:1)
- `--k-border` #e3e6eb, `--k-border-strong` #c9ced6
- `--k-brand` #2563eb (die eine Akzentfarbe: Hauptaktion, aktiver Zustand), `--k-brand-dunkel` #1d4ed8 (Hover), `--k-brand-tint` #eaf1fe, `--k-brand-line` #c4d6fb
- Tailwind-Grautöne (`gray-50` bis `gray-900`) sind unter `.dash` auf diese Werte gelegt, bestehende Seiten passen dadurch ohne Änderung
- Status bleibt bei Tailwind (emerald, amber, red, sky) als Kapsel mit Tönung und Ring

## Typography
- Geist (variabel, lokal in `app/dashboard/schriften/`, OFL), Zahlen mit `tnum`
- Seitentitel 22px, 600, eng gesetzt (gilt automatisch für `h1.text-3xl` und `h1.text-2xl`)
- Abschnittstitel 15px, 600; Fließtext 14px; Spaltenköpfe 12,5px, muted, ohne Versalien

## Shape & elevation
- Steuerelemente 10px (`rounded-lg`), Flächen 16px (`rounded-xl`, `.card`), Dialoge 20px (`rounded-2xl`), Kapseln rund
- `.card` = weiß, 1px Rahmen, `--k-shadow-karte`; nicht Karte in Karte
- Schatten: `--k-shadow-knopf` (Knöpfe, Felder), `--k-shadow-karte`, `--k-shadow-schwebend` (untere Leiste), `--k-shadow-overlay` (Menüs, Dialoge)

## Shell
- Seitenleiste 248px auf dem Grund (`components/dashboard/Sidebar.tsx`), Baum aus `components/dashboard/navigation.ts`: Bereich mit Zeichen (lucide-react), Unterpunkte klappen beim aktiven Bereich auf. Aktiver Bereich = weiße Kapsel mit Schatten, Zeichen in Blau
- Kopfzeile: am Desktop Suche links (⌘K), rechts „Neu“ (Kontakt, Angebot, Rechnung, Ausgabe) und „Zahlen“ verstecken; am Handy Bereichsname links
- Handy: schwebende Leiste unten (60px, `rounded-[22px]`, Blur) mit vier Bereichen und „Mehr“
- Rote Zähler (überfällige Rechnungen, Aufgaben, Verträge) laden einmal und beim Zurückkehren in den Tab, höchstens alle 2 Minuten

## States
- Fokus: Felder Rand in Blau plus Ring 3px (18 %), sonst Kontur 2px Blau
- Gedrückt: Knöpfe 1px nach unten; deaktiviert 50 % Deckkraft
- `prefers-reduced-motion`: keine Übergänge

## Voice
- Deutsch, knapp, Knöpfe sagen das Verb, keine Gedankenstriche
