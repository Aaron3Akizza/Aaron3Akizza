import { useEffect, useState, useMemo } from "react";
import { Plus, X, Trash2, AlertTriangle, RefreshCw, Search } from "lucide-react";
import { listExpenses, createExpense, deleteExpense, EXPENSE_CATEGORIES, type Expense } from "../lib/expenses";
import { useMoney, localToday } from "../lib/format";

type Props = { businessId: string; role: string | null };
const canManage = (role: string | null) => role === "owner" || role === "manager";

function today() {
  return localToday();
}

function AddExpenseModal({
  businessId,
  onClose,
  onAdded,
}: {
  businessId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount greater than zero."); return; }
    if (!date) { setError("Select a date."); return; }
    setSaving(true);
    try {
      await createExpense(businessId, { category, amount: amt, description, expense_date: date });
      onAdded();
      onClose();
    } catch {
      setError("Could not record the expense. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">Add expense</h2>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="flex flex-col gap-4">
          <label className="block text-sm">
            <span className="block font-medium text-gray-700 mb-1.5">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block font-medium text-gray-700 mb-1.5">Amount (UGX)</span>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="0" />
          </label>
          <label className="block text-sm">
            <span className="block font-medium text-gray-700 mb-1.5">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </label>
          <label className="block text-sm">
            <span className="block font-medium text-gray-700 mb-1.5">Description (optional)</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Monthly rent" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 mt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium">Cancel</button>
            <button disabled={saving} onClick={submit} className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">
              {saving ? "Saving..." : "Add expense"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage({ businessId, role }: Props) {
  const money = useMoney();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(today());
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setExpenses(await listExpenses(businessId, fromDate, toDate));
    } catch {
      setError("Could not load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [businessId, fromDate, toDate]);

  const categories = ["All", ...Array.from(new Set(expenses.map((e) => e.category)))];

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const text = [e.category, e.description].filter(Boolean).join(" ").toLowerCase();
      return text.includes(query.toLowerCase()) && (categoryFilter === "All" || e.category === categoryFilter);
    });
  }, [expenses, query, categoryFilter]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteExpense(id);
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch {
      setError("Could not delete the expense.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Expenses</h2>
          <p className="text-sm text-gray-500">Track all outgoing costs for your business</p>
        </div>
        {canManage(role) && (
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium">
            <Plus size={15} /> Add expense
          </button>
        )}
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
        </label>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-52">
          <Search size={14} className="text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="flex-1 text-sm outline-none" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button onClick={load} aria-label="Refresh" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-gray-700">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Total expenses</p>
          <p className="text-xl font-bold text-gray-900">{money(total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Transactions</p>
          <p className="text-xl font-bold text-gray-900">{filtered.length}</p>
        </div>
        {byCategory.slice(0, 2).map(([cat, amt]) => (
          <div key={cat} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">{cat}</p>
            <p className="text-xl font-bold text-gray-900">{money(amt)}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">By category</p>
          <div className="flex flex-col gap-2.5">
            {byCategory.map(([cat, amt]) => {
              const pct = total > 0 ? (amt / total) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{cat}</span>
                    <span className="font-medium text-gray-900">{money(amt)} <span className="text-gray-400 text-xs">({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expenses table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-sm text-gray-400">Loading expenses...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-sm font-semibold text-gray-900">No expenses found.</p>
          <p className="text-sm text-gray-500 mt-1">Add your first expense or adjust the date range.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  {canManage(role) && <th className="px-5 py-3 font-medium" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-gray-500">{e.expense_date}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{e.category}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{e.description ?? "—"}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{money(e.amount)}</td>
                    {canManage(role) && (
                      <td className="px-5 py-3 text-right">
                        <button
                          disabled={deleting === e.id}
                          onClick={() => handleDelete(e.id)}
                          aria-label="Delete expense"
                          className="text-red-400 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 bg-gray-50">
                  <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900">{money(total)}</td>
                  {canManage(role) && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showAdd && <AddExpenseModal businessId={businessId} onClose={() => setShowAdd(false)} onAdded={load} />}
    </div>
  );
}
