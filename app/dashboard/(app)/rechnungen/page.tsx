export default function RechnungenPage() {
  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Rechnungen</h1>
          <p className="mt-1 text-sm text-gray-500">
            Übersicht aller Rechnungen mit Status und Filter.
          </p>
        </div>
        <button className="btn-primary" disabled>
          + Neue Rechnung
        </button>
      </header>

      <div className="card">
        <p className="text-sm text-gray-500">
          Rechnungsliste — wird in Phase 3 mit Firestore-Daten gefüllt.
          Rechnungs-Baukasten und PDF-Generierung kommen in Phase 3 + 4.
        </p>
      </div>
    </div>
  );
}
