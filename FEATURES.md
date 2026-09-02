# Kolac Digital Dashboard — Funktionalitäten

Zentrale Referenz aller Features des Business-Dashboards. Verweis-Ziel für andere Projekte (via User-Skill `kolac-digital`).

Repository-Root: `/Users/yusufkolac/Documents/03Orga/kolac digital/kolac-digital`
Stack: Next.js 14 App Router, Firebase (Firestore + Storage + Admin), Tailwind, `@react-pdf/renderer`, `pdf-lib`.

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
- Storage-Rules identisch.
- Admin SDK via `FIREBASE_SERVICE_ACCOUNT_JSON` env var (`lib/firebase-admin.ts`).

## Marketing-Site

Statische Landing + `/case-studys/[slug]/page.tsx` (Bacara, CarHifi, Kolac Digital) mit shared `SiteHeader`/`SiteFooter`, Video-Testimonials (YouTube nocookie), 3D-Icons für Overview-Cards.

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
