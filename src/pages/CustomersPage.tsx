import { useEffect, useState, useMemo } from "react";
import { Search, X, ChevronRight, AlertTriangle, RefreshCw, Phone, Mail, FileText } from "lucide-react";
import {
  listCustomers,
  getCustomerSales,
  getCustomerPayments,
  updateCustomer,
  recordPayment,
  type CustomerProfile,
  type CustomerSale,
  type Payment,
} from "../lib/customers";
import { useMoney } from "../lib/format";

type Props = { businessId: string; role: string | null };

function Badge({ tone = "neutral", children }: { tone?: string; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    positive: "bg-green-50 text-green-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    neutral: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone] ?? tones.neutral}`}>
      {children}
    </span>
  );
}

function PaymentModal({
  businessId,
  customer,
  sales,
  onClose,
  onRecorded,
}: {
  businessId: string;
  customer: CustomerProfile;
  sales: CustomerSale[];
  onClose: () => void;
  onRecorded: () => void;
}) {
  const money = useMoney();
  const pendingSales = sales.filter((s) => s.balance > 0);
  const [saleId, setSaleId] = useState(pendingSales[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedSale = pendingSales.find((s) => s.id === saleId);

  const submit = async () => {
    setError("");
    const amt = Number(amount);
    if (!saleId) { setError("Select a sale."); return; }
    if (!amt || amt <= 0) { setError("Enter a valid payment amount."); return; }
    if (selectedSale && amt > selectedSale.balance) { setError(`Amount exceeds balance of ${money(selectedSale.balance)}.`); return; }
    setSaving(true);
    try {
      await recordPayment(businessId, customer.id, saleId, amt, method, reference);
      onRecorded();
      onClose();
    } catch {
      setError("Could not record payment. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">Record payment</h2>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button>
        </div>

        {pendingSales.length === 0 ? (
          <p className="text-sm text-gray-500">This customer has no outstanding balance.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1.5">Sale</span>
              <select value={saleId} onChange={(e) => setSaleId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                {pendingSales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.receipt_number} — balance {money(s.balance)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="block font-medium text-gray-700 mb-1.5">Amount (UGX)</span>
                <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="0" />
              </label>
              <label className="block text-sm">
                <span className="block font-medium text-gray-700 mb-1.5">Method</span>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank">Bank</option>
                  <option value="card">Card</option>
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1.5">Reference (optional)</span>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. MM transaction ID" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 mt-1">
              <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium">Cancel</button>
              <button disabled={saving} onClick={submit} className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">
                {saving ? "Recording..." : "Record payment"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerDetail({
  customer,
  businessId,
  onClose,
  onUpdated,
}: {
  customer: CustomerProfile;
  businessId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [sales, setSales] = useState<CustomerSale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const money = useMoney();
  const [showPayment, setShowPayment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: customer.full_name, phone: customer.phone ?? "", email: customer.email ?? "", notes: customer.notes ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"sales" | "payments">("sales");

  const reloadSales = () => {
    Promise.all([getCustomerSales(customer.id), getCustomerPayments(customer.id)])
      .then(([s, p]) => { setSales(s); setPayments(p); })
      .catch(() => undefined);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getCustomerSales(customer.id), getCustomerPayments(customer.id)])
      .then(([s, p]) => { setSales(s); setPayments(p); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [customer.id]);

  const saveEdit = async () => {
    setError("");
    if (!editForm.full_name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      await updateCustomer(customer.id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        notes: editForm.notes.trim() || null,
      });
      onUpdated();
      setEditing(false);
    } catch {
      setError("Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6">
        <button onClick={onClose} className="absolute right-5 top-5"><X size={18} className="text-gray-400" /></button>

        {editing ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-bold text-gray-900 mb-1">Edit customer</h2>
            <label className="block text-sm"><span className="block font-medium text-gray-700 mb-1.5">Full name</span><input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm"><span className="block font-medium text-gray-700 mb-1.5">Phone</span><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" /></label>
              <label className="block text-sm"><span className="block font-medium text-gray-700 mb-1.5">Email</span><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" /></label>
            </div>
            <label className="block text-sm"><span className="block font-medium text-gray-700 mb-1.5">Notes</span><textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" /></label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium">Cancel</button>
              <button disabled={saving} onClick={saveEdit} className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4 mb-5">
              <div className="h-12 w-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-base font-bold text-green-600 shrink-0">
                {customer.full_name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900">{customer.full_name}</h2>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  {customer.phone && <span className="flex items-center gap-1"><Phone size={11} />{customer.phone}</span>}
                  {customer.email && <span className="flex items-center gap-1"><Mail size={11} />{customer.email}</span>}
                  {customer.notes && <span className="flex items-center gap-1"><FileText size={11} />{customer.notes}</span>}
                </div>
              </div>
              <button onClick={() => setEditing(true)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium shrink-0">Edit</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-0.5">Total purchased</p>
                <p className="font-bold text-gray-900 text-sm">{money(customer.total_purchased)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-0.5">Total paid</p>
                <p className="font-bold text-green-600 text-sm">{money(customer.total_paid)}</p>
              </div>
              <div className={`rounded-lg p-3 ${customer.total_balance > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
                <p className="text-xs text-gray-500 mb-0.5">Outstanding</p>
                <p className={`font-bold text-sm ${customer.total_balance > 0 ? "text-amber-600" : "text-gray-900"}`}>{money(customer.total_balance)}</p>
              </div>
            </div>

            {customer.total_balance > 0 && (
              <button onClick={() => setShowPayment(true)} className="mb-5 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium">
                Record payment
              </button>
            )}

            <div className="flex gap-1 mb-4 bg-gray-50 rounded-lg p-1 w-fit">
              {(["sales", "payments"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? "bg-white text-green-600 shadow-sm" : "text-gray-500"}`}>{t}</button>
              ))}
            </div>

            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : tab === "sales" ? (
              sales.length === 0 ? <p className="text-sm text-gray-400">No sales yet.</p> : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {sales.map((s) => (
                    <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.receipt_number}</p>
                        <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{money(s.total)}</p>
                        {s.balance > 0 && <p className="text-xs text-amber-600">owes {money(s.balance)}</p>}
                        <Badge tone={s.payment_status === "paid" ? "positive" : s.payment_status === "credit" ? "danger" : "warning"}>{s.payment_status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              payments.length === 0 ? <p className="text-sm text-gray-400">No payments recorded yet.</p> : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                  {payments.map((p) => (
                    <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{money(p.amount)}</p>
                        <p className="text-xs text-gray-400">{p.payment_method} {p.reference ? `· ${p.reference}` : ""}</p>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {showPayment && (
        <PaymentModal
          businessId={businessId}
          customer={customer}
          sales={sales}
          onClose={() => setShowPayment(false)}
          onRecorded={() => { reloadSales(); onUpdated(); }}
        />
      )}
    </div>
  );
}

export default function CustomersPage({ businessId }: Props) {
  const money = useMoney();
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "owing">("all");
  const [selected, setSelected] = useState<CustomerProfile | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setCustomers(await listCustomers(businessId));
    } catch {
      setError("Could not load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [businessId]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matches = [c.full_name, c.phone, c.email].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase());
      const owing = filter === "owing" ? c.total_balance > 0 : true;
      return matches && owing;
    });
  }, [customers, query, filter]);

  const totalDebt = customers.reduce((s, c) => s + c.total_balance, 0);
  const owingCount = customers.filter((c) => c.total_balance > 0).length;

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500">
            {customers.length} customers · {owingCount} owing {money(totalDebt)}
          </p>
        </div>
        <button onClick={load} aria-label="Refresh" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-gray-700">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-72">
          <Search size={15} className="text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone or email..." className="flex-1 text-sm outline-none" />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {(["all", "owing"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? "bg-green-50 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
              {f === "all" ? "All customers" : "Owing only"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-sm text-gray-400">Loading customers...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-sm font-semibold text-gray-900">{customers.length ? "No customers match." : "No customers yet."}</p>
          <p className="text-sm text-gray-500 mt-1">{customers.length ? "Try a different search." : "Customers are created when you make a sale."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Sales</th>
                  <th className="px-5 py-3 font-medium">Total purchased</th>
                  <th className="px-5 py-3 font-medium">Outstanding</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setSelected(c)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-xs font-bold text-green-600 shrink-0">
                          {c.full_name[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{c.phone ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-700">{c.sale_count}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{money(c.total_purchased)}</td>
                    <td className="px-5 py-3">
                      {c.total_balance > 0 ? (
                        <span className="font-semibold text-amber-600">{money(c.total_balance)}</span>
                      ) : (
                        <Badge tone="positive">Cleared</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3"><ChevronRight size={16} className="text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <CustomerDetail
          customer={selected}
          businessId={businessId}
          onClose={() => setSelected(null)}
          onUpdated={() => { load(); }}
        />
      )}
    </div>
  );
}
