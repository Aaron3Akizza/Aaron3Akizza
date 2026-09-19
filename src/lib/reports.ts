import { supabase } from "./supabase";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export type DateRange = { from: string; to: string };

export type SalesReportRow = {
  date: string;
  transactions: number;
  revenue: number;
  discount: number;
  cost: number;
  gross_profit: number;
};

export type SalesReport = {
  totalRevenue: number;
  totalTransactions: number;
  totalDiscount: number;
  totalCost: number;
  totalProfit: number;
  avgSale: number;
  byDay: SalesReportRow[];
};

export type ProductReportRow = {
  product_name: string;
  units_sold: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type InventoryReport = {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  items: {
    id: string;
    name: string;
    category: string;
    stock: number;
    minimum_stock: number;
    buying_price: number;
    selling_price: number;
    value: number;
    status: "healthy" | "low" | "out";
  }[];
};

export type DebtReport = {
  totalDebt: number;
  debtorCount: number;
  debtors: {
    customer_id: string;
    full_name: string;
    phone: string | null;
    total_owed: number;
    sale_count: number;
    oldest_sale: string;
  }[];
};

export async function getSalesReport(businessId: string, range: DateRange): Promise<SalesReport> {
  const db = client();
  const { data, error } = await db
    .from("sales")
    .select("total, subtotal, discount, cost_of_goods, gross_profit, created_at")
    .eq("business_id", businessId)
    .eq("sale_status", "completed")
    .gte("created_at", range.from)
    .lte("created_at", range.to)
    .order("created_at");

  if (error) throw error;
  const rows = data ?? [];

  const byDayMap: Record<string, SalesReportRow> = {};
  rows.forEach((s: any) => {
    const day = s.created_at.slice(0, 10);
    if (!byDayMap[day]) byDayMap[day] = { date: day, transactions: 0, revenue: 0, discount: 0, cost: 0, gross_profit: 0 };
    byDayMap[day].transactions += 1;
    byDayMap[day].revenue += Number(s.total);
    byDayMap[day].discount += Number(s.discount);
    byDayMap[day].cost += Number(s.cost_of_goods);
    byDayMap[day].gross_profit += Number(s.gross_profit);
  });

  const byDay = Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date));
  const totalRevenue = rows.reduce((s: number, r: any) => s + Number(r.total), 0);
  const totalDiscount = rows.reduce((s: number, r: any) => s + Number(r.discount), 0);
  const totalCost = rows.reduce((s: number, r: any) => s + Number(r.cost_of_goods), 0);
  const totalProfit = rows.reduce((s: number, r: any) => s + Number(r.gross_profit), 0);

  return {
    totalRevenue,
    totalTransactions: rows.length,
    totalDiscount,
    totalCost,
    totalProfit,
    avgSale: rows.length > 0 ? totalRevenue / rows.length : 0,
    byDay,
  };
}

export async function getProductSalesReport(
  businessId: string,
  range: DateRange
): Promise<ProductReportRow[]> {
  const db = client();
  const { data, error } = await db
    .from("sale_items")
    .select("product_name_snapshot, quantity, subtotal, profit, unit_cost, sales!inner(business_id, sale_status, created_at)")
    .eq("sales.business_id", businessId)
    .eq("sales.sale_status", "completed")
    .gte("sales.created_at", range.from)
    .lte("sales.created_at", range.to);

  if (error) throw error;

  const map: Record<string, ProductReportRow> = {};
  (data ?? []).forEach((item: any) => {
    const name = item.product_name_snapshot;
    if (!map[name]) map[name] = { product_name: name, units_sold: 0, revenue: 0, cost: 0, profit: 0 };
    map[name].units_sold += item.quantity;
    map[name].revenue += Number(item.subtotal);
    map[name].cost += Number(item.unit_cost) * item.quantity;
    map[name].profit += Number(item.profit);
  });

  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

export async function getInventoryReport(businessId: string): Promise<InventoryReport> {
  const db = client();
  const { data, error } = await db
    .from("products")
    .select("id, name, category, quantity, minimum_stock, buying_price, selling_price, inventory_type, is_active, product_devices(status)")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (error) throw error;

  const items = (data ?? []).map((p: any) => {
    const stock =
      p.inventory_type === "individual"
        ? (p.product_devices ?? []).filter((d: any) => d.status === "in_stock").length
        : p.quantity;
    const status: "healthy" | "low" | "out" = stock === 0 ? "out" : stock <= p.minimum_stock ? "low" : "healthy";
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      stock,
      minimum_stock: p.minimum_stock,
      buying_price: Number(p.buying_price),
      selling_price: Number(p.selling_price),
      value: stock * Number(p.buying_price),
      status,
    };
  });

  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const lowStockCount = items.filter((i) => i.status === "low").length;
  const outOfStockCount = items.filter((i) => i.status === "out").length;

  return { totalProducts: items.length, totalValue, lowStockCount, outOfStockCount, items };
}

export async function getDebtReport(businessId: string): Promise<DebtReport> {
  const db = client();
  const { data, error } = await db
    .from("sales")
    .select("customer_id, balance, created_at, customers(id, full_name, phone)")
    .eq("business_id", businessId)
    .eq("sale_status", "completed")
    .in("payment_status", ["partial", "credit"])
    .order("created_at");

  if (error) throw error;

  const map: Record<string, { full_name: string; phone: string | null; total_owed: number; sale_count: number; oldest_sale: string }> = {};
  (data ?? []).forEach((s: any) => {
    const customer = Array.isArray(s.customers) ? s.customers[0] : s.customers;
    if (!customer) return;
    if (!map[customer.id]) map[customer.id] = { full_name: customer.full_name, phone: customer.phone, total_owed: 0, sale_count: 0, oldest_sale: s.created_at };
    map[customer.id].total_owed += Number(s.balance);
    map[customer.id].sale_count += 1;
  });

  const debtors = Object.entries(map)
    .map(([customer_id, v]) => ({ customer_id, ...v }))
    .sort((a, b) => b.total_owed - a.total_owed);

  return {
    totalDebt: debtors.reduce((s, d) => s + d.total_owed, 0),
    debtorCount: debtors.length,
    debtors,
  };
}

export async function getExpensesTotal(businessId: string, range: DateRange): Promise<number> {
  const db = client();
  const { data, error } = await db
    .from("expenses")
    .select("amount")
    .eq("business_id", businessId)
    .gte("expense_date", range.from)
    .lte("expense_date", range.to);

  if (error) throw error;
  return (data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
}

export type StaffReportRow = {
  staff_id: string;
  full_name: string;
  transactions: number;
  revenue: number;
  gross_profit: number;
};

export async function getStaffSalesReport(
  businessId: string,
  range: DateRange
): Promise<StaffReportRow[]> {
  const db = client();
  const { data, error } = await db
    .from("sales")
    .select("sold_by, total, gross_profit, profiles(full_name)")
    .eq("business_id", businessId)
    .eq("sale_status", "completed")
    .gte("created_at", range.from)
    .lte("created_at", range.to);

  if (error) throw error;

  const map: Record<string, StaffReportRow> = {};
  (data ?? []).forEach((s: any) => {
    const id = s.sold_by;
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    const name = profile?.full_name ?? id?.slice(0, 8) ?? "Unknown";
    if (!map[id]) map[id] = { staff_id: id, full_name: name, transactions: 0, revenue: 0, gross_profit: 0 };
    map[id].transactions += 1;
    map[id].revenue += Number(s.total);
    map[id].gross_profit += Number(s.gross_profit);
  });

  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

/** Convert an array of objects to a CSV string and trigger a browser download */
export function downloadCSV(filename: string, rows: Record<string, any>[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
