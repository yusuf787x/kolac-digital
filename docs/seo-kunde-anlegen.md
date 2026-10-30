# SEO-Kundenportal: Einrichtung und neuen Kunden anlegen

## Einmalig: Einrichtung

### 1. Google Cloud (gleiches Projekt wie Firebase reicht)

1. In der Google Cloud Console das Firebase-Projekt öffnen.
2. **APIs aktivieren:** „Google Search Console API“ und „PageSpeed Insights API“.
3. **Service Account anlegen:** IAM & Verwaltung, Dienstkonten, „Dienstkonto erstellen“, z. B. `seo-reports`. Rollen braucht er keine.
   Unter „Schlüssel“ einen JSON-Schlüssel erzeugen.
4. **API-Schlüssel für PageSpeed:** APIs & Dienste, Anmeldedaten, „API-Schlüssel erstellen“. Einschränken auf die PageSpeed Insights API.

### 2. Vercel-Umgebungsvariablen

| Variable | Inhalt |
|---|---|
| `GSC_SERVICE_ACCOUNT_JSON` | kompletter Inhalt der JSON-Datei aus Schritt 1.3 |
| `PAGESPEED_API_KEY` | Schlüssel aus Schritt 1.4 |
| `CRON_SECRET` | beliebige lange Zufallszeichenkette. **Pflicht:** Ohne sie lehnt der SEO-Cron in Produktion ab. Vercel schickt sie automatisch mit. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ist schon gesetzt (Admin SDK). Lokal in `.env.local` eintragen, sonst funktionieren Portal und SEO-Admin auf `localhost` nicht. |
| `PORTAL_BASE_URL` | optional, z. B. `https://www.kolac-digital.de`. Sonst gilt `APP_BASE_URL` bzw. die Vercel-Produktionsadresse. Davon hängen die Links in den Mails ab. |

### 3. Firebase-Konsole

1. **Authentication, Anmeldemethoden:** „E-Mail/Passwort“ öffnen und **„E-Mail-Link (Anmeldung ohne Passwort)“ aktivieren**.
2. **Authentication, Einstellungen, Autorisierte Domains:** `kolac-digital.de` und `www.kolac-digital.de` eintragen. `localhost` ist schon drin.
3. **Firestore, TTL-Richtlinien** (räumt automatisch auf):
   - Sammlung `portalLoginLinks`, Feld `expiresAt`
   - Sammlung `portalRateLimits`, Feld `expiresAt`
   - Sammlung `portalLoginEvents`, Feld `expiresAt` (90 Tage)
4. Firestore- und Storage-Rules bleiben unverändert. Das Portal liest nur serverseitig über das Admin SDK.

### 4. Testen mit dem Testkunden

1. Dashboard, **SEO-Kunden**, „Testkunde anlegen“ (dauert etwa 30 Sekunden).
2. Tab **Berichte:** Der neueste Monat ist ein Entwurf. „Vorschlag aus den Zahlen“, Text ergänzen, „PDF ansehen“, „Portal-Vorschau“.
3. Tab **Portal-Zugang:** eine eigene zweite Adresse einladen (nicht `yusuf@kolac-digital.de`, damit sich Admin- und Kundenkonto nicht vermischen).
4. Mail öffnen, „Jetzt anmelden“. Den Link auch einmal auf dem Handy öffnen: Dann fragt die Seite nach der E-Mail.
5. Zurück im Admin, den Entwurf **freigeben und senden**. Die Mail an den Kunden kommt an, und der Monat ist im Portal sichtbar.
6. Zugang entziehen und prüfen, dass das Portal sofort zum Login zurückschickt.
7. Danach „Testkunde löschen“. Das entfernt alles, auch den Eintrag unter Kunden.

Lokal ohne `RESEND_API_KEY` stehen die Mails samt Login-Link in der Konsole von `npm run dev`.

## Pro Kunde: neuen SEO-Kunden anlegen

### 1. Service Account in die Search Console des Kunden eintragen

1. Search Console des Kunden öffnen (der Kunde muss dich als Inhaber eingetragen haben oder es selbst tun).
2. Einstellungen, Nutzer und Berechtigungen, „Nutzer hinzufügen“.
3. Die E-Mail des Service Accounts eintragen. Sie steht im Admin unter Tab **Daten**, z. B. `seo-reports@….iam.gserviceaccount.com`.
4. Berechtigung **„Eingeschränkt“** reicht.

### 2. Im Dashboard anlegen

1. Der Kunde muss unter **Kunden** existieren.
2. **SEO-Kunden**, „SEO-Kunde hinzufügen“: Kunde wählen, Domain (z. B. `motorenfachmann.de`), Marken-Begriffe.
   Als Property wird automatisch `sc-domain:motorenfachmann.de` gesetzt. Gibt es beim Kunden nur eine URL-Präfix-Property, unter Einstellungen auf `https://www.motorenfachmann.de/` ändern (mit Schrägstrich am Ende).
3. Tab **Einstellungen:**
   - **Marken-Begriffe**, einer pro Zeile, z. B. `motorenfachmann`. Leerzeichen und Umlaute werden angeglichen, Tippvarianten bitte einzeln eintragen.
   - **Themen-Gruppen** mit regulären Ausdrücken, z. B. für Motorenfachmann:
     - Motorinstandsetzung: `instandsetz`, `überhol|ueberhol`
     - Austauschmotor: `austauschmotor|tauschmotor`
     - Motorschaden: `motorschaden|kolbenfresser|zylinderkopf|steuerkette`
     - Motorcodes: `\b(n47|n57|om651|om642|ea189|ea288)\b`
     - Städte: `bielefeld|lage|detmold|herford|münchen|berlin|hamburg`

     Mit „Regeln testen“ gleich prüfen. Änderungen gelten rückwirkend für alle gespeicherten Monate.
   - **Ladezeit-Seiten:** 3 bis 5 wichtige URLs (Startseite, Hauptleistungen).
4. Tab **Daten**, „Historie laden (16 Monate)“. So weit hält Google die Daten vor. Ab dann speichern wir selbst und dauerhaft.
5. Tab **Daten**, „Jetzt aktualisieren“: Vormonat plus Ladezeit, legt den ersten Bericht als Entwurf an.

### 3. Maßnahmen

- Tab **Maßnahmen**, „Markdown importieren“. Für Motorenfachmann die `CHANGELOG.md` aus `Code/clients/Motorenfachmann` wählen.
  **Vor dem Import durchsehen:** Einträge mit Interna (Zugangsnamen, Passwörter, Hinweise auf den alten Dienstleister) abhaken oder nach dem Import umformulieren. Offene Punkte sind standardmäßig nicht sichtbar.
- Für Claude Code: „Schlüssel erzeugen“. Danach im Kundenprojekt:
  - `.kolac-portal.json` anlegen (Inhalt steht im Admin)
  - `KOLAC_PORTAL_TOKEN=…` in `.env` eintragen; `.env` muss in `.gitignore` stehen
  - Ab dann reicht in Claude Code „Changelog ins Portal“ (Skill `kolac-portal-changelog`). Claude zeigt erst einen Probelauf und sendet erst nach deinem OK.

### 4. Portal-Zugang

Tab **Portal-Zugang**, Adresse des Kunden einladen. Er bekommt sofort eine Mail mit Anmelde-Link.

## Jeden Monat

1. Am 4. um 8 Uhr (6 Uhr UTC) holt der Cron den Vormonat, misst die Ladezeit und legt die Berichte als Entwurf an.
2. Du bekommst eine Mail „… Berichte warten auf deine Freigabe“.
3. Pro Kunde: Einschätzung prüfen und ergänzen (was hast du gemacht, wie bewertest du die Entwicklung), PDF ansehen, **„Bericht freigeben und senden“**.
4. Erst dann sieht der Kunde den Monat und bekommt eine Mail mit Link.

## Wie die Zahlen entstehen

- **Klicks, Impressionen, Klickrate, Position** oben: Monatssummen der Search Console inklusive anonymisierter Suchanfragen. Die Keyword-Tabelle enthält nur die Suchbegriffe, die Google nennt, deshalb ist ihre Summe kleiner.
- **Chancen:** Suchbegriffe ohne Marke auf Platz 4 bis 15 mit mindestens 30 Impressionen. Klickpotenzial = Impressionen × erwartete Klickrate auf Platz 3 (10 %) minus heutige Klicks. Die CTR-Kurve steht kommentiert in `lib/seo/analysis.ts` (`CTR_CURVE`).
- **Gewinner und Verlierer:** mindestens 20 Impressionen in beiden Monaten und mindestens ein Platz Veränderung.
- **Ladezeit:** LCP und CLS aus echten Nutzerdaten (CrUX), wenn vorhanden, sonst aus dem Labortest. INP gibt es nur aus echten Nutzerdaten.

## Datenschutz

- Das Portal lädt keine externen Dienste. Die Google-APIs werden nur von unserem Server abgefragt.
- Die Datenschutzerklärung (`public/datenschutz.html`) beschreibt Portal, Cookies, Login-Protokoll und die Google-APIs (Abschnitte 4, 8 und 9).
- Die Search-Console-Daten sind zusammengefasste Suchstatistiken ohne Personenbezug. Personenbezogen sind nur die Portal-Adressen und das Login-Protokoll, und dafür ist Kolac Digital selbst verantwortlich. Wenn mit einem Kunden ein AV-Vertrag besteht, Google (Firebase, Search Console) und Resend in der Liste der Unterauftragsverarbeiter führen.
