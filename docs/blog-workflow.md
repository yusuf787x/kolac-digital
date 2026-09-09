# Blog: Wie ein Artikel entsteht

Ohne API-Kosten. Du nutzt Claude im Chat, das Dashboard übernimmt den Rest.
Aufwand pro Artikel: etwa zehn Minuten.

## Einmal einrichten: Claude-Projekt

Der schnellste Weg. Im Dashboard unter Blog auf **Basis-Anweisung**, Text
kopieren, in Claude ein Projekt anlegen und den Text als
Projektanweisung hinterlegen.

Danach reicht im Projekt eine kurze Nachricht:

```
Thema: Jeder verpasste Anruf kostet dich einen Auftrag
Richtung: Reaktionszeit und Rückrufquote zeigen
Kategorie: Prozesse digitalisieren
Zielbegriffe: handwerker erreichbarkeit anfragen
```

Antwort kopieren, im Dashboard unter **Artikel einfügen** einsetzen,
fertig.

## Der Ablauf ohne Projekt

1. **Dashboard öffnen**: `/dashboard/blog` → Button „+ Artikel aus Claude"
2. **Thema wählen**: entweder aus der Warteschlange oder frei eintragen
3. **Auftragstext kopieren**: ein Klick auf „In die Zwischenablage"
4. **In Claude einfügen**: neuer Chat, Text rein, abschicken
5. **Antwort zurückkopieren**: die komplette Antwort in das Feld unter Schritt 3
6. **Vorschau prüfen**: Google-Snippet, Kurzfassung, Text, Fragen
7. **Anlegen**: als Entwurf oder direkt veröffentlichen

Der Auftragstext enthält bereits alles: die Fakten über Kolac Digital, die
Preise, die Referenzen, die Stilregeln und das Ausgabeformat. Du musst im
Chat nichts ergänzen.

## Wenn sich etwas ändert

Preise, Leistungen, Referenzen oder Stilregeln werden an **einer** Stelle
gepflegt: `lib/blog-prompt.ts`, Konstante `BLOG_AUTHOR_PROMPT`. Danach
stimmt jeder künftige Artikel automatisch.

## Was das Format enthält

| Feld | Wofür |
|---|---|
| `title`, `slug` | Überschrift und URL |
| `excerpt` | Teaser in der Übersicht |
| `tldr` | Kurzantwort oben. Die Passage, die KI-Systeme zitieren |
| `keyTakeaways` | Kasten „Alles auf einen Blick" |
| `body` | Artikeltext als Markdown |
| `metaTitle`, `metaDescription` | Was bei Google im Suchergebnis steht |
| `heroEmoji` | Symbol in der Übersicht, solange kein Bild da ist |
| `imagePrompt` | Vorschlag, was für ein Titelbild passt |
| `imageAlt` | Alternativtext für das Bild |
| `targetKeywords` | Suchbegriffe, auf die der Artikel zielt |
| `faq` | Fragen und Antworten, werden als FAQPage ausgespielt |

## Bilder

Der Artikel funktioniert auch ohne Bild, dann steht das Emoji in der
Übersicht.

Wenn du ein Bild willst: Der Auftragstext liefert unter `imagePrompt`
eine Beschreibung, was passen würde. Damit erzeugst du eins oder suchst
eins raus. Dann im Editor unter **Titelbild** einfach hineinziehen oder
anklicken und auswählen. Das war es.

Was dabei automatisch passiert:

- Das Bild wird im Browser auf höchstens 1600 mal 1200 Pixel verkleinert
- Es wird als WebP komprimiert, falls dein Browser das kann, sonst als JPG
- Es landet in Firebase Storage unter `blog/` mit einem Namen aus dem
  Artikel-Slug
- Die Adresse wird direkt in den Artikel eingetragen

Ein Handyfoto mit vier Megabyte wird so meist auf unter 200 Kilobyte
gedrückt. Das ist wichtig, weil Ladezeit direkt in die Google-Bewertung
einfließt.

**Alternativtext nicht vergessen.** Der steht im Feld darunter und kommt
meistens schon aus dem Auftragstext mit. Er zählt für Google und für
Menschen, die einen Screenreader nutzen.

Wenn du lieber ein Bild von woanders einbindest, klapp unter dem
Upload-Feld „Bild-Adresse von Hand eintragen" auf.

## Warum kein Auto-Publish

Ein ungeprüfter Text mit falschen Preisen über das eigene Geschäft wäre ein
echtes Risiko. Außerdem straft Google reinen Massen-Content ab. Ein Blick
über den Entwurf vor der Freigabe kostet zwei Minuten und schützt vor
beidem.

## Rhythmus

Ein Artikel pro Woche reicht. Nach einem halben Jahr sind das gut zwanzig
Seiten, jede für mehrere Suchbegriffe auffindbar. Wichtiger als Menge ist,
dass jeder Artikel eine echte Frage beantwortet.
