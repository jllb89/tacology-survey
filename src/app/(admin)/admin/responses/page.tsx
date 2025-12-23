export default function AdminResponsesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Admin / Responses</p>
        <h1 className="text-2xl font-semibold">Responses & Analytics</h1>
        <p className="text-sm text-gray-600">Hook to stats API, vector search, and responses table.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-gray-700">KPIs</h2>
          <p className="text-sm text-gray-500">Totals, NPS, sentiment, location split.</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-gray-700">Trends</h2>
          <p className="text-sm text-gray-500">Daily counts, average ratings.</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-gray-700">Search & Alerts</h2>
          <p className="text-sm text-gray-500">Vector search and recent negative alerts.</p>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium text-gray-700">Responses table</h2>
        <p className="text-sm text-gray-500">Add filters: location, date range, rating, sentiment.</p>
      </section>
    </div>
  );
}
