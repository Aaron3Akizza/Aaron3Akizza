import { useState } from "react";
import { TrendingUp, Package, Users, Wallet, UserCog, RefreshCw, AlertTriangle, Download } from "lucide-react";
import {
  getSalesReport,
  getProductSalesReport,
  getInventoryReport,
  getDebtReport,
  getExpensesTotal,
  getStaffSalesReport,
  downloadCSV,
  type SalesReport,
  type ProductReportRow,
  type InventoryReport,
  type DebtReport,
  type StaffReportRow,
} from "../lib/reports";
import { useMoney, localToday, localMonthStart } from "../lib/format";

type Props = { businessId: string; role: string | null };
type Tab = "sales" | "products" | "inventory" | "debt" | "staff";

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "positive" | "warning" | "danger" | "neutral" }) {
  const subColor = tone === "positive" ? "text-green-600" : tone === "warning" ? "text-amber-600" : tone === "danger" ? "text-red-600" : "text-gray-400";
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className={`text-xs font-medium mt-1 ${subColor}`}>{sub}</p>}
    </div>
  );
}

function TabActions({ onRefresh, onExport, loading }: { onRefresh: () => void; onExport: () => void; loading: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button onClick={onExport} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
        <Download size={14} /> Export CSV
      </button>
      <button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-50 hover:bg-gray-50">
        <RefreshCw size={14} /> Refresh
      </button>
    </div>
  );
}

function SalesTab({ businessId, from, to }: { businessId: string; from: string; to: string }) {
  const money = useMoney();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [expenses, setExpenses] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [r, exp] = await Promise.all([
        getSalesReport(businessId, { from: from + "T00:00:00", to: to + "T23:59:59" }),
        getExpensesTotal(businessId, { from, to }),
      ]);
      setReport(r); setExpenses(exp); setLoaded(true);
    } catch { setError("Could not load sales report."); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!report) return;
    downloadCSV(`sales-report-${from}-${to}.csv`, report.byDay.map((d) => ({
      Date: d.date,
      Transactions: d.transactions,
      "Revenue (UGX)": d.revenue,
      "Discount (UGX)": d.discount,
      "Cost (UGX)": d.cost,
      "Gross Profit (UGX)": d.gross_profit,
    })));
  };

  if (!loaded) return (
    <div className="text-center py-12">
      <p className="text-sm text-gray-500 mb-4">Click below to generate the sales report for this date range.</p>
      <button onClick={load} disabled={loading} className="rounded-lg bg-green-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50">
        {loading ? "Generating..." : "Generate report"}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <TabActions onRefresh={load} onExport={exportCSV} loading={loading} />
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex gap-2"><AlertTriangle size={15} />{error}</div>}
      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Revenue" value={money(report.totalRevenue)} tone="positive" />
            <SummaryCard label="Gross profit" value={money(report.totalProfit)} sub={report.totalRevenue > 0 ? `${((report.totalProfit / report.totalRevenue) * 100).toFixed(1)}% margin` : undefined} tone="positive" />
            <SummaryCard label="Expenses" value={money(expenses)} tone="neutral" />
            <SummaryCard label="Net profit (est.)" value={money(report.totalProfit - expenses)} tone={report.totalProfit - expenses >= 0 ? "positive" : "danger"} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard label="Transactions" value={String(report.totalTransactions)} />
            <SummaryCard label="Avg. sale value" value={money(report.avgSale)} />
            <SummaryCard label="Total discount" value={money(report.totalDiscount)} />
          </div>
          {report.byDay.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <p className="px-5 py-4 text-sm font-semibold text-gray-900 border-b border-gray-50">Daily breakdown</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                      <th className="px-5 py-2.5 font-medium">Date</th>
                      <th className="px-5 py-2.5 font-medium">Transactions</th>
                      <th className="px-5 py-2.5 font-medium">Revenue</th>
                      <th className="px-5 py-2.5 font-medium">Discount</th>
                      <th className="px-5 py-2.5 font-medium">Gross profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byDay.map((day) => (
                      <tr key={day.date} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-3 text-gray-700">{day.date}</td>
                        <td className="px-5 py-3 text-gray-700">{day.transactions}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">{money(day.revenue)}</td>
                        <td className="px-5 py-3 text-gray-500">{money(day.discount)}</td>
                        <td className="px-5 py-3 font-medium text-green-600">{money(day.gross_profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProductsTab({ businessId, from, to }: { businessId: string; from: string; to: string }) {
  const money = useMoney();
  const [rows, setRows] = useState<ProductReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setRows(await getProductSalesReport(businessId, { from: from + "T00:00:00", to: to + "T23:59:59" })); setLoaded(true); }
    catch { setError("Could not load product report."); }
    finally { setLoading(false); }
  };

  const exportCSV = () => downloadCSV(`products-report-${from}-${to}.csv`, rows.map((r) => ({
    Product: r.product_name, "Units Sold": r.units_sold, "Revenue (UGX)": r.revenue,
    "Cost (UGX)": r.cost, "Gross Profit (UGX)": r.profit,
    "Margin %": r.revenue > 0 ? ((r.profit / r.revenue) * 100).toFixed(1) : "0",
  })));

  if (!loaded) return (
    <div className="text-center py-12">
      <p className="text-sm text-gray-500 mb-4">Click below to generate the product sales report.</p>
      <button onClick={load} disabled={loading} className="rounded-lg bg-green-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50">{loading ? "Generating..." : "Generate report"}</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <TabActions onRefresh={load} onExport={exportCSV} loading={loading} />
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex gap-2"><AlertTriangle size={15} />{error}</div>}
      {rows.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">No sales in this period.</p> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-5 py-2.5 font-medium">Product</th>
                  <th className="px-5 py-2.5 font-medium">Units sold</th>
                  <th className="px-5 py-2.5 font-medium">Revenue</th>
                  <th className="px-5 py-2.5 font-medium">Cost</th>
                  <th className="px-5 py-2.5 font-medium">Gross profit</th>
                  <th className="px-5 py-2.5 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.product_name} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.product_name}</td>
                    <td className="px-5 py-3 text-gray-700">{r.units_sold}</td>
                    <td className="px-5 py-3 text-gray-900">{money(r.revenue)}</td>
                    <td className="px-5 py-3 text-gray-500">{money(r.cost)}</td>
                    <td className="px-5 py-3 font-medium text-green-600">{money(r.profit)}</td>
                    <td className="px-5 py-3 text-gray-500">{r.revenue > 0 ? `${((r.profit / r.revenue) * 100).toFixed(1)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryTab({ businessId }: { businessId: string }) {
  const money = useMoney();
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setReport(await getInventoryReport(businessId)); setLoaded(true); }
    catch { setError("Could not load inventory report."); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!report) return;
    downloadCSV("inventory-report.csv", report.items.map((i) => ({
      Product: i.name, Category: i.category, Stock: i.stock, "Min Stock": i.minimum_stock,
      "Buying Price (UGX)": i.buying_price, "Selling Price (UGX)": i.selling_price,
      "Stock Value (UGX)": i.value, Status: i.status,
    })));
  };

  if (!loaded) return (
    <div className="text-center py-12">
      <p className="text-sm text-gray-500 mb-4">Generate a snapshot of your current inventory.</p>
      <button onClick={load} disabled={loading} className="rounded-lg bg-green-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50">{loading ? "Generating..." : "Generate report"}</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <TabActions onRefresh={load} onExport={exportCSV} loading={loading} />
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex gap-2"><AlertTriangle size={15} />{error}</div>}
      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total products" value={String(report.totalProducts)} />
            <SummaryCard label="Stock value (cost)" value={money(report.totalValue)} tone="positive" />
            <SummaryCard label="Low stock items" value={String(report.lowStockCount)} tone={report.lowStockCount > 0 ? "warning" : "neutral"} />
            <SummaryCard label="Out of stock" value={String(report.outOfStockCount)} tone={report.outOfStockCount > 0 ? "danger" : "neutral"} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                    <th className="px-5 py-2.5 font-medium">Product</th>
                    <th className="px-5 py-2.5 font-medium">Category</th>
                    <th className="px-5 py-2.5 font-medium">Stock</th>
                    <th className="px-5 py-2.5 font-medium">Min</th>
                    <th className="px-5 py-2.5 font-medium">Buying price</th>
                    <th className="px-5 py-2.5 font-medium">Selling price</th>
                    <th className="px-5 py-2.5 font-medium">Stock value</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-5 py-3 text-gray-500">{item.category}</td>
                      <td className={`px-5 py-3 font-semibold ${item.status === "out" ? "text-red-600" : item.status === "low" ? "text-amber-600" : "text-gray-900"}`}>{item.stock}</td>
                      <td className="px-5 py-3 text-gray-500">{item.minimum_stock}</td>
                      <td className="px-5 py-3 text-gray-700">{money(item.buying_price)}</td>
                      <td className="px-5 py-3 text-gray-700">{money(item.selling_price)}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{money(item.value)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.status === "healthy" ? "bg-green-50 text-green-600" : item.status === "low" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                          {item.status === "healthy" ? "In stock" : item.status === "low" ? "Low" : "Out"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DebtTab({ businessId }: { businessId: string }) {
  const money = useMoney();
  const [report, setReport] = useState<DebtReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setReport(await getDebtReport(businessId)); setLoaded(true); }
    catch { setError("Could not load debt report."); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!report) return;
    downloadCSV("debt-report.csv", report.debtors.map((d) => ({
      Customer: d.full_name, Phone: d.phone ?? "", "Sales Owing": d.sale_count,
      "Total Owed (UGX)": d.total_owed, "Oldest Unpaid": d.oldest_sale.slice(0, 10),
    })));
  };

  if (!loaded) return (
    <div className="text-center py-12">
      <p className="text-sm text-gray-500 mb-4">See all customers with outstanding balances.</p>
      <button onClick={load} disabled={loading} className="rounded-lg bg-green-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50">{loading ? "Generating..." : "Generate report"}</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <TabActions onRefresh={load} onExport={exportCSV} loading={loading} />
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex gap-2"><AlertTriangle size={15} />{error}</div>}
      {report && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard label="Total outstanding" value={money(report.totalDebt)} tone={report.totalDebt > 0 ? "warning" : "positive"} />
            <SummaryCard label="Customers owing" value={String(report.debtorCount)} />
          </div>
          {report.debtors.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No outstanding debt.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                      <th className="px-5 py-2.5 font-medium">Customer</th>
                      <th className="px-5 py-2.5 font-medium">Phone</th>
                      <th className="px-5 py-2.5 font-medium">Sales owing</th>
                      <th className="px-5 py-2.5 font-medium">Total owed</th>
                      <th className="px-5 py-2.5 font-medium">Oldest unpaid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.debtors.map((d) => (
                      <tr key={d.customer_id} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-3 font-medium text-gray-900">{d.full_name}</td>
                        <td className="px-5 py-3 text-gray-500">{d.phone ?? "—"}</td>
                        <td className="px-5 py-3 text-gray-700">{d.sale_count}</td>
                        <td className="px-5 py-3 font-semibold text-amber-600">{money(d.total_owed)}</td>
                        <td className="px-5 py-3 text-gray-400">{new Date(d.oldest_sale).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StaffTab({ businessId, from, to }: { businessId: string; from: string; to: string }) {
  const money = useMoney();
  const [rows, setRows] = useState<StaffReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setRows(await getStaffSalesReport(businessId, { from: from + "T00:00:00", to: to + "T23:59:59" })); setLoaded(true); }
    catch { setError("Could not load staff report."); }
    finally { setLoading(false); }
  };

  const exportCSV = () => downloadCSV(`staff-report-${from}-${to}.csv`, rows.map((r) => ({
    "Staff Name": r.full_name, Transactions: r.transactions,
    "Revenue (UGX)": r.revenue, "Gross Profit (UGX)": r.gross_profit,
  })));

  if (!loaded) return (
    <div className="text-center py-12">
      <p className="text-sm text-gray-500 mb-4">See sales performance broken down by staff member.</p>
      <button onClick={load} disabled={loading} className="rounded-lg bg-green-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50">{loading ? "Generating..." : "Generate report"}</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <TabActions onRefresh={load} onExport={exportCSV} loading={loading} />
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex gap-2"><AlertTriangle size={15} />{error}</div>}
      {rows.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">No sales data for this period.</p> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Staff members" value={String(rows.length)} />
            <SummaryCard label="Total transactions" value={String(rows.reduce((s, r) => s + r.transactions, 0))} />
            <SummaryCard label="Total revenue" value={money(rows.reduce((s, r) => s + r.revenue, 0))} tone="positive" />
            <SummaryCard label="Top performer" value={rows[0]?.full_name ?? "—"} tone="positive" />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                    <th className="px-5 py-2.5 font-medium">Staff member</th>
                    <th className="px-5 py-2.5 font-medium">Transactions</th>
                    <th className="px-5 py-2.5 font-medium">Revenue</th>
                    <th className="px-5 py-2.5 font-medium">Gross profit</th>
                    <th className="px-5 py-2.5 font-medium">Avg. sale</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.staff_id} className="border-b border-gray-50 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-xs font-bold text-green-600 shrink-0">
                            {r.full_name[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span className="font-medium text-gray-900">{r.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{r.transactions}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{money(r.revenue)}</td>
                      <td className="px-5 py-3 font-medium text-green-600">{money(r.gross_profit)}</td>
                      <td className="px-5 py-3 text-gray-500">{money(r.transactions > 0 ? r.revenue / r.transactions : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: React.ElementType; dateRange: boolean }[] = [
  { id: "sales", label: "Sales", icon: TrendingUp, dateRange: true },
  { id: "products", label: "Products", icon: Package, dateRange: true },
  { id: "staff", label: "Staff", icon: UserCog, dateRange: true },
  { id: "inventory", label: "Inventory", icon: Wallet, dateRange: false },
  { id: "debt", label: "Debt", icon: Users, dateRange: false },
];

export default function ReportsPage({ businessId }: Props) {
  const [tab, setTab] = useState<Tab>("sales");
  const [from, setFrom] = useState(localMonthStart);
  const [to, setTo] = useState(localToday);
  const activeTab = TABS.find((t) => t.id === tab);

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500">Analyse sales, products, inventory, debt and staff performance</p>
      </div>

      {activeTab?.dateRange && (
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "sales" && <SalesTab businessId={businessId} from={from} to={to} />}
      {tab === "products" && <ProductsTab businessId={businessId} from={from} to={to} />}
      {tab === "staff" && <StaffTab businessId={businessId} from={from} to={to} />}
      {tab === "inventory" && <InventoryTab businessId={businessId} />}
      {tab === "debt" && <DebtTab businessId={businessId} />}
    </div>
  );
}
