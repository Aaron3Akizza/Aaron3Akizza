import { supabase } from "./supabase";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export type DashboardStats = {
  todaySales: number;
  todayProfit: number;
  todayTransactions: number;
  outstandingDebt: number;
  debtCount: number;
};

export type SalesChartPoint = { label: string; value: number };

export type TopProduct = { name: string; sold: number; revenue: number };

export type LowStockItem = {
  id: string;
  name: string;
  quantity: number;
  minimum_stock: number;
  category: string;
};

export type CustomerOwing = {
  id: string;
  full_name: string;
  owed: number;
  last_sale: string;
};

export type RecentSale = {
  id: string;
  receipt_number: string;
  customer_name: string | null;
  amount: number;
  payment_status: string;
  created_at: string;
};

/** Today's totals: total revenue, gross profit, transaction count */
export async function getDashboardStats(businessId: string): Promise<DashboardStats> {
  const db = client();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [salesRes, debtRes] = await Promise.all([
    db
      .from("sales")
      .select("total, gross_profit")
      .eq("business_id", businessId)
      .eq("sale_status", "completed")
      .gte("created_at", todayStart.toISOString()),
    db
      .from("sales")
      .select("balance")
      .eq("business_id", businessId)
      .eq("sale_status", "completed")
      .in("payment_status", ["partial", "credit"]),
  ]);

  if (salesRes.error) throw salesRes.error;
  if (debtRes.error) throw debtRes.error;

  const todaySales = (salesRes.data ?? []).reduce((sum, s) => sum + Number(s.total), 0);
  const todayProfit = (salesRes.data ?? []).reduce((sum, s) => sum + Number(s.gross_profit), 0);
  const todayTransactions = (salesRes.data ?? []).length;
  const outstandingDebt = (debtRes.data ?? []).reduce((sum, s) => sum + Number(s.balance), 0);
  const debtCount = (debtRes.data ?? []).length;

  return { todaySales, todayProfit, todayTransactions, outstandingDebt, debtCount };
}

/** Sales totals grouped by period: "Today" (hourly), "7 days" (daily), "30 days" (weekly) */
export async function getSalesChart(
  businessId: string,
  period: "Today" | "7 days" | "30 days" | "This month"
): Promise<SalesChartPoint[]> {
  const db = client();
  const now = new Date();
  let from: Date;

  if (period === "Today") {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (period === "7 days") {
    from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (period === "30 days") {
    from = new Date(now);
    from.setDate(now.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const { data, error } = await db
    .from("sales")
    .select("total, created_at")
    .eq("business_id", businessId)
    .eq("sale_status", "completed")
    .gte("created_at", from.toISOString())
    .order("created_at");

  if (error) throw error;
  const rows = data ?? [];

  if (period === "Today") {
    const buckets: Record<string, number> = {};
    for (let h = 0; h < 24; h++) {
      const key = `${h.toString().padStart(2, "0")}:00`;
      buckets[key] = 0;
    }
    rows.forEach((r) => {
      const h = new Date(r.created_at).getHours().toString().padStart(2, "0") + ":00";
      buckets[h] = (buckets[h] ?? 0) + Number(r.total);
    });
    const active = Object.entries(buckets).filter(([, v]) => v > 0);
    if (active.length === 0) return Object.entries(buckets).slice(8, 20).map(([label, value]) => ({ label, value }));
    const firstActive = Object.keys(buckets).indexOf(active[0][0]);
    const lastActive = Object.keys(buckets).indexOf(active[active.length - 1][0]);
    return Object.entries(buckets)
      .slice(Math.max(0, firstActive - 1), Math.min(24, lastActive + 2))
      .map(([label, value]) => ({ label, value }));
  }

  if (period === "7 days") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      buckets[days[d.getDay()] + "-" + d.getDate()] = 0;
    }
    rows.forEach((r) => {
      const d = new Date(r.created_at);
      const key = days[d.getDay()] + "-" + d.getDate();
      if (key in buckets) buckets[key] = (buckets[key] ?? 0) + Number(r.total);
    });
    return Object.entries(buckets).map(([key, value]) => ({ label: key.split("-")[0], value }));
  }

  // 30 days or This month: group by week
  const buckets: Record<string, number> = { W1: 0, W2: 0, W3: 0, W4: 0 };
  rows.forEach((r) => {
    const day = new Date(r.created_at).getDate();
    const week = day <= 7 ? "W1" : day <= 14 ? "W2" : day <= 21 ? "W3" : "W4";
    buckets[week] = (buckets[week] ?? 0) + Number(r.total);
  });
  return Object.entries(buckets).map(([label, value]) => ({ label, value }));
}

/** Top 5 products by units sold this month */
export async function getTopProducts(businessId: string): Promise<TopProduct[]> {
  const db = client();
  const from = new Date();
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  const { data, error } = await db
    .from("sale_items")
    .select("product_name_snapshot, quantity, subtotal, sales!inner(business_id, sale_status, created_at)")
    .eq("sales.business_id", businessId)
    .eq("sales.sale_status", "completed")
    .gte("sales.created_at", from.toISOString());

  if (error) throw error;

  const map: Record<string, { sold: number; revenue: number }> = {};
  (data ?? []).forEach((item: any) => {
    const name = item.product_name_snapshot;
    if (!map[name]) map[name] = { sold: 0, revenue: 0 };
    map[name].sold += item.quantity;
    map[name].revenue += Number(item.subtotal);
  });

  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);
}

/** Products at or below minimum stock */
export async function getLowStock(businessId: string): Promise<LowStockItem[]> {
  const db = client();
  const { data, error } = await db
    .from("products")
    .select("id, name, quantity, minimum_stock, category, inventory_type, product_devices(status)")
    .eq("business_id", businessId)
    .eq("is_active", true);

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

/** Customers with outstanding balances */
export async function getCustomersOwing(businessId: string): Promise<CustomerOwing[]> {
  const db = client();
  const { data, error } = await db
    .from("sales")
    .select("customer_id, balance, created_at, customers(id, full_name)")
    .eq("business_id", businessId)
    .eq("sale_status", "completed")
    .in("payment_status", ["partial", "credit"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const map: Record<string, CustomerOwing> = {};
  (data ?? []).forEach((s: any) => {
    const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers;
    if (!customer) return;
    if (!map[customer.id]) {
      map[customer.id] = {
        id: customer.id,
        full_name: customer.full_name,
        owed: 0,
        last_sale: s.created_at,
      };
    }
    map[customer.id].owed += Number(s.balance);
  });

  return Object.values(map).sort((a, b) => b.owed - a.owed).slice(0, 5);
}

/** Recent 10 completed sales */
export async function getRecentSales(businessId: string): Promise<RecentSale[]> {
  const db = client();
  const { data, error } = await db
    .from("sales")
    .select("id, receipt_number, total, payment_status, created_at, customers(full_name)")
    .eq("business_id", businessId)
    .eq("sale_status", "completed")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((s: any) => {
    const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers;
    return {
      id: s.id,
      receipt_number: s.receipt_number,
      customer_name: customer?.full_name ?? null,
      amount: Number(s.total),
      payment_status: s.payment_status,
      created_at: s.created_at,
    };
  });
}
