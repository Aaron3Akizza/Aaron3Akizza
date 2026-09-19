import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, TrendingUp, Wallet, RefreshCw } from "lucide-react";
import {
  getDashboardStats,
  getSalesChart,
  getTopProducts,
  getLowStock,
  getCustomersOwing,
  getRecentSales,
  type DashboardStats,
  type SalesChartPoint,
  type TopProduct,
  type LowStockItem,
  type CustomerOwing,
  type RecentSale,
} from "../lib/dashboard";
import { useMoney, formatDateTime } from "../lib/format";
const PERIODS = ["Today", "7 days", "30 days", "This month"] as const;
type Period = (typeof PERIODS)[number];

function StatCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "warning" | "neutral";
  icon: React.ElementType;
}) {
  const subColor = tone === "positive" ? "text-green-600" : tone === "warning" ? "text-amber-600" : "text-gray-400";
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <Icon size={15} className="text-gray-300" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className={`text-xs font-medium mt-1.5 ${subColor}`}>{sub}</p>}
    </div>
  );
}

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

function SalesChart({ businessId }: { businessId: string }) {
  const money = useMoney();
  const [period, setPeriod] = useState<Period>("7 days");
  const [data, setData] = useState<SalesChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSalesChart(businessId, period)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [businessId, period]);

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-sm font-semibold text-gray-900">Sales overview</p>
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">Loading...</div>
      ) : data.length === 0 || data.every((d) => d.value === 0) ? (
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">No sales in this period.</div>
      ) : (
        <div className="flex items-end justify-between gap-1.5 h-40">
          {data.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-md bg-green-600"
                style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 2)}%` }}
                title={money(d.value)}
              />
              <span className="text-[10px] text-gray-400 font-medium truncate max-w-full">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage({ businessId }: { businessId: string }) {
  const money = useMoney();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [owing, setOwing] = useState<CustomerOwing[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, tp, ls, ow, rs] = await Promise.all([
        getDashboardStats(businessId),
        getTopProducts(businessId),
        getLowStock(businessId),
        getCustomersOwing(businessId),
        getRecentSales(businessId),
      ]);
      setStats(s);
      setTopProducts(tp);
      setLowStock(ls);
      setOwing(ow);
      setRecentSales(rs);
    } catch {
      setError("Could not load dashboard data. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-5 lg:p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-3 w-20 bg-gray-100 rounded mb-4" />
              <div className="h-7 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-400 text-center">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle size={15} />
          {error}
          <button onClick={load} className="ml-auto flex items-center gap-1 text-red-600 hover:text-red-800">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's sales"
          value={money(stats?.todaySales ?? 0)}
          sub={`${stats?.todayTransactions ?? 0} transaction${stats?.todayTransactions !== 1 ? "s" : ""}`}
          tone="positive"
          icon={TrendingUp}
        />
        <StatCard
          label="Today's profit"
          value={money(stats?.todayProfit ?? 0)}
          sub={
            stats && stats.todaySales > 0
              ? `${((stats.todayProfit / stats.todaySales) * 100).toFixed(1)}% margin`
              : undefined
          }
          tone="positive"
          icon={TrendingUp}
        />
        <StatCard
          label="Low stock items"
          value={String(lowStock.length)}
          sub={lowStock.length > 0 ? "Need attention" : "All good"}
          tone={lowStock.length > 0 ? "warning" : "neutral"}
          icon={AlertTriangle}
        />
        <StatCard
          label="Outstanding debt"
          value={money(stats?.outstandingDebt ?? 0)}
          sub={stats?.debtCount ? `${stats.debtCount} customer${stats.debtCount !== 1 ? "s" : ""} owing` : undefined}
          tone={stats?.outstandingDebt ? "warning" : "neutral"}
          icon={Wallet}
        />
      </div>

      {/* Chart + top products */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SalesChart businessId={businessId} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Top selling (this month)</p>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No sales this month yet.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-semibold text-gray-300 w-4">{i + 1}</span>
                    <span className="text-sm text-gray-700 truncate">{p.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{p.sold} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock + customers owing */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900">Low stock</p>
            {lowStock.length > 0 && <Badge tone="warning">{lowStock.length} item{lowStock.length !== 1 ? "s" : ""}</Badge>}
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-400">All products are sufficiently stocked.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {lowStock.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">Min: {p.minimum_stock}</p>
                  </div>
                  <span className={`text-sm font-semibold ${p.quantity === 0 ? "text-red-600" : "text-amber-600"}`}>
                    {p.quantity} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-900">Customers owing</p>
            {owing.length > 0 && <Badge tone="warning">{owing.length}</Badge>}
          </div>
          {owing.length === 0 ? (
            <p className="text-sm text-gray-400">No outstanding customer debt.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {owing.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm text-gray-800">{c.full_name}</p>
                    <p className="text-xs text-gray-400">
                      Last sale: {new Date(c.last_sale).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-600">{money(c.owed)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent sales table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-semibold text-gray-900">Recent sales</p>
          <button onClick={load} aria-label="Refresh" className="text-gray-400 hover:text-gray-600">
            <RefreshCw size={14} />
          </button>
        </div>
        {recentSales.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400">No completed sales yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-5 py-2.5 font-medium">Receipt</th>
                  <th className="px-5 py-2.5 font-medium">Customer</th>
                  <th className="px-5 py-2.5 font-medium">Amount</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-gray-700">{s.receipt_number}</td>
                    <td className="px-5 py-3 text-gray-800">{s.customer_name ?? "Walk-in"}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{money(s.amount)}</td>
                    <td className="px-5 py-3">
                      <Badge
                        tone={
                          s.payment_status === "paid"
                            ? "positive"
                            : s.payment_status === "credit"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {s.payment_status === "paid" ? "Paid" : s.payment_status === "credit" ? "Credit" : "Partial"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{formatDateTime(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
