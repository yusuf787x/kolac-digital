export default function DashboardHomePage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Übersicht über Umsatz, offene Rechnungen und Ausgaben.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Umsatz aktueller Monat" value="—" />
        <StatCard label="Umsatz letzter Monat" value="—" />
        <StatCard label="Offene Rechnungen" value="—" />
        <StatCard label="Ausgaben dieser Monat" value="—" />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Letzte Aktivitäten
          </h2>
          <p className="text-sm text-gray-500">
            Hier erscheinen die letzten 5 Aktivitäten — z.B. neue Rechnungen
            und Zahlungseingänge.
          </p>
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hinweis</h2>
          <p className="text-sm text-gray-500">
            Phase 1 ist installiert. In den nächsten Phasen werden die Daten
            aus Firestore geladen und alle Module mit Funktion gefüllt.
          </p>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
