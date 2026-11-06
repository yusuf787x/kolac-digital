@AGENTS.md

## Kundenportal (Kolac Digital als eigener SEO-Kunde)
- Dieses Projekt ist auch die eigene Website kolac-digital.de. Nach jeder abgeschlossenen, für Besucher sichtbaren Änderung an der Website (Inhalte, Seiten, SEO, Ladezeit): CHANGELOG.md nach Skill `kolac-portal-changelog` ergänzen, mit Nachweis-Links, und **ohne Rückfrage** ins eigene Portal übertragen (`node scripts/portal-changelog.mjs`). Danach kurz berichten, was übertragen wurde.
- Nicht ins CHANGELOG: Änderungen an Dashboard, Kundenportal, Buchhaltung, Verträgen und anderen internen Werkzeugen.
- Nach jedem Scan oder Test der Website: Ergebnis als Prüfung in `portal-pruefungen/` ablegen und übertragen.
- Monatsbericht: ab dem 4. eines Monats Bericht für den Vormonat mit `scripts/portal.mjs` erstellen (siehe Skill).
- Der Schlüssel steht in `.env.local` (nie ausgeben oder committen).
