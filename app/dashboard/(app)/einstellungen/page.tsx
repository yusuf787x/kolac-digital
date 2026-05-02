export default function EinstellungenPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Einstellungen</h1>
        <p className="mt-1 text-sm text-gray-500">
          Standard-Zahlungsziel, Abschlusstext, Rechnungsformat und
          Google-Drive-Verbindung.
        </p>
      </header>

      <div className="space-y-6">
        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Rechnungs-Defaults
          </h2>
          <p className="text-sm text-gray-500">
            Standard-Zahlungsziel und Abschlusstext — wird in Phase 3 editierbar.
          </p>
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Google Drive
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Verbindet das Dashboard via OAuth2 mit deinem Google Drive für
            automatisches Backup von Rechnungen, Belegen und der Buchhaltungs-
            Tabelle.
          </p>
          <button className="btn-secondary" disabled>
            Google Drive verbinden
          </button>
          <p className="mt-3 text-xs text-gray-400">
            Aktiv ab Phase 5.
          </p>
        </section>
      </div>
    </div>
  );
}
