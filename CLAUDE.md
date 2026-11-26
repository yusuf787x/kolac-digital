@AGENTS.md

## Kundenportal (Kolac Digital als eigener SEO-Kunde)
- Dieses Projekt ist auch die eigene Website kolac-digital.de. Nach jeder abgeschlossenen, für Besucher sichtbaren Änderung an der Website (Inhalte, Seiten, SEO, Ladezeit): CHANGELOG.md nach Skill `kolac-portal-changelog` ergänzen, mit Nachweis-Links, und **ohne Rückfrage** ins eigene Portal übertragen (`node scripts/portal-changelog.mjs`). Danach kurz berichten, was übertragen wurde.
- Nicht ins CHANGELOG: Änderungen an Dashboard, Kundenportal, Buchhaltung, Verträgen und anderen internen Werkzeugen.
- Nach jedem Scan oder Test der Website: Ergebnis als Prüfung in `portal-pruefungen/` ablegen und übertragen.
- Monatsbericht: ab dem 4. eines Monats Bericht für den Vormonat mit `scripts/portal.mjs` erstellen (siehe Skill).
- Der Schlüssel steht in `.env.local` (nie ausgeben oder committen).

## UI work
Read DESIGN.md before creating or changing any UI on the public marketing pages, and take every colour, size, spacing and radius from its tokens (`public/css/style.css`). The internal dashboard has its own design: read DASHBOARD-DESIGN.md and use the tokens in `app/dashboard/dashboard.css` (scoped to `.dash`, never change shared utilities in `app/globals.css` for the dashboard, the public site uses them too).
For a new screen or component, consult the UX Engine skills first (ux-intent-discovery, then the ones it names). To fix an existing screen, ux-auditor.
