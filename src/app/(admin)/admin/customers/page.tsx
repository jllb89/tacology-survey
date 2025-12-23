export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Admin / Customers</p>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-gray-600">Profiles, visit history, and exports.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-gray-700">Counts</h2>
          <p className="text-sm text-gray-500">Total customers, new this period.</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-gray-700">Segments</h2>
          <p className="text-sm text-gray-500">By location, by sentiment/NPS.</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-medium text-gray-700">Exports</h2>
          <p className="text-sm text-gray-500">CSV/XLSX triggers.</p>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium text-gray-700">Customers table</h2>
        <p className="text-sm text-gray-500">Search by email/name; view response history.</p>
      </section>
    </div>
  );
}
