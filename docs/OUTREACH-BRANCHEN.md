# Outreach über Kosmetik hinaus: Branchen, Probleme, Anschreiben

Stand: 12.11.2026. Ergänzt `docs/OFFER-STUDIOS.md`. Die Probleme und Zielbilder je Branche stehen im Code in `lib/outreach-playbook.ts`. Von dort nutzen sie der Textgenerator (Dashboard „Text schreiben“, `scripts/outreach/draft.mts`) und die Antwort-Hilfe.

## Warum diese Branchen
Gesucht sind Betriebe mit hohem Auftragswert, bei denen ein einziger zusätzlicher Auftrag das System bezahlt: Küchenstudios, Badsanierung, Garten- und Landschaftsbau, Tischlereien, Überdachung, Wintergarten, Pool und Kamin, Hochzeitslocations, Brautmode, Fahrzeugaufbereitung, Juweliere mit Trauringen sowie ästhetische Medizin. Ästhetische Medizin nur außerhalb des Einzugsgebiets von Bacara (Paderborn, Osnabrück), damit kein Wettbewerber des Referenzkunden angeschrieben wird.

## Die Probleme je Branche (Recherche)
Die Quellen sind dünn und oft Foren oder Anbieter-Blogs. Sie decken sich aber mit dem, was Handwerk und Handel immer wieder sagen.

- **Handwerk allgemein (Bad, GaLaBau, Tischlerei, Ausbau):**
  - Ein Angebot dauert rund 3 Stunden, weil Angaben fehlen und nachgefragt werden muss ([Deutsche Handwerks Zeitung](https://www.deutsche-handwerks-zeitung.de/?p=382985)).
  - Nach Besichtigung und Angebot kommt oft nichts mehr. Kunden schicken Konkurrenzangebote zum Unterbieten ([Aroundhome](https://www.aroundhome.de/neuigkeiten/handwerker-ghosting-und-kundenverhalten/)).
  - Über die Hälfte der Kunden erwartet auf Online-Anfragen eine Antwort innerhalb einer Stunde ([DHZ](https://www.deutsche-handwerks-zeitung.de/kundenanfragen-schneller-beantwortet-349790/)).
  - Für ein Angebot sitzt man je nach Umfang mindestens 4 Stunden, größere Projekte dauern Tage ([Bauexpertenforum](https://www.bauexpertenforum.de/threads/unverschaemtes-angebot-des-galabauers.108207/)).
- **Küchenstudio:** Der Verkauf ist langwierig und teuer in der Beratung. Kunden lassen Grundrisse leicht anderswo nachbauen, und es gibt Abbrüche nach Monaten Planung ([Hausbau-Forum](https://www.hausbau-forum.de/posts/510771/), [selbststaendig-machen.at](https://www.selbststaendig-machen.at/?p=1257)).
- **Hochzeitslocation:** Paare suchen 12 bis 18 Monate vorher, fragen zuerst nach dem freien Datum und geben für die Location im Schnitt 8.568 € aus ([Bridebook](https://bridebook.com/de/article/hochzeitslocation-finden-besichtigung-tag-der-offenen-tuer-oder-hochzeitsmesse-so-entdeckt-ihr-euren-perfekten-ort)).
- **Brautmode:** Anproben binden deutlich mehr Zeit als eine normale Beratung. Erinnerungen und Anzahlungen senken Ausfälle am stärksten ([blue News](https://www.bluewin.ch/en/news/customers-simply-dont-show-up-now-swiss-entrepreneurs-are-speaking-out-li.3262030), [SimplyBook](https://simplybook.me/de/blog/how-to-reduce-no-shows)).
- **Fahrzeugaufbereitung:** Es kommen ständig Preisanfragen zur Keramikversiegelung. Fotos und Aufklärung schaffen Vertrauen ([TFF-Forum](https://tff-forum.de/t/lackschutz-keramikversiegelung-von-jls-fahrzeugveredelung/118968?page=2)).
- **Juwelier, Trauringe:** Paare kaufen zunehmend online. Wer vor Ort bleibt, wirbt mit online buchbarer Beratung ([Bridebook](https://bridebook.com/de/article/trauringe-verlobungsringe-mehr-so-waehlt-ihr-den-besten-hochzeitsjuwelier)).
- **Friseur:** Friseure gehen mitten im Schnitt ans Telefon. Ausfallquoten liegen bei 8 bis 15 % ([Scheduling Kit](https://schedulingkit.com/de/ai-scheduling/hair-salons), [infranken](https://www.infranken.de/lk/kitzingen/kitzingen-friseurin-verlangt-strafgebuehr-bei-nichterscheinen-extremst-schlimm-geworden-art-5885682,PRINT)).

## Das Anschreiben (nach Jans LinkedIn-Vorlage, für Instagram kürzer)
1. Hey + Vorname (nur wenn bekannt, nie erfinden)
2. Icebreaker aus Beitrag oder Bio, sonst aus Spezialisierung, Standorten oder Bewertungen
3. „Ich bin Yusuf, ich bau <Branche> <System>, komplett für euch.“
4. Scan: „Ich hab mal einen kurzen Scan über deine Seite laufen lassen:“ und alle Funde (bis vier) als kurze Liste, z. B. „Nicht sicher“ im Browser, keine Online-Buchung, langsame Antwort, keine Beschreibung für Google, keine eigene Website (nur Google und Instagram)
5. Schmerz als Brücke: „Das hör ich oft, die meisten <Branche> sagen mir: „…““
6. Die Funde behebt Yusuf kostenlos bzw. baut das Fehlende kostenlos ein, direkt im Entwurf für <Betrieb>, damit <Zielbild>. **In OWL (`isNearby`): Yusuf zeigt den Entwurf vor Ort**, Schlussfrage „Wann passt es dir, dass ich vorbeikomme?“. Nie behaupten, der Entwurf sei schon fertig.
7. Beweis ohne Link und ohne Namen, passend zum Betrieb (siehe unten)
8. „Ich liefer lieber erst, dann reden wir.“ und eine kurze Frage
9. LG Yusuf

650 bis 950 Zeichen, kein Link, kein Preis. Ohne Funde fällt Punkt 4 weg. Was Yusuf je Fund kostenlos anbietet, steht in `FIX` (`lib/outreach-playbook.ts`). Die Case Study kommt erst in der Antwort. Claude überspringt Betriebe, die nicht passen, etwa Einkaufszentren, Ketten oder eine Waschstraße statt eines Aufbereiters.

### Welche Referenz?
`referenceFor` in `lib/outreach-playbook.ts` wählt je Betrieb: zuerst die Branche (aus Kategorie und Name, erst dann aus der Suche), bei mehreren Referenzen in der Branche entscheidet das Stichwort (Ausbeulen → MC-Autopflege, Werkstatt → Motorenfachmann). Ohne passende Branche wählt Claude aus allen Referenzen die nächstliegende. Liegt eine andere Referenz in derselben Stadt, darf sie als Halbsatz mit rein („in Paderborn hab ich auch schon …“).

| Referenz | Für | Beweis |
|---|---|---|
| Bacara Ästhetik, Bünde | Kosmetik, Friseur, Ästhetik, Brautmode, Location, Juwelier | über 800 Termine online, ohne Anruf |
| MC-Autopflege, Herford | Aufbereitung, Smart-Repair, Ausbeulen, Lack | Ladezeit-Note Handy 99 statt 68, eigene Seiten für Leistungen und 12 Orte (neu, noch keine Anfrage-Zahlen) |
| CarHiFi Herford | Küche, Bad, GaLaBau, Tischlerei, Ausbau | 74 % mehr Anfragen, vorsortiert |
| PaderPuls, Paderborn | Fahrdienste, Pflege, Paderborn | spürbar mehr Anfragen und Anrufe |
| Motorenfachmann, Lage | Kfz-Werkstatt, Motoren | Onpage-Check 95 statt 60 Prozent |
| Fahrschule Kreuzer, Bielefeld | Fahrschulen, Bielefeld | Anmeldungen online statt nur per Anruf |
| AF-Gebäudeservice, OWL | Reinigung | Anfragen auch außerhalb der Bürozeiten |
| Pader Automobilzentrum, Paderborn | nur lokaler Bezug | Website und Google-Profil von null |

Neue Referenz: in `REFERENCES` eintragen, nur belegte Zahlen aus `lib/portfolio.ts`.

## Offene Punkte
- **Icebreaker aus Beiträgen** brauchen die Profildaten von ScrapeCreators (1 Credit pro Profil). Auf dem Testzugang sind nur noch 9 Credits.
- **Der Preis für Handwerks- und High-Ticket-Kunden** ist offen. Der Vorschlag in `OFFER-STUDIOS.md` (990 bis 1.490 €) ist für Studios gedacht. Für Küchenstudios und Handwerk ist er wohl zu niedrig.

## Ohne passendes Instagram: per Mail
Passt das gefundene Profil nicht oder gibt es keins, drückt Yusuf auf der Karte „Kein Instagram“. Der Betrieb wandert in die Ansicht „Per Mail“. „Mail schreiben“ holt die Adresse aus Impressum oder Kontakt (`lib/outreach-email.ts`, Adressen von Buchungsportalen werden ignoriert) und schreibt mit Claude eine Mail mit kurzer Auswertung der Website (`lib/outreach-mail.ts`). Der Aufbau ist derselbe wie bei der DM, nur in Sie-Form und mit Abmelde-Satz, ohne Link und ohne Preis. „In Mail öffnen“ füllt das Mailprogramm vor, Yusuf schickt selbst ab. Findet sich keine Adresse, trägt er sie von Hand ein oder ruft an; die Nummer steht auf der Karte. „Doch per Instagram“ holt das verworfene Profil zurück.

Recht: Werbe-Mails brauchen auch an Firmen eine vorherige Einwilligung (§ 7 Abs. 2 Nr. 2 UWG). Ein berechtigtes Interesse nach DSGVO ändert daran nichts, und eine Auswertung als Aufhänger macht die Mail nicht zur Nicht-Werbung. Das Risiko ist eine Abmahnung. Rechtlich sicherer erreicht man dieselben Betriebe per Anruf (bei Firmen reicht eine mutmaßliche Einwilligung) oder per Brief.
