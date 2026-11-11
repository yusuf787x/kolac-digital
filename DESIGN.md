# Design System: kolac-digital.de (Marketing-Seiten)

Gilt für die öffentlichen Seiten (Startseite, /webseiten, Branchen- und Stadtseiten, Ratgeber, /seo-check). Das Dashboard hat eigene Tailwind-Tokens in `app/globals.css` und ist hier nicht gemeint.
Die Werte sind aus `public/css/style.css` übernommen (Rule 0). Neu sind nur die Statusfarben für den SEO-Check.

Character: ruhig, aufgeräumt, vertrauenswürdig. Apple-nahe Klarheit für Inhaber, die keine Technik lesen wollen.

## Color
Tokens in `public/css/style.css` unter `:root`.
- `--color-white` #ffffff / `--color-offwhite` #f5f5f7: Hintergrund und abgesetzte Flächen. Neutral kühl, damit Inhalte und Referenzbilder wirken.
- `--color-black` #1d1d1f (Text, 16.8:1 auf Weiß) / `--color-gray` #6e6e73 (Nebentext, 5.1:1 auf Weiß, 4.7:1 auf Offwhite).
- `--color-blue` #0071e3: einziger Akzent, nur für Hauptaktion, Links und Kennzahlen. Weiße Schrift darauf 4.7:1.
- `--color-blue-light` #e8f0fb: Hinterlegung für hervorgehobene Hinweise.
- `--color-ok` #1b7a3d, `--color-warn` #8f5300, `--color-fail` #b4232a: nur für Prüfergebnisse, nie dekorativ. Rot (Farbton ca. 357°) liegt weit genug vom Akzentblau (ca. 211°) entfernt.

## Typography
- Familie: Inter, geladen über `next/font/google` im jeweiligen Layout (Startseite per Link in `public/index.html`). Akzent-Serif Playfair Display nur auf der Startseite.
- Größen: 13 / 15 / 17 / 20 / 28 / 44 px. Fließtext 15 bis 17 px, Kennzahlen und Überschriften tragen den Kontrast.
- Gewichte: 400 Text, 600 Buttons und Labels, 700 bis 800 Überschriften und große Zahlen.

## Spacing
- Grundeinheit 4 px, Skala 4 / 8 / 12 / 16 / 24 / 40 / 64.
- Luftig zwischen Abschnitten (64 px und mehr), eng innerhalb einer Gruppe (8 bis 12 px).

## Shape & elevation
- Radien: `--radius-sm` 12 px (Eingaben, kleine Karten), `--radius` 18 px (Karten), `--radius-lg` 24 px (große Flächen), Buttons voll gerundet (980 px).
- Trennung: weiche Schatten (`--shadow-sm`, `--shadow-md`), Rahmen nur 1 px #e5e7eb an Eingaben und Tabellen.

## States
- Hover: Primärbutton #0077ed plus 2 px Anhebung und Schatten im Akzent; Outline-Button Hintergrund Akzent 6 %.
- Focus: 2 px Ring im Akzent (`outline: 2px solid var(--color-blue)`, Abstand 2 px).
- Disabled: 50 % Deckkraft, kein Hover, Cursor `not-allowed`.

## Status and badges
- Gut: #1b7a3d auf #e7f6ec, 4.82:1
- Verbesserbar: #8f5300 auf #fdf2de, 5.56:1
- Problem: #b4232a auf #fdeceb, 5.72:1
- Info: #1d1d1f auf #f5f5f7, 15.6:1

## Motion
- 300 ms `cubic-bezier(0.4, 0, 0.2, 1)` für Hover, 600 ms für Einblenden. `prefers-reduced-motion` schaltet Bewegung ab.

## Components
- Button: `.btn .btn-primary` (Hauptaktion, eine pro Bereich), `.btn .btn-outline` (Nebenaktion).
- Karten: weiß auf Offwhite-Abschnitt, Radius 18 px, `--shadow-sm`.

## Voice
- Du-Form, einfache Sätze, keine Fachbegriffe ohne Erklärung, keine Gedankenstriche im Fließtext. Buttons mit Verb („Check starten“).
