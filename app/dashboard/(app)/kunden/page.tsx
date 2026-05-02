export default function KundenPage() {
  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Kunden</h1>
          <p className="mt-1 text-sm text-gray-500">
            Alle Kunden, ihre Stammdaten und Rechnungshistorie.
          </p>
        </div>
        <button className="btn-primary" disabled>
          + Neuer Kunde
        </button>
      </header>

      <div className="card">
        <p className="text-sm text-gray-500">
          Kundenliste — wird in Phase 3 mit Firestore-Daten gefüllt.
        </p>
      </div>
    </div>
  );
}
