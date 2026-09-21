import { supabase } from "./supabase";
import { demoSales, demoProducts, demoCustomers, demoExpenses } from "./demo";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}
const isDemo = () => !supabase;

export type DateRange = { from: string; to: string };
export type SalesReportRow = { date: string; transactions: number; revenue: number; discount: number; cost: number; gross_profit: number };
export type SalesReport = { totalRevenue: number; totalTransactions: number; totalDiscount: number; totalCost: number; totalProfit: number; avgSale: number; byDay: SalesReportRow[] };
export type ProductReportRow = { product_name: string; units_sold: number; revenue: number; cost: number; profit: number };
export type InventoryReport = { totalProducts: number; totalValue: number; lowStockCount: number; outOfStockCount: number; items: { id: string; name: string; category: string; stock: number; minimum_stock: number; buying_price: number; selling_price: number; value: number; status: "healthy" | "low" | "out" }[] };
export type DebtReport = { totalDebt: number; debtorCount: number; debtors: { customer_id: string; full_name: string; phone: string | null; total_owed: number; sale_count: number; oldest_sale: string }[] };
export type StaffReportRow = { staff_id: string; full_name: string; transactions: number; revenue: number; gross_profit: number };

// ─── DEMO helpers ─────────────────────────────────────────────────────────────

function demoBySalesRange(from: string, to: string) {
  return demoSales.list().filter((s) => s.sale_status === "completed" && s.created_at >= from && s.created_at <= to);
}

// ─── SALES REPORT ─────────────────────────────────────────────────────────────

export async function getSalesReport(businessId: string, range: DateRange): Promise<SalesReport> {
  if (isDemo()) {
    const rows = demoBySalesRange(range.from, range.to);
    const byDayMap: Record<string, SalesReportRow> = {};
    rows.forEach((s) => {
      const day = s.created_at.slice(0, 10);
      if (!byDayMap[day]) byDayMap[day] = { date: day, transactions: 0, revenue: 0, discount: 0, cost: 0, gross_profit: 0 };
      byDayMap[day].transactions++;
      byDayMap[day].revenue += s.total;
      byDayMap[day].discount += s.discount;
      byDayMap[day].cost += s.cost_of_goods;
      byDayMap[day].gross_profit += s.gross_profit;
    });
    const byDay = Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date));
    const totalRevenue = rows.reduce((s, r) => s + r.total, 0);
    const totalDiscount = rows.reduce((s, r) => s + r.discount, 0);
    const totalCost = rows.reduce((s, r) => s + r.cost_of_goods, 0);
    const totalProfit = rows.reduce((s, r) => s + r.gross_profit, 0);
    return { totalRevenue, totalTransactions: rows.length, totalDiscount, totalCost, totalProfit, avgSale: rows.length > 0 ? totalRevenue / rows.length : 0, byDay };
  }
  const { data, error } = await client().from("sales").select("total, subtotal, discount, cost_of_goods, gross_profit, created_at").eq("business_id", businessId).eq("sale_status", "completed").gte("created_at", range.from).lte("created_at", range.to).order("created_at");
  if (error) throw error;
  const rows = data ?? [];
  const byDayMap: Record<string, SalesReportRow> = {};
  rows.forEach((s: any) => { const day = s.created_at.slice(0, 10); if (!byDayMap[day]) byDayMap[day] = { date: day, transactions: 0, revenue: 0, discount: 0, cost: 0, gross_profit: 0 }; byDayMap[day].transactions++; byDayMap[day].revenue += Number(s.total); byDayMap[day].discount += Number(s.discount); byDayMap[day].cost += Number(s.cost_of_goods); byDayMap[day].gross_profit += Number(s.gross_profit); });
  const byDay = Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date));
  const totalRevenue = rows.reduce((s: number, r: any) => s + Number(r.total), 0);
  return { totalRevenue, totalTransactions: rows.length, totalDiscount: rows.reduce((s: number, r: any) => s + Number(r.discount), 0), totalCost: rows.reduce((s: number, r: any) => s + Number(r.cost_of_goods), 0), totalProfit: rows.reduce((s: number, r: any) => s + Number(r.gross_profit), 0), avgSale: rows.length > 0 ? totalRevenue / rows.length : 0, byDay };
}

// ─── PRODUCT SALES REPORT ─────────────────────────────────────────────────────

export async function getProductSalesReport(businessId: string, range: DateRange): Promise<ProductReportRow[]> {
  if (isDemo()) {
    return [
      { product_name: "Samsung Galaxy A15", units_sold: 2, revenue: 1700000, cost: 1400000, profit: 300000 },
      { product_name: "Tecno Spark 30", units_sold: 2, revenue: 1040000, cost: 820000, profit: 220000 },
      { product_name: "Itel P55", units_sold: 1, revenue: 300000, cost: 245000, profit: 55000 },
      { product_name: "Oraimo Fast Charger", units_sold: 1, revenue: 35000, cost: 21000, profit: 14000 },
      { product_name: "Tempered Glass Protector", units_sold: 7, revenue: 56000, cost: 21000, profit: 35000 },
    ];
  }
  const { data, error } = await client().from("sale_items").select("product_name_snapshot, quantity, subtotal, profit, unit_cost, sales!inner(business_id, sale_status, created_at)").eq("sales.business_id", businessId).eq("sales.sale_status", "completed").gte("sales.created_at", range.from).lte("sales.created_at", range.to);
  if (error) throw error;
  const map: Record<string, ProductReportRow> = {};
  (data ?? []).forEach((item: any) => { const name = item.product_name_snapshot; if (!map[name]) map[name] = { product_name: name, units_sold: 0, revenue: 0, cost: 0, profit: 0 }; map[name].units_sold += item.quantity; map[name].revenue += Number(item.subtotal); map[name].cost += Number(item.unit_cost) * item.quantity; map[name].profit += Number(item.profit); });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

// ─── INVENTORY REPORT ─────────────────────────────────────────────────────────

export async function getInventoryReport(businessId: string): Promise<InventoryReport> {
  if (isDemo()) {
    const { availableStock } = await import("./inventory");
    const items = demoProducts.list().filter((p) => p.is_active).map((p) => {
      const stock = availableStock(p);
      const status: "healthy" | "low" | "out" = stock === 0 ? "out" : stock <= p.minimum_stock ? "low" : "healthy";
      return { id: p.id, name: p.name, category: p.category, stock, minimum_stock: p.minimum_stock, buying_price: p.buying_price, selling_price: p.selling_price, value: stock * p.buying_price, status };
    });
    return { totalProducts: items.length, totalValue: items.reduce((s, i) => s + i.value, 0), lowStockCount: items.filter((i) => i.status === "low").length, outOfStockCount: items.filter((i) => i.status === "out").length, items };
  }
  const { data, error } = await client().from("products").select("id, name, category, quantity, minimum_stock, buying_price, selling_price, inventory_type, is_active, product_devices(status)").eq("business_id", businessId).eq("is_active", true);
  if (error) throw error;
  const items = (data ?? []).map((p: any) => {
    const stock = p.inventory_type === "individual" ? (p.product_devices ?? []).filter((d: any) => d.status === "in_stock").length : p.quantity;
    const status: "healthy" | "low" | "out" = stock === 0 ? "out" : stock <= p.minimum_stock ? "low" : "healthy";
    return { id: p.id, name: p.name, category: p.category, stock, minimum_stock: p.minimum_stock, buying_price: Number(p.buying_price), selling_price: Number(p.selling_price), value: stock * Number(p.buying_price), status };
  });
  return { totalProducts: items.length, totalValue: items.reduce((s: number, i: any) => s + i.value, 0), lowStockCount: items.filter((i: any) => i.status === "low").length, outOfStockCount: items.filter((i: any) => i.status === "out").length, items };
}

// ─── DEBT REPORT ──────────────────────────────────────────────────────────────

export async function getDebtReport(businessId: string): Promise<DebtReport> {
  if (isDemo()) {
    const debtors = demoCustomers.list().filter((c) => c.total_balance > 0).map((c) => ({
      customer_id: c.id, full_name: c.full_name, phone: c.phone,
      total_owed: c.total_balance, sale_count: c.sale_count, oldest_sale: c.created_at,
    })).sort((a, b) => b.total_owed - a.total_owed);
    return { totalDebt: debtors.reduce((s, d) => s + d.total_owed, 0), debtorCount: debtors.length, debtors };
  }
  const { data, error } = await client().from("sales").select("customer_id, balance, created_at, customers(id, full_name, phone)").eq("business_id", businessId).eq("sale_status", "completed").in("payment_status", ["partial", "credit"]).order("created_at");
  if (error) throw error;
  const map: Record<string, any> = {};
  (data ?? []).forEach((s: any) => { const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers; if (!customer) return; if (!map[customer.id]) map[customer.id] = { customer_id: customer.id, full_name: customer.full_name, phone: customer.phone, total_owed: 0, sale_count: 0, oldest_sale: s.created_at }; map[customer.id].total_owed += Number(s.balance); map[customer.id].sale_count++; });
  const debtors = Object.values(map).sort((a, b) => b.total_owed - a.total_owed);
  return { totalDebt: debtors.reduce((s, d) => s + d.total_owed, 0), debtorCount: debtors.length, debtors };
}

// ─── STAFF SALES REPORT ───────────────────────────────────────────────────────

export async function getStaffSalesReport(businessId: string, range: DateRange): Promise<StaffReportRow[]> {
  if (isDemo()) {
    return [
      { staff_id: "demo-001", full_name: "Demo Owner", transactions: demoSales.list().length, revenue: demoSales.list().reduce((s, x) => s + x.total, 0), gross_profit: demoSales.list().reduce((s, x) => s + x.gross_profit, 0) },
    ];
  }
  const { data, error } = await client().from("sales").select("sold_by, total, gross_profit, profiles(full_name)").eq("business_id", businessId).eq("sale_status", "completed").gte("created_at", range.from).lte("created_at", range.to);
  if (error) throw error;
  const map: Record<string, StaffReportRow> = {};
  (data ?? []).forEach((s: any) => { const id = s.sold_by; const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles; const name = profile?.full_name ?? id?.slice(0, 8) ?? "Unknown"; if (!map[id]) map[id] = { staff_id: id, full_name: name, transactions: 0, revenue: 0, gross_profit: 0 }; map[id].transactions++; map[id].revenue += Number(s.total); map[id].gross_profit += Number(s.gross_profit); });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

// ─── EXPENSES TOTAL ───────────────────────────────────────────────────────────

export async function getExpensesTotal(businessId: string, range: DateRange): Promise<number> {
  if (isDemo()) {
    return demoExpenses.list().filter((e) => e.expense_date >= range.from && e.expense_date <= range.to).reduce((s, e) => s + e.amount, 0);
  }
  const { data, error } = await client().from("expenses").select("amount").eq("business_id", businessId).gte("expense_date", range.from).lte("expense_date", range.to);
  if (error) throw error;
  return (data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
}

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────

export function downloadCSV(filename: string, rows: Record<string, any>[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
