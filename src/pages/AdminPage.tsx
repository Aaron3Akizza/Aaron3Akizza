import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Building2, CheckCircle, ChevronRight, Globe,
  LogOut, RefreshCw, Search, ShieldCheck, TrendingUp, Users,
  XCircle, X, Clock, BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAllBusinesses, getPlatformStats, updateSubscription,
  type BusinessRow, type PlatformStats, type SubscriptionStatus,
} from "../lib/admin";
import { supabase } from "../lib/supabase";
import { formatMoney } from "../lib/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  active:    "bg-green-50 text-green-700 border-green-200",
  trial:     "bg-amber-50 text-amber-700 border-amber-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active:    "Active",
  trial:     "Trial",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, tone = "neutral" }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; tone?: "positive" | "warning" | "danger" | "neutral";
}) {
  const toneColor = {
    positive: "text-green-600",
    warning:  "text-amber-600",
    danger:   "text-red-600",
    neutral:  "text-gray-400",
  }[tone];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <Icon size={15} className={toneColor} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className={`text-xs font-medium mt-1.5 ${toneColor}`}>{sub}</p>}
    </div>
  );
}

// ─── Subscription modal ───────────────────────────────────────────────────────

function ManageModal({
  business, onClose, onSaved,
}: {
  business: BusinessRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status,    setStatus]    = useState<SubscriptionStatus>(business.subscription_status);
  const [expiresAt, setExpiresAt] = useState(business.subscription_expires_at?.slice(0, 10) ?? "");
  const [maxStaff,  setMaxStaff]  = useState(String(business.max_staff_accounts));
  const [note,      setNote]      = useState(business.notes ?? "");
  const [reason,    setReason]    = useState(business.suspended_reason ?? "");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const save = async () => {
    setError("");
    if (status === "suspended" && !reason.trim()) {
      setError("Please enter a reason for suspending this business.");
      return;
    }
    setSaving(true);
    try {
      await updateSubscription(business.id, status, {
        expiresAt:     expiresAt || null,
        maxStaff:      Number(maxStaff) || null,
        note:          note.trim() || null,
        suspendReason: status === "suspended" ? reason.trim() : null,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">{business.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{business.owner_email}</p>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Status */}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Subscription status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="trial">Trial</option>
              <option value="active">Active (paid)</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          {/* Expiry */}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Subscription expires</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank for no expiry (trial/cancelled).</p>
          </label>

          {/* Max staff */}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Max staff accounts</span>
            <input
              type="number"
              min="1"
              value={maxStaff}
              onChange={(e) => setMaxStaff(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </label>

          {/* Suspension reason */}
          {status === "suspended" && (
            <label className="block">
              <span className="block text-sm font-medium text-red-600 mb-1.5">Reason for suspension *</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Payment overdue — suspended pending renewal"
                className="w-full rounded-lg border border-red-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </label>
          )}

          {/* Admin note */}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Admin note (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Internal note about this business..."
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-600 flex gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={save}
              className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const navigate   = useNavigate();
  const [stats,        setStats]        = useState<PlatformStats | null>(null);
  const [businesses,   setBusinesses]   = useState<BusinessRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [query,        setQuery]        = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [managing,     setManaging]     = useState<BusinessRow | null>(null);
  const [offset,       setOffset]       = useState(0);
  const PAGE = 50;

  const load = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError("");
    try {
      const [s, b] = await Promise.all([
        getPlatformStats(),
        getAllBusinesses({
          limit:  PAGE,
          offset: newOffset,
          status: (statusFilter !== "all" ? statusFilter as SubscriptionStatus : null),
        }),
      ]);
      setStats(s);
      setBusinesses(b);
      setOffset(newOffset);
    } catch (err: any) {
      setError(err?.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(0); }, [load]);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const filtered = businesses.filter((b) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.owner_email.toLowerCase().includes(q) ||
      (b.owner_name ?? "").toLowerCase().includes(q) ||
      (b.location ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">

      {/* Top nav */}
      <div className="bg-gray-900 text-white h-14 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-green-600 flex items-center justify-center">
            <TrendingUp size={14} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="font-bold tracking-tight">BizFlow</span>
          <span className="ml-2 px-2 py-0.5 rounded bg-green-600/20 border border-green-600/40 text-green-400 text-[10px] font-bold uppercase tracking-wide">
            Platform Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => load(0)} disabled={loading} className="text-gray-400 hover:text-white disabled:opacity-40">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-7 flex flex-col gap-7">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all BizFlow client businesses, subscriptions and system health.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total businesses"
              value={stats.total_businesses}
              icon={Building2}
            />
            <StatCard
              label="Active (paid)"
              value={stats.active_businesses}
              sub={`${stats.trial_businesses} on trial`}
              icon={CheckCircle}
              tone="positive"
            />
            <StatCard
              label="Suspended"
              value={stats.suspended_businesses}
              icon={XCircle}
              tone={stats.suspended_businesses > 0 ? "danger" : "neutral"}
            />
            <StatCard
              label="Total users"
              value={stats.total_users}
              sub={`${stats.new_businesses_this_month} new this month`}
              icon={Users}
            />
            <StatCard
              label="All-time revenue"
              value={formatMoney(stats.total_revenue, "UGX")}
              sub={`${stats.total_sales.toLocaleString()} sales`}
              icon={BarChart3}
              tone="positive"
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-72">
            <Search size={14} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, location…"
              className="flex-1 text-sm outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {(["all", "trial", "active", "suspended", "cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-green-50 text-green-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s === "all" ? "All" : STATUS_LABELS[s as SubscriptionStatus]}
              </button>
            ))}
          </div>
        </div>

        {/* Businesses table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading && businesses.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                    <th className="px-5 py-3 font-medium">Business</th>
                    <th className="px-5 py-3 font-medium">Owner</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Staff</th>
                    <th className="px-5 py-3 font-medium">Sales</th>
                    <th className="px-5 py-3 font-medium">Expires</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr
                      key={b.id}
                      className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${
                        b.subscription_status === "suspended" ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-xs font-bold text-green-600 shrink-0">
                            {b.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{b.name}</p>
                            <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                              {b.location && <><Globe size={10} />{b.location}</>}
                              {!b.location && <span className="text-gray-300">No location</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-gray-800 text-sm">{b.owner_name || "—"}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[150px]">{b.owner_email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={b.subscription_status} />
                        {b.suspended_reason && (
                          <p className="text-[10px] text-red-500 mt-1 max-w-[120px] truncate" title={b.suspended_reason}>
                            {b.suspended_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {b.staff_count} / {b.max_staff_accounts}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{b.sale_count.toLocaleString()}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {b.subscription_expires_at
                          ? new Date(b.subscription_expires_at).toLocaleDateString()
                          : <span className="flex items-center gap-1 text-amber-500"><Clock size={11} /> No expiry set</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setManaging(b)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Manage <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="p-10 text-center text-sm text-gray-400">No businesses match.</p>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {(offset > 0 || businesses.length === PAGE) && (
          <div className="flex justify-between items-center">
            <button
              disabled={offset === 0}
              onClick={() => load(Math.max(0, offset - PAGE))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-xs text-gray-400">Page {Math.floor(offset / PAGE) + 1}</span>
            <button
              disabled={businesses.length < PAGE}
              onClick={() => load(offset + PAGE)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}

        {/* Footer note */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={15} className="text-green-600 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-700">Admin access is secured at the database level.</strong>{" "}
              You can only see this dashboard because your account is in the{" "}
              <code className="bg-gray-100 px-1 rounded">platform_admins</code> table in Supabase.
              Client businesses cannot access this page or see each other's data — Row Level Security
              is enforced on every table.
            </div>
          </div>
        </div>

      </div>

      {managing && (
        <ManageModal
          business={managing}
          onClose={() => setManaging(null)}
          onSaved={() => load(offset)}
        />
      )}
    </div>
  );
}
