"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

type VisitAnswer = {
  id: string;
  value_text: string | null;
  value_number: number | null;
  question: {
    id: string;
    code: string;
    prompt: string;
    question_type: string;
    options: any;
  };
};

type Visit = {
  id: string;
  location: "brickell" | "wynwood";
  created_at: string;
  answers: VisitAnswer[];
};

type TimeframeOption = "7d" | "30d" | "90d" | "365d";

const timeframeOptions: Array<{ label: string; value: TimeframeOption }> = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 365 days", value: "365d" },
];

function computeRange(timeframe: TimeframeOption) {
  const now = new Date();
  const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : 365;
  const from = new Date(now);
  from.setDate(now.getDate() - (days - 1));
  return { from: from.toISOString(), to: now.toISOString() };
}

export default function AdminCustomersPage() {
  const [timeframe, setTimeframe] = useState<TimeframeOption>("30d");
  const [locationFilter, setLocationFilter] = useState<"brickell" | "wynwood">("brickell");
  const [stats, setStats] = useState<{ totalNew: number; byLocation: { brickell: number; wynwood: number } } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visitLocationFilter, setVisitLocationFilter] = useState<"all" | "brickell" | "wynwood">("all");
  const [visitTimeframe, setVisitTimeframe] = useState<TimeframeOption>("90d");

  const range = useMemo(() => computeRange(timeframe), [timeframe]);
  const visitRange = useMemo(() => computeRange(visitTimeframe), [visitTimeframe]);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoadingStats(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("from", range.from);
        params.set("to", range.to);
        const res = await fetch(`/api/admin/customers/stats?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load stats");
        setStats({ totalNew: json.totalNew ?? 0, byLocation: json.byLocation || { brickell: 0, wynwood: 0 } });
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load stats");
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, [range.from, range.to]);

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoadingCustomers(true);
        setError(null);
        const params = new URLSearchParams({ limit: "200" });
        params.set("from", visitRange.from);
        params.set("to", visitRange.to);
        if (visitLocationFilter !== "all") params.set("location", visitLocationFilter);
        const res = await fetch(`/api/admin/customers?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) {
          console.error("loadCustomers response", json);
          throw new Error(json?.error || "Failed to load customers");
        }
        const list: Customer[] = Array.isArray(json?.data) ? json.data : [];
        setCustomers(list);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load customers");
      } finally {
        setLoadingCustomers(false);
      }
    }
    loadCustomers();
  }, [visitRange.from, visitRange.to, visitLocationFilter]);

  useEffect(() => {
    // When filters change, clear selection so details match the filtered window.
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
    setVisits([]);
    setExpandedVisitId(null);
  }, [visitTimeframe, visitLocationFilter]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    async function loadDetail() {
      try {
        setLoadingDetail(true);
        setError(null);
        const [customerRes, visitsRes] = await Promise.all([
          fetch(`/api/admin/customers/${selectedCustomerId}`),
          fetch(`/api/admin/customers/${selectedCustomerId}/visits`),
        ]);

        const customerJson = await customerRes.json();
        if (!customerRes.ok) throw new Error(customerJson?.error || "Failed to load customer");

        let visitsJson: any = null;
        try {
          visitsJson = await visitsRes.json();
        } catch (parseErr) {
          const text = await visitsRes.text();
          console.error("visits fetch parse error", { status: visitsRes.status, body: text.slice(0, 400) });
          throw new Error(`Failed to load visits (${visitsRes.status})`);
        }
        if (!visitsRes.ok) throw new Error(visitsJson?.error || "Failed to load visits");

        setSelectedCustomer(customerJson as Customer);
        setVisits(Array.isArray(visitsJson?.visits) ? visitsJson.visits : []);
        setEditName((customerJson as Customer).name || "");
        setEditEmail((customerJson as Customer).email || "");
        setEditPhone((customerJson as Customer).phone || "");
        setSaveError(null);
        setSaveSuccess(false);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load customer detail");
      } finally {
        setLoadingDetail(false);
      }
    }
    loadDetail();
  }, [selectedCustomerId]);

  const locationCount = stats?.byLocation[locationFilter] ?? 0;
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const matchesLocation = visitLocationFilter === "all" || v.location === visitLocationFilter;
      const created = new Date(v.created_at).toISOString();
      return matchesLocation && created >= visitRange.from && created <= visitRange.to;
    });
  }, [visits, visitLocationFilter, visitRange.from, visitRange.to]);

  const hasCustomerChanges = useMemo(() => {
    if (!selectedCustomer) return false;
    const baseName = selectedCustomer.name || "";
    const baseEmail = selectedCustomer.email || "";
    const basePhone = selectedCustomer.phone || "";
    return (
      editName.trim() !== baseName.trim() ||
      editEmail.trim() !== baseEmail.trim() ||
      editPhone.trim() !== basePhone.trim()
    );
  }, [selectedCustomer, editName, editEmail, editPhone]);

  async function handleSaveCustomer() {
    if (!selectedCustomerId) return;
    setSavingCustomer(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload: Record<string, string | undefined> = {
        name: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
      };

      const res = await fetch(`/api/admin/customers/${selectedCustomerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update customer");

      const updated = json as Customer;
      setSelectedCustomer(updated);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSaveSuccess(true);
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || "Failed to save customer");
    } finally {
      setSavingCustomer(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-neutral-500">Admin / Customers</p>
        <h1 className="text-2xl font-semibold text-neutral-900">Customers</h1>
        <p className="text-sm text-neutral-600">Profiles, visit history, and exports.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-[#EB5A95]/10 to-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#EB5A95]">New customers</p>
              <p className="text-4xl font-semibold text-[#EB5A95]">
                {loadingStats ? "—" : stats?.totalNew ?? 0}
              </p>
            </div>
            <div className="relative">
              <select
                className="h-9 appearance-none rounded-full border border-[#EB5A95]/30 bg-white px-3 pr-8 text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#EB5A95]/40"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as TimeframeOption)}
              >
                {timeframeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#EB5A95]">▾</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-600">Total new customers across both locations in the selected window.</p>
        </div>

        <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-[#EB5A95]/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#EB5A95]">By location</p>
              <p className="text-4xl font-semibold text-[#EB5A95]">
                {loadingStats ? "—" : locationCount}
              </p>
            </div>
            <div className="relative">
              <select
                className="h-9 appearance-none rounded-full border border-[#EB5A95]/30 bg-white px-3 pr-8 text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#EB5A95]/40"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value as "brickell" | "wynwood")}
              >
                <option value="brickell">Brickell</option>
                <option value="wynwood">Wynwood</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#EB5A95]">▾</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-600">New customers with visits at the selected location during this window.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Customers</h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
            <p>Select a customer to view their profile and visits.</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Timeframe</span>
              <div className="relative">
                <select
                  className="h-8 appearance-none rounded-full border border-neutral-200 bg-white px-3 pr-7 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#EB5A95]/30"
                  value={visitTimeframe}
                  onChange={(e) => setVisitTimeframe(e.target.value as TimeframeOption)}
                >
                  {timeframeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-500">▾</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Location</span>
              <div className="relative">
                <select
                  className="h-8 appearance-none rounded-full border border-neutral-200 bg-white px-3 pr-7 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#EB5A95]/30"
                  value={visitLocationFilter}
                  onChange={(e) => setVisitLocationFilter(e.target.value as "all" | "brickell" | "wynwood")}
                >
                  <option value="all">All</option>
                  <option value="brickell">Brickell</option>
                  <option value="wynwood">Wynwood</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-500">▾</span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-0 md:grid-cols-[260px_1fr]">
          <div className="border-b border-neutral-200 md:border-b-0 md:border-r md:border-neutral-200">
            <div className="max-h-[640px] overflow-auto">
              {loadingCustomers && <div className="px-4 py-3 text-sm text-neutral-500">Loading customers...</div>}
              {!loadingCustomers && customers.length === 0 && (
                <div className="px-4 py-3 text-sm text-neutral-500">No customers found.</div>
              )}
              {customers.map((customer) => {
                const active = customer.id === selectedCustomerId;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`flex w-full flex-col items-start gap-0.5 border-b border-neutral-100 px-4 py-3 text-left transition hover:bg-neutral-50 ${active ? "border-l-4 border-[#EB5A95] bg-[#EB5A95]/10" : "border-l-4 border-transparent"}`}
                  >
                    <span className={`text-sm font-semibold ${active ? "text-[#EB5A95]" : "text-neutral-900"}`}>{customer.name || customer.email || "(No name)"}</span>
                    <span className={`text-xs ${active ? "text-[#EB5A95]" : "text-neutral-500"}`}>{customer.email || "No email"}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="min-h-[320px] px-5 py-4">
            {loadingDetail && <div className="text-sm text-neutral-500">Loading customer details...</div>}
            {!loadingDetail && selectedCustomer && (
              <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="w-full md:w-1/2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 mb-1">Name</p>
                    <input
                      className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm shadow-sm focus:border-[#EB5A95] focus:ring-2 focus:ring-[#EB5A95]/20 focus:outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Add a name"
                    />
                  </div>
                    <div className="w-full md:w-1/2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 mb-1">Email</p>
                    <input
                      className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm shadow-sm focus:border-[#EB5A95] focus:ring-2 focus:ring-[#EB5A95]/20 focus:outline-none"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Add an email"
                      type="email"
                    />
                  </div>
                    <div className="w-full md:w-1/2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 mb-1">Phone</p>
                    <input
                      className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm shadow-sm focus:border-[#EB5A95] focus:ring-2 focus:ring-[#EB5A95]/20 focus:outline-none"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Add a phone"
                      type="tel"
                    />
                  </div>
                    <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveCustomer}
                      disabled={savingCustomer || !hasCustomerChanges}
                      className="inline-flex items-center rounded-full bg-[#EB5A95] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d94483] disabled:opacity-50"
                    >
                      {savingCustomer ? "Saving…" : "Save changes"}
                    </button>
                    {saveSuccess && <span className="text-xs text-emerald-600">Saved</span>}
                    {saveError && <span className="text-xs text-rose-600">{saveError}</span>}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#EB5A95]">Visits</p>
                  <div className="mt-3 space-y-2">
                    {filteredVisits.length === 0 && <div className="text-sm text-neutral-600">No visits yet.</div>}
                    {filteredVisits.map((visit, idx) => {
                      const open = expandedVisitId === visit.id;
                      return (
                        <div
                          key={visit.id}
                          className={`bg-white ${idx < filteredVisits.length - 1 ? "border-b border-neutral-200" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedVisitId(open ? null : visit.id)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-[#EB5A95]/15 px-2 py-0.5 text-[11px] font-semibold text-[#EB5A95]">
                                {visit.location === "brickell" ? "Brickell" : "Wynwood"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-neutral-500">
                              <span>{new Date(visit.created_at).toLocaleString()}</span>
                              <span className={`transform transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
                            </div>
                          </button>
                          <div
                            className="border-t border-neutral-200 px-4 space-y-3 overflow-hidden transition-all duration-200 ease-in-out"
                            style={{ maxHeight: open ? "600px" : "0px", paddingTop: open ? "12px" : "0px", paddingBottom: open ? "12px" : "0px", opacity: open ? 1 : 0 }}
                          >
                            {(!visit.answers || visit.answers.length === 0) && (
                              <div className="text-sm text-neutral-600">No answers recorded.</div>
                            )}
                            {visit.answers?.map((ans) => (
                              <div key={ans.id} className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                                <p className="text-xs font-semibold text-neutral-700">{ans.question.prompt}</p>
                                <p className="text-sm text-neutral-900 mt-1">
                                  {ans.value_text ?? ans.value_number ?? "—"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {!loadingDetail && !selectedCustomer && (
              <div className="text-sm text-neutral-500">Select a customer to view details.</div>
            )}
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
