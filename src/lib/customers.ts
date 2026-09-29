import { supabase } from "./supabase";
import { demoCustomers, demoSales } from "./demo";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

const isDemo = () => !supabase;

export type CustomerProfile = {
  id: string;
  business_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  total_purchased: number;
  total_paid: number;
  total_balance: number;
  sale_count: number;
};

export type CustomerSale = {
  id: string;
  receipt_number: string;
  total: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  created_at: string;
};

export type Payment = {
  id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  created_at: string;
};

// ─── LIST CUSTOMERS ───────────────────────────────────────────────────────────
// Uses the list_customers_with_stats RPC — aggregates happen in the DB,
// no longer fetches ALL sales client-side.

export async function listCustomers(
  businessId: string,
  opts: { search?: string; onlyWithBalance?: boolean; limit?: number; offset?: number } = {}
): Promise<CustomerProfile[]> {
  if (isDemo()) {
    let rows = demoCustomers.list();
    if (opts.search) {
      const q = opts.search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
      );
    }
    if (opts.onlyWithBalance) rows = rows.filter((c) => c.total_balance > 0);
    return rows.slice(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 200));
  }

  const { data, error } = await client().rpc("list_customers_with_stats", {
    target_business_id: businessId,
    search_query:       opts.search?.trim() || null,
    only_with_balance:  opts.onlyWithBalance ?? false,
    p_limit:            opts.limit  ?? 200,
    p_offset:           opts.offset ?? 0,
  });
  if (error) throw error;

  // Map RPC result to CustomerProfile shape (business_id not returned by view — add it)
  return (data ?? []).map((row: any) => ({
    id:              row.customer_id,
    business_id:     businessId,
    full_name:       row.full_name,
    phone:           row.phone,
    email:           row.email,
    notes:           row.notes,
    created_at:      row.created_at,
    total_purchased: Number(row.total_purchased),
    total_paid:      Number(row.total_paid),
    total_balance:   Number(row.total_balance),
    sale_count:      Number(row.sale_count),
  })) as CustomerProfile[];
}

// ─── CUSTOMER SALES ───────────────────────────────────────────────────────────

export async function getCustomerSales(customerId: string): Promise<CustomerSale[]> {
  if (isDemo()) {
    return demoSales
      .list()
      .filter((s) => s.customer_id === customerId && s.sale_status !== "voided")
      .map((s) => ({
        id: s.id,
        receipt_number: s.receipt_number,
        total:          s.total,
        amount_paid:    s.amount_paid,
        balance:        s.balance,
        payment_status: s.payment_status,
        created_at:     s.created_at,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await client()
    .from("sales")
    .select("id, receipt_number, total, amount_paid, balance, payment_status, created_at, sale_status")
    .eq("customer_id", customerId)
    .neq("sale_status", "voided")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomerSale[];
}

// ─── CUSTOMER PAYMENTS ────────────────────────────────────────────────────────
// Excludes payments linked to voided sales to prevent phantom entries.

export async function getCustomerPayments(customerId: string): Promise<Payment[]> {
  if (isDemo()) return [];
  const { data, error } = await client()
    .from("payments")
    .select("id, amount, payment_method, reference, created_at, sales!inner(sale_status)")
    .eq("customer_id", customerId)
    .neq("sales.sale_status", "voided")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id:             p.id,
    amount:         p.amount,
    payment_method: p.payment_method,
    reference:      p.reference,
    created_at:     p.created_at,
  })) as Payment[];
}

// ─── UPDATE CUSTOMER ──────────────────────────────────────────────────────────

export async function updateCustomer(
  id: string,
  changes: Partial<{ full_name: string; phone: string | null; email: string | null; notes: string | null }>
): Promise<void> {
  if (isDemo()) { demoCustomers.update(id, changes); return; }
  const { error } = await client()
    .from("customers")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ─── RECORD PAYMENT ───────────────────────────────────────────────────────────
// Uses the record_payment RPC — atomic, locked, no race condition.

export async function recordPayment(
  _businessId: string,
  _customerId: string,
  saleId: string,
  amount: number,
  method: string,
  reference?: string
): Promise<void> {
  if (isDemo()) {
    const sale = demoSales.list().find((s) => s.id === saleId);
    if (sale) {
      const newPaid    = sale.amount_paid + amount;
      const newBalance = Math.max(0, sale.total - newPaid);
      Object.assign(sale, {
        amount_paid:    newPaid,
        balance:        newBalance,
        payment_status: newBalance === 0 ? "paid" : newPaid === 0 ? "credit" : "partial",
      });
      const cust = demoCustomers.list().find((c) => c.id === _customerId);
      if (cust) {
        demoCustomers.update(_customerId, {
          total_paid:    cust.total_paid + amount,
          total_balance: Math.max(0, cust.total_balance - amount),
        });
      }
    }
    return;
  }

  // Use the atomic RPC — single transaction, FOR UPDATE lock
  const { error } = await client().rpc("record_payment", {
    target_sale_id:    saleId,
    payment_amount:    amount,
    payment_method:    method,
    payment_reference: reference?.trim() || null,
  });
  if (error) throw error;
}
