# Kolac Digital Dashboard — Funktionalitäten

Zentrale Referenz aller Features des Business-Dashboards. Verweis-Ziel für andere Projekte (via User-Skill `kolac-digital`).

Repository-Root: `/Users/yusufkolac/Documents/Code/internal/kolac-digital-web`
Stack: Next.js 16 App Router (React 19), Firebase (Firestore + Storage + Auth + Admin), Tailwind 4, `@react-pdf/renderer`, `pdf-lib`, Resend, Vercel Cron.

## Datenmodell (`lib/types.ts`)

`Customer`, `InvoiceItem` (mit optional-Flag + item-vatRate), `Invoice` (invoiceNumber `string | null` bei Draft), `Quote`, `Contract` (mit optional `templateData` für Bearbeit-Fähigkeit), `ContractType`, `ContractField`, `Expense`, `Deal`, `Activity`, `EmailTemplate`, `Task`, `TaskColumn`, `GoogleAuth`, `Settings`.

Wichtige Enums: `InvoiceStatus` (draft/sent/paid/partially_paid/overdue), `QuoteStatus` (draft/sent/accepted/rejected/invoiced/expired), `ContractStatus` (draft/sent/signed/expired/cancelled).

## Rechnungen (`app/dashboard/(app)/rechnungen/`)

- **Draft-Workflow**: `createInvoiceDraft` legt ohne Nummer an → auf Detail-Page „Rechnung stellen" → `finalizeInvoiceWithNumber` vergibt atomar via Transaction + Drive-Sync. Idempotent.
- **VAT pro Position** (0/7/19% pro Zeile) mit Fallback auf Rechnungs-Satz. Zentraler Helper: `computeInvoiceVat(items, fallbackRate)` in `lib/utils.ts` — gibt `{net, vat, gross, byRate}` zurück.
- **PDF** (`components/invoice/InvoicePDF.tsx`): pro Steuersatz eine USt-Zeile, GiroCode (Brutto) + Referral-Kasten „15% der ersten Rechnung als Auszahlung" nur auf letzter Seite (natural flow), sonst `fixed`-Footer mit Bank-Daten.
- **Rich-Text-Beschreibungen**: `RichTextArea` aus Quote-Modul wird auch für Positions-Beschreibungen genutzt. `parseRichText` normalisiert HTML+Markdown.
- **GoCardless Auto**: `app/api/gocardless/webhook/route.ts` legt Retainer-Rechnungen direkt mit Nummer über `createInvoiceWithNumber` an + versendet + Drive-Sync. Webhook schreibt Payments-Array mit `paidAt = chargedAt`, `amount = brutto`, `note = "GoCardless-Lastschrift"`.
- **Zahlungseingänge**: `Invoice.payments: InvoicePayment[]` ist die maßgebliche Quelle (paidAt, amount, note). **Alle Zahlungsbeträge sind BRUTTO** — `totalAmount` bleibt netto, Brutto = `totalAmount * (1 + vatRate)`. `paidAmount` = Summe der Payments (brutto), `paidAt` = letzter Zahlungseingang (Anzeige). Erfassung im Rechnungsdetail über Modal-Dialog: Datum (Default heute, frei änderbar) + Betrag (Default offener Restbetrag) + Notiz.
- **Firestore-API**: `addInvoicePayment(id, {paidAt, amount, note?})` und `removeInvoicePayment(id, index)` in `lib/firestore.ts` — atomar per Transaction, aktualisieren paidAmount + paidAt + Status. Status wird auf `paid` gesetzt sobald die Summe den Brutto-Betrag erreicht, sonst `partially_paid`.
- **Netto/Brutto-Konvention**: Umsatz/Erlös wird immer NETTO gezählt (Dashboard-Kennzahlen), offene Forderungen und Zahlungseingänge immer BRUTTO. Das Rechnungsdetail leitet bezahlt/offen aus `payments[]` ab, nicht aus `paidAmount`.
- **Datenprüfung**: `/dashboard/rechnungen/reparatur` (Button „Zahlungen prüfen") findet Rechnungen mit inkonsistenten Zahlungsdaten (Netto statt Brutto gespeichert, fehlende Historie, unvollständige Summe), zeigt Vorher/Nachher pro Rechnung und korrigiert erst nach Bestätigung. Analyse-Logik in `lib/invoice-repair.ts` (`analyzeInvoice`), idempotent — mehrfaches Ausführen bucht nichts doppelt.

## Angebote (`app/dashboard/(app)/angebote/`)

- **Draft/Sent/Accepted/Invoiced/Rejected/Expired**-Status. Nummer wird bei Anlage direkt vergeben (`createQuoteWithNumber`, format `A-YYYY-NNN`).
- **Optional-Positionen**: `item.optional=true` → nicht in Bindungs-Summe, aber „Optional zubuchbar" im PDF.
- **VAT pro Position** (analog Rechnung).
- **Rich-Text** in Einleitungstext + Positions-Beschreibungen (WYSIWYG, Bold + Bullets, Paste-Sanitizer aus KI/Docs).
- **Duplizieren**: Button auf Detail-Page → neues Angebot mit gleichen Positionen/Texten, frischer Nummer, Status draft.
- **Convert → Invoice-Draft** (nicht direkt Nummer): `createInvoiceDraft` mit übernommenen Positionen + item.vatRate.
- **Auftragsbestätigung**: Upload → Auto-Sync in Drive-Ordner „Aufträge", promotet Status draft→sent bei sent-Angebot.

## Verträge (`app/dashboard/(app)/vertraege/`)

Drei Modi im „Neuer Vertrag"-Flow:

1. **PDF hochladen** (Legacy) — freies PDF + Feld-Editor (`PdfFieldEditor.tsx`) für Signatur-/Datum-/Kolac-Signatur-Positionen.
2. **Aus Vorlage erstellen** (Template) — WYSIWYG-Freitext + Anlagen. Rendert `TemplateContractPdf.tsx`:
   - Hauptseite: Logo, Titel, Parteien-Block, Freitext, `fixed`-Footer
   - Signaturseite (eigene, letzte Hauptseite): Kolac-Signatur schon eingebettet, „Bielefeld, den [Datum]" links, leerer Slot rechts für Kundensignatur
   - Anlagen: je eigene Seite ab Signaturseite („ANLAGE N ZU …")
   - **Bearbeitbar** solange Draft/Sent (nicht signed/cancelled): `templateData` wird gespeichert, `/vertraege/[id]/edit/page.tsx` regeneriert PDF am gleichen Storage-Pfad → Signing-Link zeigt automatisch aktuelle Version.
3. **Angebot zur Unterschrift** (neu): Wenn Vertragstyp „Angebot" gewählt UND Angebot aus Dropdown selektiert → Original-Angebots-PDF wird 1:1 als Basis genutzt, `SignaturePageOnlyPdf.tsx` wird hintendran gemergt (pdf-lib). Freitext-UI ausgeblendet. Signaturfelder auf letzter Seite.

**Neuer-Typ-Inline**: Beim Anlegen kann ein neuer Vertragstyp direkt inline erstellt werden (`createContractType`).

**Signatur-Feld-Konstanten**: `SIG_FIELD_POSITIONS` in `TemplateContractPdf.tsx` — identisch verwendet in Template-Flow + Angebot-zur-Unterschrift-Flow.

## Signing-Flow (`app/sign/[token]/`)

- Öffentlicher Read-only-Zugang via signingToken (`generateSigningToken` in `lib/contract-utils.ts`).
- PDF-Viewer (`ContractPdfView.tsx`): Single-Page-Ansicht + Blätter-Navigation, Springen-zur-Signatur-Button, Tastatur-Steuerung.
- Overlay-Felder mit Preview: „Bünde, den 15.11.2025" (echte Vorschau aus `customerCity`), Kolac-Signatur schon sichtbar, „Deine Unterschrift kommt hier hin" auf dem Kundensignatur-Slot.
- Submit (`app/api/contracts/sign/submit/route.ts`): Zeichnet Kundensignatur + Datum (`"[Kundenstadt], den [heute]"`) an programmatischen Positionen via pdf-lib, hängt Audit-Seite mit IP/UA/SHA256 an.

## Berichte (`app/dashboard/(app)/berichte/`)

- **Einnahmen-CSV**: Rechnungs-Liste nach Jahr, Drafts ausgeschlossen.
- **UStVA**: Ausgangs-USt wird dem Monat des Zahlungseingangs zugeordnet, Vorsteuer dem Belegdatum der Ausgabe. Aggregiert über `effectivePayments(invoice)` und `computeIstOutputVatForInvoice()` — bei gemischten Steuersätzen proportional aufgeteilt (paidGross/totalGross). Warnung im Header zeigt Anzahl und Brutto-Summe der noch offenen Rechnungen. CSV-Export listet eine Zeile pro Zahlungseingang, Details-Tabelle ist nach Zahlung sortiert.
- **Elster-Zuordnung (Anlage EÜR)**: Ausgaben nach Elster-Zeile gruppiert (Zeile + Bezeichnung + Netto + Absetzbar + Nicht-abzugsfähig), automatische Kürzung Bewirtung 70 %, eigener Elster-CSV-Export (2 Spalten Zeile/Betrag, direkt in Elster übertragbar).

## EÜR-Kategorien und Elster-Zuordnung

- **`ExpenseCategory`** (in `lib/types.ts`): `Software/Tools`, `Werbung/Ads`, `Hardware`, `Reisen`, `Kfz-Kosten`, `Büro`, `Miete Büro`, `Weiterbildung`, `Telefon/Internet`, `Versicherungen`, `Fremdleistungen`, `Bewirtung`, `Geschenke`, `Sonstiges`.
- **`EXPENSE_CATEGORY_META`** (in `lib/types.ts`): Record<Category, { elsterLine, elsterLabel, deductibleRate, hint? }>. Zeilennummern beziehen sich auf Anlage EÜR 2024. Absetzbarkeit steuert nur die Ertragsteuer, NIE die Vorsteuer.
- **Bewirtung (§ 4 Abs. 5 Nr. 2 EStG)** → EÜR Zeile 66, `deductibleRate: 0.7`. Nur 70 % des Netto als Betriebsausgabe, 30 % steuerlich unbeachtlich. Vorsteuer aber zu 100 % in der UStVA abziehbar (das ist in `berichte/ustva` bereits korrekt, weil dort nur `vatRate` verwendet wird, nicht `deductibleRate`).
- **Geschenke** → Zeile 65. Grenze 35 € netto pro Empfänger/Jahr wird NICHT automatisch geprüft (Hinweis im UI).
- **Hardware** → Zeile 33 (GwG-Sofortabschreibung bis 800 € netto). Anschaffungen darüber müsste man manuell auf AfA-Verteilung setzen — aktuell nicht automatisiert.
- **Helper** `computeExpenseEurBreakdown(amount, vatRate, deductibleRate, reverseCharge)` in `lib/utils.ts` gibt `{ gross, net, vat, deductibleNet, nonDeductibleNet }`. Zentral in Liste/Neu-Formular/Berichte verwendet.
- **AI-Extractor** (`app/api/expense/extract/route.ts`) kennt alle Kategorien und die EÜR-Zuordnung — erkennt Bewirtung an Restaurant/Café/Gaststätte, Kfz an Tankstelle/Werkstatt, etc.
- **Migration bestehender Belege** (`/dashboard/ausgaben/migrate-eur`): einmalige Seite, Description-Heuristik in `lib/expense-recategorize.ts` schlägt für Alt-Belege bessere Kategorien vor, User bestätigt einzeln, dann `updateExpense`.
- **CSV-Export Ausgaben** enthält jetzt: Datum, Posten, Kategorie, EÜR-Zeile, Lieferant, Brutto, Netto, Vorsteuer, Abziehbar, Nicht-abzugsfähig, Reverse-Charge.
- **CSV-Export Elster-EÜR** (zusätzlich): 2 Spalten `Zeile / Betrag netto` — direkt in Elster übertragbar.

## Cold-Call-Modul (integriert im Salespilot)

- **Skript** (`/vertrieb/skript/`): versionierbare Cold-Call-Skripte (Blöcke + Einwand-Antworten), aktive Version + Rollback möglich. `CallScript` in Firestore-Collection `callScripts`. `createCallScriptVersion` archiviert alte + aktiviert neue atomar via Transaction. `activateCallScript` = Rollback.
- **Config** (`/vertrieb/call-log/config/`): Stufen (nicht erreicht/Gatekeeper/Einstieg/Pitch/Einwand/Abschluss), Ergebnisse (Termin/Rückruf/…), Einwand-Kategorien — alles editierbar in Firestore-Doc `callConfig/default`. `getCallLogConfig` seedet Default beim ersten Aufruf.
- **Erfassung** direkt im Salespilot: Stufe (optional) → Ergebnis-Klick → automatisch `CallLog`-Doc + Lead-`Activity` + Lead-Status/Rückruf gesetzt + Sprung zum nächsten Lead. Skript-Regie aufklappbar im gleichen Bildschirm.
- **Auswertung** (`/vertrieb/call-log/auswertung/`): Funnel pro Stage, Terminquote (basiert auf `outcomeIsSuccess`-Snapshots), Einwand-Häufigkeit, Skript-Versions-Vergleich (Quote pro Version), Caller-Vergleich. Alle Kennzahlen client-side aus `CallLog`-Snapshots, keine Composite-Indexe nötig.
- **Snapshots** in `CallLog`: `scriptVersionNumber`, `stageLabel`, `outcomeLabel`, `outcomeIsSuccess`, `objectionLabel`, `leadCompany` — Änderungen an Config/Skript ändern historische Kennzahlen NICHT.

## CRM & Aktivitäten

- **Deals** mit Stages (kontaktiert / erstgespraech / angebot_verschickt / vertrag_erhalten / abgeschlossen / verloren), Aktivitäten (anruf/email/notiz/meeting/angebot/vertrag/sonstiges).
- **E-Mail-Templates** mit Platzhaltern (`EmailTemplate`).
- **Aufgaben-Kanban** (Task/TaskColumn) mit Priority-Tags.

## Google Drive Sync (`lib/drive-sync.ts`)

- `syncInvoiceToDrive`: PDF in Kunden-Ordner + Zeile in Einnahmen-Sheet.
- `syncConfirmationToDrive`: Auftragsbestätigung → Ordner „Aufträge".
- `syncExpenseToDrive`: Beleg + Sheet-Zeile.
- OAuth via `lib/google-oauth.ts`, Refresh-Token im `GoogleAuth`-Doc.

## Datenbank + Auth

- Firestore-Rules: E-Mail-Whitelist auf `yusuf@kolac-digital.de` mit `email_verified=true`.
- **Admin-Routen** (`lib/server-auth.ts` `authenticate`) verlangen zusätzlich zur UID die Owner-E-Mail (`lib/owner.ts`). Bewusst ohne `emailVerified`, weil das Passwort-Konto des Inhabers unbestätigt ist und Firebase jede Adresse nur einmal vergibt. Seit es Portal-Konten gibt, sind auch fremde Firebase-ID-Tokens gültig; die kommen hier nicht durch. Das Dashboard-Layout meldet fremde Konten ab.
- `AuthProvider` (Firebase-Auth im Browser) sitzt nur noch in `app/dashboard/layout.tsx`. Marketing-Seiten und Portal laden kein Auth-SDK.
- Storage-Rules identisch.
- Admin SDK via `FIREBASE_SERVICE_ACCOUNT_JSON` env var (`lib/firebase-admin.ts`).

## Marketing-Site

Statische Landing + `/case-studys/[slug]/page.tsx` (Bacara, CarHifi, Kolac Digital) mit shared `SiteHeader`/`SiteFooter`, Video-Testimonials (YouTube nocookie), 3D-Icons für Overview-Cards.

**Datenschutz-Grundsatz: keine Verbindung zu Dritten vor einer Zustimmung.** Schriften für die statischen HTML-Seiten liegen lokal (`public/fonts/`, `public/css/fonts.css`), die Next-Seiten nutzen `next/font` (wird beim Build selbst gehostet). YouTube-Vorschaubilder liegen unter `public/images/video/<youtubeId>.jpg`, ein neues Video braucht dort ein Bild. Videos laden erst nach Einwilligung, der Schlüssel `kolac_cookie_consent` im localStorage gilt für die Startseite (`public/js/main.js`) und die Case Studys (`components/case-studies/VideoTestimonial.tsx`) gleichermaßen. Banner und Einstellungen: `public/js/cookie-consent.js`. Neue externe Dienste immer in `public/datenschutz.html` nachtragen.

## Style-Regeln

- **Kein Gedankenstrich** (— / –) in nutzerseitigem Text (UI, PDF, Buttons, Dialoge). Bindestrich in Wörtern (SEPA-QR, MwSt-Satz) ist OK. Siehe Memory `style_no_em_dash`.
- Rechnungs-PDF durchgängig **Sie**-Form.
- **Nummernkreise**: Rechnungen `R<n>` bis 30.06.2026, danach `KD-YYYY-NNN`. Angebote `A-YYYY-NNN`.
- **MwSt-Default** datumsabhängig (Kleinunternehmer 0% bis 30.06.2026, danach 19%).

## Kern-Utilities

- `lib/utils.ts`: `computeInvoiceVat`, `defaultVatRateForDate`, `computeVat`, `grossToNet`, `buildInvoiceNumber`, `buildQuoteNumber`, EPC-QR-Payload, Datums-Helper.
- `lib/simple-markdown.ts`: `parseRichText`, `htmlToMarkdown`, `parseMarkdownBlocks` (HTML aus WYSIWYG normalisieren, Legacy-Klartext-Verträglichkeit).
- `lib/pdf-generator.tsx`: `generateInvoicePdfBlob`, `generateQuotePdfBlob`, `generateTemplateContractBlob`, `generateQuoteWithSignatureBlob`, `quoteToTemplateHtml`.
- `lib/template-contract.ts`: `buildTemplateContractPdf` mit Doppel-Render (Hauptteil + Anlagen) für Signaturseiten-Erkennung.

## PDF-Komponenten

- `components/invoice/InvoicePDF.tsx`
- `components/quote/QuotePDF.tsx`
- `components/contract/TemplateContractPdf.tsx` (mit `SIG_FIELD_POSITIONS`)
- `components/contract/SignaturePageOnlyPdf.tsx` (Stand-alone-Signaturseite, für Angebot-zur-Unterschrift)

## Blog / Content-Hub (`app/blog/` + `app/dashboard/(app)/blog/`)

Artikel-Produktion ohne API-Kosten: der Text wird in einem Claude-Chat erzeugt und per Copy-Paste ins Dashboard übernommen. Ablauf und Format sind in `docs/blog-workflow.md` beschrieben.

**Datenmodell** (`lib/types.ts`): `BlogPost` mit slug, title, excerpt, `tldr` (Kurzantwort), `keyTakeaways[]` (Kasten „Alles auf einen Blick"), body als Markdown, category, targetKeywords, faq[], `sources[]` (Primärquellen mit Titel, Herausgeber, Datum, URL), meta-Angaben, `imagePrompt`/`imageAlt`/`heroImageUrl`, status draft/published, heroEmoji, readingMinutes. Dazu `BlogTopic` als Themen-Warteschlange.

**Öffentliche Seiten**: `/blog` und `/blog/[slug]`. Statisch beim Build über `generateStaticParams`, neue Artikel per ISR (`revalidate 600`) ohne Deploy. Gelesen wird über `lib/blog-server.ts` mit dem **Admin-SDK**, weil die Firestore-Rules nur den Inhaber zulassen. Dort wird immer auf `published` gefiltert, Entwürfe können also nicht nach außen gelangen.

**Suche und Filter in der Übersicht**: `components/marketing/BlogBrowser.tsx`. Kategorie-Chips mit Anzahl und Volltextsuche über Titel, Teaser, Kurzantwort, Kernaussagen und Zielbegriffe. Gefiltert wird im Browser, der Server rendert weiterhin alle Beiträge vor. Umlaut-Schreibweisen sind egal („Gebäude“, „Gebaeude“, „Gebaude“). Filter und Suche stehen in der Adresse (`?kategorie=…&suche=…`), die Canonical bleibt `/blog`.

**Ratgeber-Zählung**: `lib/blog-tracking.ts` + `POST /api/blog/track`. Ohne Cookies, ohne IP, ohne Besucherkennung, nur Summen. Gezählt werden Aufrufe der Übersicht und der Artikel mit grober Herkunft (Google, KI-Assistenten, andere Suchmaschinen, Social, intern, direkt), „gelesen“ (Artikelende gesehen und mindestens 20 Sekunden auf der Seite), „War dieser Beitrag hilfreich?“ (Ja/Nein), Klicks auf Erstgespräch, Telefon, E-Mail und Leistungsseiten, Kategorie-Klicks und Suchbegriffe samt Trefferzahl. Die Route schreibt per Admin-SDK nach `blogStats/{postId}`, `blogStatsDaily/{JJJJ-MM-TT}` und `blogSearches/{begriff}`. Bots werden am User-Agent aussortiert, unbekannte Artikel-IDs verworfen.

**Ratgeber-Statistik**: `/dashboard/blog/statistik`. Kennzahlen für 7, 30 oder 90 Tage, Tagesverlauf, Highlights (meistgelesen, am hilfreichsten, meiste Anfragen-Klicks), sortierbare Tabelle je Beitrag, Herkunft der Leser, Kategorie-Klicks, „Suchen ohne Treffer“ als Themenideen. Schalter „Diesen Browser nicht mitzählen“ für eigene Besuche.

**Keyword-Strategie**: `docs/blog-keyword-strategie.md`. Regeln für die Themenwahl (Kaufnähe zum eigenen Angebot, Long-Tail, Blog füttert Leistungsseiten), Cluster mit Hubs, Liste der zu meidenden Begriffe, Empfehlungen für Leistungsseiten.

**SEO und GEO pro Artikel**: BlogPosting-, FAQPage- und BreadcrumbList-Schema, eigene Meta-Angaben, Canonical, OG- und Twitter-Tags. Die `tldr`-Box und die FAQ-Antworten sind bewusst als zitierfähige Passagen für ChatGPT und AI Overviews gebaut. Quellen werden im Fließtext belegt und zusätzlich als Liste „Quellen“ unter dem Artikel (`components/marketing/ArticleSources.tsx`) sowie als `citation` im BlogPosting-Schema ausgegeben. Inhaltsverzeichnis mit Sprungmarken ab drei Überschriften. `/sitemap-blog.xml` wird dynamisch erzeugt und ist in `robots.txt` eingetragen.

**Markdown**: eigener Parser in `lib/blog-markdown.ts` (H2/H3 mit Sprungmarken, Listen, Zitate, Fettung, Links), gerendert von `components/marketing/ArticleBody.tsx`. Keine zusätzliche Abhängigkeit.

**Auftragstext**: `lib/blog-prompt.ts`, Konstante `BLOG_AUTHOR_PROMPT`. Enthält alle Fakten über Kolac Digital (Preise, Leistungen, Referenzen), die Stilregeln (du-Ansprache, einfache Sprache, keine Gedankenstriche) und das JSON-Ausgabeformat. **Preise und Positionierung werden an dieser einen Stelle gepflegt** und wirken auf alle künftigen Artikel.

**Übernahme**: `/dashboard/blog/einfuegen` führt in drei Schritten durch Thema wählen, Auftragstext kopieren, Antwort einfügen. `parsePastedArticle` verkraftet Codeblöcke und Text drumherum, prüft Pflichtfelder und meldet doppelte Slugs. `sanitizeArticleText` entfernt Gedankenstriche als Absicherung. Vorschau zeigt Google-Snippet mit Zeichenzählern, Kurzfassung, Bildvorschlag und den gerenderten Text.

**Dashboard**: `/dashboard/blog` mit Artikeln und Themen. Freigeben und zurückziehen per Klick. `/dashboard/blog/themen-laden` legt die vorbereiteten Themen aus `lib/blog-seed-topics.ts` an (Start-Themen plus 20 aus der Keyword-Recherche Oktober 2026), vorhandene Titel werden übersprungen. Editor mit Vorschau, Zeichenzählern, Kurzfassungs-Punkten, Titelbild-Feldern und FAQ-Pflege.

**Bild-Upload**: `components/dashboard/ImageUploadField.tsx` im Editor. Datei hineinziehen oder auswählen, `lib/image-optimize.ts` verkleinert im Browser per Canvas auf max. 1600x1200 und komprimiert zu WebP (Fallback JPG, Qualität 0.82). Upload nach Firebase Storage unter `blog/<slug>-<zeitstempel>.<ext>`, die Download-Adresse ist öffentlich abrufbar. Quota- und Rechte-Fehler werden verständlich gemeldet, als Rückfalloption lässt sich eine Adresse von Hand eintragen. Entfernen löscht die Datei auch aus dem Speicher, sofern sie von dort stammt.

**CTA**: `components/marketing/BlogCta.tsx`. Ziel steht in `PRIMARY_HREF`. Sobald die VSL-Landingpage steht, wird dort getauscht und alle Artikel zeigen dorthin.

**Auffindbarkeit**: Vier Wege führen Crawler und KI-Systeme zu neuen Artikeln, alle ohne Deploy. `/sitemap-blog.xml` und `/blog/feed.xml` (RSS 2.0, im HTML als `rel="alternate"` verlinkt, in der Search Console als Sitemap einreichbar). `/llms.txt` ist eine Route (`app/llms.txt/route.ts`), die den festen Text aus `lib/llms-content.ts` um alle veröffentlichten Artikel samt Kurzantwort ergänzt; der Platzhalter `{{BLOG}}` markiert die Stelle. Die statische Startseite zeigt die drei neuesten Artikel über `/blog/latest.json` (bewusst nicht unter `/api`, weil das in der robots.txt gesperrt ist), gerendert von `renderRatgeber()` in `public/js/main.js`. Freigeben im Dashboard erneuert alle vier Routen über `/api/blog/revalidate`. Ratgeber und Portfolio stehen in der Hauptnavigation aller drei Header-Varianten (index.html, `SiteHeader.tsx`, `marketing-chrome.js`); die Desktop-Nav greift ab 900px, darunter Hamburger.

## SEO-Kundenportal (`app/portal/` + `app/dashboard/(app)/seo/`)

Monatliche SEO-Berichte für Betreuungskunden aus der **Google Search Console API** und der **PageSpeed Insights API**, ohne kostenpflichtige SEO-Tools. Einrichtung und Ablauf für neue Kunden: `docs/seo-kunde-anlegen.md`.

**Datenmodell** (`lib/seo/types.ts`, alle Typen ohne Firebase-Import):
- `seoClients/{customerId}`: Konfiguration (Property, Marken-Begriffe, Themen-Gruppen als Regex, PageSpeed-URLs, Changelog-Schlüssel-Hash, `demo`)
- `seoMonthly/{customerId}_{YYYY-MM}`: Summen ohne Dimension; Zeilen in `rows/{queries-n|pages-n}` als JSON-Tupel, 4.000 pro Dokument
- `seoPagespeed/…`, `seoActivities/{auto}` (Maßnahmen mit `externalKey` gegen Dubletten), `seoReports/{customerId}_{YYYY-MM}` (Status draft/released, Einschätzung, PDF-Pfad, Empfänger)
- `seoChecks/{auto}`: Prüfungen (Scans) mit Kurzfassung, Kennzahlen (`key`, `better`), Befunden mit Ampel und Links
- `portalAccess/{email}`, `portalSessions/{sha256(token)}`, `portalLoginEvents`, `portalLoginLinks/{sha256(code)}`, `portalRateLimits/{sha256(key)}`

**Auswertung** (`lib/seo/analysis.ts`, rein, Test: `npx tsx lib/__tests__/seo-analysis.test.ts`): Marken-Erkennung mit Umlaut- und Leerzeichen-Angleichung, Regex-Gruppen, Positions-Buckets, Gewinner/Verlierer, Chancen über die kommentierte `CTR_CURVE`. Regeln werden **beim Lesen** angewendet, Konfigurationsänderungen gelten rückwirkend. `lib/seo/view.ts` `buildPortalData` baut daraus ein serialisierbares `PortalData`, das Portal, Admin-Vorschau und PDF gemeinsam nutzen.

**Login per Magic Link** (`lib/portal/`), nur freigeschaltete Adressen, ohne Firebase Authentication (Kunden haben kein Firebase-Konto):
- Zufälliger Code (256 Bit) per gebrandeter Resend-Mail auf die eigene Domain (`/portal/anmelden?code=`). In Firestore liegt nur der SHA-256, mit 1 Stunde Gültigkeit, Einmal-Nutzung und Geräte-Nonce-Cookie.
- Auf fremdem Gerät wird die E-Mail abgefragt (5 Versuche). Eingelöst wird per POST-Knopf, damit Mail-Scanner den Link nicht verbrauchen.
- Danach eine eigene Sitzung: zufälliges Token im httpOnly-Cookie, `portalSessions/{sha256}`, 7 Tage.
- Login-Seite antwortet immer gleich, die Arbeit läuft per `after()`. Rate-Limit 10 pro IP und Stunde, 3 pro Adresse in 15 Minuten.
- Jede Portal-Anfrage prüft Sitzung plus aktiven `portalAccess` mit gleicher `customerId`. Entziehen löscht alle Sitzungen der Adresse, sofort wirksam.
- Ursprünglich über `generateSignInWithEmailLink` und Firebase-Session-Cookies gebaut. Das scheiterte auf Vercel (jose als ES-Modul, danach „internal error“ von Identity Toolkit). Die `overrides` für `jose` 5 in `package.json` stammen daher und schaden nicht.

**Portal** (Server-Komponenten): `/portal` Monatsbericht (Einschätzung, Kennzahlen mit Vormonat/Vorjahr, 16-Monats-Verlauf, Maßnahmen des Monats, Keyword-Tabelle sortier- und filterbar nach Marke/Thema, Gewinner/Verlierer, Chancen, Positions-Verteilung, Themen, Seiten, Ladezeit mit Ampel, Geplantes), `/portal/massnahmen` (kompletter Verlauf), `/portal/berichte` (Archiv, PDF-Download über `/api/portal/report/[month]`). **Der Kunde sieht Zahlen nur bis zum neuesten freigegebenen Monat**; ältere Backfill-Monate ohne eigenen Bericht sind mit sichtbar. Veröffentlichte Maßnahmen sind sofort sichtbar. Diagramme ohne Bibliothek (`components/seo/charts/`), Farben in `palette.ts` (ordinale Blau-Rampe, validiert).

**Admin** (`/dashboard/seo`): Übersicht mit „Wartet auf Freigabe“; pro Kunde die Tabs Berichte, Maßnahmen, Portal-Zugang, Daten und Einstellungen. Die Konfiguration wird im Client über Firestore geschrieben (`lib/seo/client.ts`). Was Geheimnisse braucht, läuft über `/api/seo/*` mit `authenticate`.
- **Berichte:** Einschätzung mit regelbasiertem Vorschlag (`lib/seo/assessment.ts`, Sie-Form, keine Gedankenstriche), PDF ansehen, Portal-Vorschau, „Bericht freigeben und senden“ mit Bestätigung und Empfängerliste.
- **Maßnahmen:** Eintragen, Verbergen, Markdown-Import.
- **Daten:** 16-Monats-Backfill Monat für Monat aus dem Browser (kein Timeout).
- **Einstellungen:** Regex-Tester.
- **Testkunde:** „Muster Motoren GmbH (Demo)“ mit erzeugten Zahlen (`lib/seo/demo-data.ts`), komplett löschbar.

**PDF** (`components/seo/SeoReportPdf.tsx`, Stil wie InvoicePDF): Seite 1 Kennzahlen, Einschätzung und Klick-Verlauf, danach Maßnahmen, Marke/Nicht-Marke, Keywords, Gewinner, Chancen, Platzierungen, Themen, Seiten und Ladezeit. Ablage in Storage unter `seo-reports/{customerId}/{YYYY-MM}.pdf`, nie öffentlich. Entwürfe tragen einen Hinweis.

**Cron** `/api/seo/cron` (vercel.json `0 6 4 * *`, `CRON_SECRET` Pflicht): Vormonat abrufen, PageSpeed messen, Entwurf mit Einschätzungs-Vorschlag erzeugen. Freigegebene Berichte bleiben unangetastet. Danach Sammel-Mail an yusuf@. Kunden bekommen erst nach der Freigabe eine Mail.

**Prüfungen** (`lib/seo/checks.ts`, Portal `/portal/pruefungen`, Abschnitt „Aktueller Stand Ihrer Website“ im Bericht, im PDF unter dem Monat): Scans aus Claude Code mit Laien-Kurzfassung, Kennzahlen im Vergleich zur letzten Prüfung gleicher Art (über `metric.key`), Befunden (ok/warn/fail) und Links. Sofort sichtbar, unabhängig von der Berichtsfreigabe. Maßnahmen haben zusätzlich `links[]` (Spalte „Nachweis“ im CHANGELOG).

**Interna-Filter** (`looksSensitive`): neue Einträge aus Claude Code mit Passwort, Zugang, SFTP, Schlüssel oder IP werden nicht automatisch veröffentlicht, sondern als „Zurückgehalten“ gemeldet.

**Changelog aus Claude Code:** `POST /api/seo/changelog` mit Kunden-Schlüssel (`kdp_…`, nur SHA-256 gespeichert, im Admin erzeugt). Body `{ markdown | entries, checks, publish, dryRun }`.
- Parser `lib/seo/changelog-markdown.ts` (Format der Kundenprojekte: `## Datum`, `### Bereich`, Tabelle Status/Änderung/Nutzen, „Offene Punkte“).
- Idempotent: Ein Statuswechsel aktualisiert den Eintrag. Offene Punkte werden nie automatisch veröffentlicht und verschwinden, wenn sie aus der Datei entfernt werden.
- Skript `scripts/portal-changelog.mjs` (sendet `CHANGELOG.md` plus `portal-pruefungen/*.json`), User-Skill `kolac-portal-changelog` mit „Portal einrichten“ (legt Konfiguration und `CLAUDE.md`-Abschnitt im Kundenprojekt an, danach überträgt Claude automatisch).

**Später, optional:** `lib/seo/server/rank-providers.ts` definiert `RankProvider` für einen Pay-per-Use-Anbieter (z. B. DataForSEO) für Ziel-Keywords ohne Impressionen. Standardmäßig aus (`SEO_RANK_PROVIDER` leer bzw. `none`), noch nirgends aufgerufen.
