export default function AusgabenPage() {
  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Ausgaben</h1>
          <p className="mt-1 text-sm text-gray-500">
            Erfasse Ausgaben mit Beleg-Upload, sortiert chronologisch nach
            Datum.
          </p>
        </div>
        <button className="btn-primary" disabled>
          + Neue Ausgabe
        </button>
      </header>

      <div className="card">
        <p className="text-sm text-gray-500">
          Ausgabenliste — wird in Phase 3 mit Firestore-Daten gefüllt.
        </p>
      </div>
    </div>
  );
}
