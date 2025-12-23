export default function AdminHomePage() {
	return (
		<div className="space-y-8">
			<header className="space-y-2">
				<p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Overview</p>
				<h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
				<p className="text-sm text-neutral-600">Quick glance at activity across responses, customers, and surveys.</p>
			</header>

			<section className="grid gap-4 md:grid-cols-3">
				<div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
					<h2 className="text-sm font-medium text-neutral-800">Quick stats</h2>
					<p className="text-sm text-neutral-500">Hook this to /api/admin/stats.</p>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
					<h2 className="text-sm font-medium text-neutral-800">Recent alerts</h2>
					<p className="text-sm text-neutral-500">Show low ratings / negative sentiment.</p>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
					<h2 className="text-sm font-medium text-neutral-800">Actions</h2>
					<ul className="space-y-1 text-sm text-neutral-700">
						<li>/admin/responses</li>
						<li>/admin/customers</li>
						<li>/admin/survey</li>
					</ul>
				</div>
			</section>
		</div>
	);
}
