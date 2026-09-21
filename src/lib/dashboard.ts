import { supabase } from "./supabase";
import { demoSales, demoProducts, demoCustomers } from "./demo";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

const isDemo = () => !supabase;

export type DashboardStats = { todaySales: number; todayProfit: number; todayTransactions: number; outstandingDebt: number; debtCount: number };
export type SalesChartPoint = { label: string; value: number };
export type TopProduct = { name: string; sold: number; revenue: number };
export type LowStockItem = { id: string; name: string; quantity: number; minimum_stock: number; category: string };
export type CustomerOwing = { id: string; full_name: string; owed: number; last_sale: string };
export type RecentSale = { id: string; receipt_number: string; customer_name: string | null; amount: number; payment_status: string; created_at: string };

export async function getDashboardStats(businessId: string): Promise<DashboardStats> {
  if (isDemo()) {
    const today = new Date().toISOString().slice(0, 10);
    const todaySales_list = demoSales.list().filter((s) => s.sale_status === "completed" && s.created_at.slice(0, 10) === today);
    const debt = demoSales.list().filter((s) => s.sale_status === "completed" && s.balance > 0);
    return {
      todaySales: todaySales_list.reduce((s, x) => s + x.total, 0),
      todayProfit: todaySales_list.reduce((s, x) => s + x.gross_profit, 0),
      todayTransactions: todaySales_list.length,
      outstandingDebt: debt.reduce((s, x) => s + x.balance, 0),
      debtCount: new Set(debt.map((s) => s.customer_id).filter(Boolean)).size,
    };
  }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const [salesRes, debtRes] = await Promise.all([
    client().from("sales").select("total, gross_profit").eq("business_id", businessId).eq("sale_status", "completed").gte("created_at", todayStart.toISOString()),
    client().from("sales").select("balance").eq("business_id", businessId).eq("sale_status", "completed").in("payment_status", ["partial", "credit"]),
  ]);
  if (salesRes.error) throw salesRes.error;
  if (debtRes.error) throw debtRes.error;
  return {
    todaySales: (salesRes.data ?? []).reduce((s: number, x: any) => s + Number(x.total), 0),
    todayProfit: (salesRes.data ?? []).reduce((s: number, x: any) => s + Number(x.gross_profit), 0),
    todayTransactions: (salesRes.data ?? []).length,
    outstandingDebt: (debtRes.data ?? []).reduce((s: number, x: any) => s + Number(x.balance), 0),
    debtCount: (debtRes.data ?? []).length,
  };
}

export async function getSalesChart(businessId: string, period: "Today" | "7 days" | "30 days" | "This month"): Promise<SalesChartPoint[]> {
  if (isDemo()) {
    const sales = demoSales.list().filter((s) => s.sale_status === "completed");
    const now = new Date();
    if (period === "7 days") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        buckets[days[d.getDay()] + d.getDate()] = 0;
      }
      sales.forEach((s) => {
        const d = new Date(s.created_at);
        const key = days[d.getDay()] + d.getDate();
        if (key in buckets) buckets[key] = (buckets[key] || 0) + s.total;
      });
      return Object.entries(buckets).map(([key, value]) => ({ label: key.slice(0, 3), value }));
    }
    const buckets = { W1: 0, W2: 0, W3: 0, W4: 0 };
    sales.forEach((s) => {
      const day = new Date(s.created_at).getDate();
      const w = day <= 7 ? "W1" : day <= 14 ? "W2" : day <= 21 ? "W3" : "W4";
      (buckets as any)[w] += s.total;
    });
    return Object.entries(buckets).map(([label, value]) => ({ label, value }));
  }
  const now = new Date();
  let from: Date;
  if (period === "Today") { from = new Date(now); from.setHours(0, 0, 0, 0); }
  else if (period === "7 days") { from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0); }
  else if (period === "30 days") { from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0); }
  else { from = new Date(now.getFullYear(), now.getMonth(), 1); }
  const { data, error } = await client().from("sales").select("total, created_at").eq("business_id", businessId).eq("sale_status", "completed").gte("created_at", from.toISOString()).order("created_at");
  if (error) throw error;
  const rows = data ?? [];
  if (period === "7 days") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); buckets[days[d.getDay()] + "-" + d.getDate()] = 0; }
    rows.forEach((r: any) => { const d = new Date(r.created_at); const key = days[d.getDay()] + "-" + d.getDate(); if (key in buckets) buckets[key] = (buckets[key] || 0) + Number(r.total); });
    return Object.entries(buckets).map(([key, value]) => ({ label: key.split("-")[0], value }));
  }
  const wBuckets: Record<string, number> = { W1: 0, W2: 0, W3: 0, W4: 0 };
  rows.forEach((r: any) => { const day = new Date(r.created_at).getDate(); const week = day <= 7 ? "W1" : day <= 14 ? "W2" : day <= 21 ? "W3" : "W4"; wBuckets[week] = (wBuckets[week] || 0) + Number(r.total); });
  return Object.entries(wBuckets).map(([label, value]) => ({ label, value }));
}

export async function getTopProducts(businessId: string): Promise<TopProduct[]> {
  if (isDemo()) {
    return [
      { name: "Samsung Galaxy A15", sold: 3, revenue: 2550000 },
      { name: "Tecno Spark 30", sold: 2, revenue: 1040000 },
      { name: "Oraimo Fast Charger", sold: 1, revenue: 35000 },
      { name: "Tempered Glass Protector", sold: 8, revenue: 64000 },
    ];
  }
  const from = new Date(); from.setDate(1); from.setHours(0, 0, 0, 0);
  const { data, error } = await client().from("sale_items").select("product_name_snapshot, quantity, subtotal, sales!inner(business_id, sale_status, created_at)").eq("sales.business_id", businessId).eq("sales.sale_status", "completed").gte("sales.created_at", from.toISOString());
  if (error) throw error;
  const map: Record<string, { sold: number; revenue: number }> = {};
  (data ?? []).forEach((item: any) => { const name = item.product_name_snapshot; if (!map[name]) map[name] = { sold: 0, revenue: 0 }; map[name].sold += item.quantity; map[name].revenue += Number(item.subtotal); });
  return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sold - a.sold).slice(0, 5);
}

export async function getLowStock(businessId: string): Promise<LowStockItem[]> {
  if (isDemo()) {
    const { availableStock } = await import("./inventory");
    return demoProducts.list().filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name, quantity: availableStock(p), minimum_stock: p.minimum_stock, category: p.category })).filter((p) => p.quantity <= p.minimum_stock).sort((a, b) => a.quantity - b.quantity);
  }
  const { data, error } = await client().from("products").select("id, name, quantity, minimum_stock, category, inventory_type, product_devices(status)").eq("business_id", businessId).eq("is_active", true);
  if (error) throw error;
  return (data ?? []).map((p: any) => {
    const qty = p.inventory_type === "individual" ? (p.product_devices ?? []).filter((d: any) => d.status === "in_stock").length : p.quantity;
    return { id: p.id, name: p.name, quantity: qty, minimum_stock: p.minimum_stock, category: p.category };
  }).filter((p) => p.quantity <= p.minimum_stock).sort((a, b) => a.quantity - b.quantity);
}

export async function getCustomersOwing(businessId: string): Promise<CustomerOwing[]> {
  if (isDemo()) {
    return demoCustomers.list().filter((c) => c.total_balance > 0).map((c) => ({ id: c.id, full_name: c.full_name, owed: c.total_balance, last_sale: c.created_at })).sort((a, b) => b.owed - a.owed).slice(0, 5);
  }
  const { data, error } = await client().from("sales").select("customer_id, balance, created_at, customers(id, full_name)").eq("business_id", businessId).eq("sale_status", "completed").in("payment_status", ["partial", "credit"]).order("created_at", { ascending: false });
  if (error) throw error;
  const map: Record<string, CustomerOwing> = {};
  (data ?? []).forEach((s: any) => { const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers; if (!customer) return; if (!map[customer.id]) map[customer.id] = { id: customer.id, full_name: customer.full_name, owed: 0, last_sale: s.created_at }; map[customer.id].owed += Number(s.balance); });
  return Object.values(map).sort((a, b) => b.owed - a.owed).slice(0, 5);
}

export async function getRecentSales(businessId: string): Promise<RecentSale[]> {
  if (isDemo()) {
    return demoSales.list().filter((s) => s.sale_status === "completed").sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10).map((s) => {
      const customer = s.customer_id ? demoCustomers.list().find((c) => c.id === s.customer_id) : null;
      return { id: s.id, receipt_number: s.receipt_number, customer_name: customer?.full_name ?? null, amount: s.total, payment_status: s.payment_status, created_at: s.created_at };
    });
  }
  const { data, error } = await client().from("sales").select("id, receipt_number, total, payment_status, created_at, customers(full_name)").eq("business_id", businessId).eq("sale_status", "completed").order("created_at", { ascending: false }).limit(10);
  if (error) throw error;
  return (data ?? []).map((s: any) => { const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers; return { id: s.id, receipt_number: s.receipt_number, customer_name: customer?.full_name ?? null, amount: Number(s.total), payment_status: s.payment_status, created_at: s.created_at }; });
}
