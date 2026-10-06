import { supabase } from "./supabase";
import { demoSales, demoProducts, demoCustomers, demoExpenses } from "./demo";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

const isDemo = () => !supabase;

export type DashboardStats = {
  todaySales: number;
  todayProfit: number;       // gross profit today
  todayExpenses: number;     // expenses recorded today
  todayNet: number;          // todayProfit - todayExpenses
  todayTransactions: number;
  outstandingDebt: number;
  debtCount: number;         // distinct customers, not sales
};

export type SalesChartPoint = { label: string; value: number };
export type TopProduct = { name: string; sold: number; revenue: number };
export type LowStockItem = { id: string; name: string; quantity: number; minimum_stock: number; category: string };
export type CustomerOwing = { id: string; full_name: string; owed: number; last_sale: string };
export type RecentSale = { id: string; receipt_number: string; customer_name: string | null; amount: number; payment_status: string; created_at: string };

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export async function getDashboardStats(businessId: string): Promise<DashboardStats> {
  if (isDemo()) {
    const today      = new Date().toISOString().slice(0, 10);
    const todayList  = demoSales.list().filter(
      (s) => s.sale_status === "completed" && s.created_at.slice(0, 10) === today
    );
    const debt       = demoSales.list().filter(
      (s) => s.sale_status === "completed" && s.balance > 0
    );
    const todayExpAmt = demoExpenses.list()
      .filter((e) => e.expense_date === today)
      .reduce((s, e) => s + e.amount, 0);
    const grossToday  = todayList.reduce((s, x) => s + x.gross_profit, 0);

    return {
      todaySales:       todayList.reduce((s, x) => s + x.total, 0),
      todayProfit:      grossToday,
      todayExpenses:    todayExpAmt,
      todayNet:         grossToday - todayExpAmt,
      todayTransactions: todayList.length,
      outstandingDebt:  debt.reduce((s, x) => s + x.balance, 0),
      debtCount:        new Set(debt.map((s) => s.customer_id).filter(Boolean)).size,
    };
  }

  // Use the get_dashboard_stats RPC — single query, correct debtCount (distinct customers)
  const { data, error } = await client().rpc("get_dashboard_stats", {
    target_business_id: businessId,
    tz_offset_hours:    3, // EAT = UTC+3; adjust if needed
  });
  if (error) throw error;

  const d = data as any;
  const grossToday = Number(d.today_profit ?? 0);
  const expToday   = Number(d.today_expenses ?? 0);

  return {
    todaySales:        Number(d.today_sales        ?? 0),
    todayProfit:       grossToday,
    todayExpenses:     expToday,
    todayNet:          grossToday - expToday,
    todayTransactions: Number(d.today_transactions ?? 0),
    outstandingDebt:   Number(d.outstanding_debt   ?? 0),
    debtCount:         Number(d.debt_customer_count ?? 0),
  };
}

// ─── SALES CHART ─────────────────────────────────────────────────────────────

export async function getSalesChart(
  businessId: string,
  period: "Today" | "7 days" | "30 days" | "This month"
): Promise<SalesChartPoint[]> {
  const now = new Date();

  if (isDemo()) {
    const sales = demoSales.list().filter((s) => s.sale_status === "completed");

    if (period === "Today") {
      const today   = now.toISOString().slice(0, 10);
      const buckets: Record<string, number> = {};
      for (let h = 0; h < 24; h++) buckets[`${String(h).padStart(2, "0")}:00`] = 0;
      sales
        .filter((s) => s.created_at.slice(0, 10) === today)
        .forEach((s) => {
          const h = `${String(new Date(s.created_at).getHours()).padStart(2, "0")}:00`;
          buckets[h] = (buckets[h] ?? 0) + s.total;
        });
      const entries = Object.entries(buckets);
      // Show business hours 7am–10pm only
      return entries.slice(7, 22).map(([label, value]) => ({ label, value }));
    }

    if (period === "7 days") {
      const days   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const buckets: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        buckets[days[d.getDay()] + d.getDate()] = 0;
      }
      sales.forEach((s) => {
        const d   = new Date(s.created_at);
        const key = days[d.getDay()] + d.getDate();
        if (key in buckets) buckets[key] = (buckets[key] ?? 0) + s.total;
      });
      return Object.entries(buckets).map(([key, value]) => ({ label: key.slice(0, 3), value }));
    }

    const buckets = { W1: 0, W2: 0, W3: 0, W4: 0 };
    sales.forEach((s) => {
      const day = new Date(s.created_at).getDate();
      const w   = day <= 7 ? "W1" : day <= 14 ? "W2" : day <= 21 ? "W3" : "W4";
      (buckets as any)[w] += s.total;
    });
    return Object.entries(buckets).map(([label, value]) => ({ label, value }));
  }

  // Live Supabase path
  let from: Date;
  if (period === "Today") {
    from = new Date(now); from.setHours(0, 0, 0, 0);
  } else if (period === "7 days") {
    from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
  } else if (period === "30 days") {
    from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const { data, error } = await client()
    .from("sales")
    .select("total, created_at")
    .eq("business_id", businessId)
    .eq("sale_status", "completed")
    .gte("created_at", from.toISOString())
    .order("created_at");
  if (error) throw error;
  const rows = data ?? [];

  // ── Today: hourly buckets ──────────────────────────────────────────────────
  if (period === "Today") {
    const buckets: Record<string, number> = {};
    for (let h = 0; h < 24; h++) buckets[`${String(h).padStart(2, "0")}:00`] = 0;
    rows.forEach((r: any) => {
      const h = `${String(new Date(r.created_at).getHours()).padStart(2, "0")}:00`;
      buckets[h] = (buckets[h] ?? 0) + Number(r.total);
    });
    const entries = Object.entries(buckets);
    // If there are any sales, show the surrounding hours; else show business hours
    const activePairs = entries.filter(([, v]) => v > 0);
    if (activePairs.length === 0) {
      return entries.slice(7, 22).map(([label, value]) => ({ label, value }));
    }
    const firstIdx = entries.findIndex(([k]) => k === activePairs[0][0]);
    const lastIdx  = entries.findIndex(([k]) => k === activePairs[activePairs.length - 1][0]);
    return entries
      .slice(Math.max(0, firstIdx - 1), Math.min(24, lastIdx + 2))
      .map(([label, value]) => ({ label, value }));
  }

  // ── 7 days: daily buckets ─────────────────────────────────────────────────
  if (period === "7 days") {
    const days    = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      buckets[days[d.getDay()] + "-" + d.getDate()] = 0;
    }
    rows.forEach((r: any) => {
      const d   = new Date(r.created_at);
      const key = days[d.getDay()] + "-" + d.getDate();
      if (key in buckets) buckets[key] = (buckets[key] ?? 0) + Number(r.total);
    });
    return Object.entries(buckets).map(([key, value]) => ({ label: key.split("-")[0], value }));
  }

  // ── 30 days / This month: weekly buckets ──────────────────────────────────
  const wBuckets: Record<string, number> = { W1: 0, W2: 0, W3: 0, W4: 0 };
  rows.forEach((r: any) => {
    const day  = new Date(r.created_at).getDate();
    const week = day <= 7 ? "W1" : day <= 14 ? "W2" : day <= 21 ? "W3" : "W4";
    wBuckets[week] = (wBuckets[week] ?? 0) + Number(r.total);
  });
  return Object.entries(wBuckets).map(([label, value]) => ({ label, value }));
}

// ─── TOP PRODUCTS ─────────────────────────────────────────────────────────────

export async function getTopProducts(businessId: string): Promise<TopProduct[]> {
  if (isDemo()) {
    return [
      { name: "Apple iPhone 14",         sold: 2, revenue: 7000000 },
      { name: "Samsung Galaxy A15",       sold: 3, revenue: 2550000 },
      { name: "Tecno Spark 30",           sold: 2, revenue: 1040000 },
      { name: "Tempered Glass Protector", sold: 8, revenue:   64000 },
      { name: "Oraimo Fast Charger",      sold: 1, revenue:   35000 },
    ];
  }
  const from = new Date(); from.setDate(1); from.setHours(0, 0, 0, 0);
  const { data, error } = await client()
    .from("sale_items")
    .select("product_name_snapshot, quantity, subtotal, sales!inner(business_id, sale_status, created_at)")
    .eq("sales.business_id",   businessId)
    .eq("sales.sale_status",   "completed")
    .gte("sales.created_at",   from.toISOString());
  if (error) throw error;
  const map: Record<string, { sold: number; revenue: number }> = {};
  (data ?? []).forEach((item: any) => {
    const name = item.product_name_snapshot;
    if (!map[name]) map[name] = { sold: 0, revenue: 0 };
    map[name].sold    += item.quantity;
    map[name].revenue += Number(item.subtotal);
  });
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);
}

// ─── LOW STOCK ────────────────────────────────────────────────────────────────

export async function getLowStock(businessId: string): Promise<LowStockItem[]> {
  if (isDemo()) {
    const { availableStock } = await import("./inventory");
    return demoProducts
      .list()
      .filter((p) => p.is_active)
      .map((p) => ({
        id:            p.id,
        name:          p.name,
        quantity:      availableStock(p),
        minimum_stock: p.minimum_stock,
        category:      p.category,
      }))
      .filter((p) => p.quantity <= p.minimum_stock)
      .sort((a, b) => a.quantity - b.quantity);
  }
  const { data, error } = await client()
    .from("products")
    .select("id, name, quantity, minimum_stock, category, inventory_type, product_devices(status)")
    .eq("business_id", businessId)
    .eq("is_active",   true);
  if (error) throw error;
  return (data ?? [])
    .map((p: any) => {
      const qty =
        p.inventory_type === "individual"
          ? (p.product_devices ?? []).filter((d: any) => d.status === "in_stock").length
          : p.quantity;
      return { id: p.id, name: p.name, quantity: qty, minimum_stock: p.minimum_stock, category: p.category };
    })
    .filter((p) => p.quantity <= p.minimum_stock)
    .sort((a, b) => a.quantity - b.quantity);
}

// ─── CUSTOMERS OWING ─────────────────────────────────────────────────────────

export async function getCustomersOwing(businessId: string): Promise<CustomerOwing[]> {
  if (isDemo()) {
    return demoCustomers
      .list()
      .filter((c) => c.total_balance > 0)
      .map((c) => ({ id: c.id, full_name: c.full_name, owed: c.total_balance, last_sale: c.created_at }))
      .sort((a, b) => b.owed - a.owed)
      .slice(0, 5);
  }
  const { data, error } = await client()
    .from("sales")
    .select("customer_id, balance, created_at, customers(id, full_name)")
    .eq("business_id",   businessId)
    .eq("sale_status",   "completed")
    .in("payment_status", ["partial", "credit"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  const map: Record<string, CustomerOwing> = {};
  (data ?? []).forEach((s: any) => {
    const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers;
    if (!customer) return;
    if (!map[customer.id]) {
      map[customer.id] = { id: customer.id, full_name: customer.full_name, owed: 0, last_sale: s.created_at };
    }
    map[customer.id].owed += Number(s.balance);
  });
  return Object.values(map).sort((a, b) => b.owed - a.owed).slice(0, 5);
}

// ─── RECENT SALES ─────────────────────────────────────────────────────────────

export async function getRecentSales(businessId: string): Promise<RecentSale[]> {
  if (isDemo()) {
    return demoSales
      .list()
      .filter((s) => s.sale_status === "completed")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10)
      .map((s) => {
        const customer = s.customer_id
          ? demoCustomers.list().find((c) => c.id === s.customer_id)
          : null;
        return {
          id:            s.id,
          receipt_number: s.receipt_number,
          customer_name: customer?.full_name ?? null,
          amount:        s.total,
          payment_status: s.payment_status,
          created_at:    s.created_at,
        };
      });
  }
  const { data, error } = await client()
    .from("sales")
    .select("id, receipt_number, total, payment_status, created_at, customers(full_name)")
    .eq("business_id",  businessId)
    .eq("sale_status",  "completed")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((s: any) => {
    const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers;
    return {
      id:             s.id,
      receipt_number: s.receipt_number,
      customer_name:  customer?.full_name ?? null,
      amount:         Number(s.total),
      payment_status: s.payment_status,
      created_at:     s.created_at,
    };
  });
}

// ─── STOCK MOVEMENT HISTORY ───────────────────────────────────────────────────

export type StockMovement = {
  id: string;
  movement_type: string;
  quantity: number;
  reason: string | null;
  reference_id: string | null;
  receipt_number: string | null;
  staff_name: string | null;
  created_at: string;
};

export async function getStockMovements(
  productId: string,
  limit = 50,
  offset = 0
): Promise<StockMovement[]> {
  if (isDemo()) return []; // No movement history in demo
  const { data, error } = await client().rpc("get_stock_movements", {
    target_product_id: productId,
    p_limit:           limit,
    p_offset:          offset,
  });
  if (error) throw error;
  return (data ?? []) as StockMovement[];
}
