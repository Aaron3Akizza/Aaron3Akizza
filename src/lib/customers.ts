import { supabase } from "./supabase";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

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

export async function listCustomers(businessId: string): Promise<CustomerProfile[]> {
  const db = client();

  const [customersRes, salesRes] = await Promise.all([
    db
      .from("customers")
      .select("id, full_name, phone, email, notes, created_at")
      .eq("business_id", businessId)
      .order("full_name"),
    db
      .from("sales")
      .select("customer_id, total, amount_paid, balance, sale_status")
      .eq("business_id", businessId)
      .not("customer_id", "is", null),
  ]);

  if (customersRes.error) throw customersRes.error;
  if (salesRes.error) throw salesRes.error;

  const statsMap: Record<string, { total_purchased: number; total_paid: number; total_balance: number; sale_count: number }> = {};
  (salesRes.data ?? []).forEach((s: any) => {
    if (!s.customer_id) return;
    if (!statsMap[s.customer_id]) statsMap[s.customer_id] = { total_purchased: 0, total_paid: 0, total_balance: 0, sale_count: 0 };
    if (s.sale_status !== "voided") {
      statsMap[s.customer_id].total_purchased += Number(s.total);
      statsMap[s.customer_id].total_paid += Number(s.amount_paid);
      statsMap[s.customer_id].total_balance += Number(s.balance);
      statsMap[s.customer_id].sale_count += 1;
    }
  });

  return (customersRes.data ?? []).map((c: any) => ({
    ...c,
    notes: c.notes ?? null,
    ...(statsMap[c.id] ?? { total_purchased: 0, total_paid: 0, total_balance: 0, sale_count: 0 }),
  }));
}

export async function getCustomerSales(customerId: string): Promise<CustomerSale[]> {
  const db = client();
  const { data, error } = await db
    .from("sales")
    .select("id, receipt_number, total, amount_paid, balance, payment_status, created_at")
    .eq("customer_id", customerId)
    .neq("sale_status", "voided")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CustomerSale[];
}

export async function getCustomerPayments(customerId: string): Promise<Payment[]> {
  const db = client();
  const { data, error } = await db
    .from("payments")
    .select("id, amount, payment_method, reference, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function updateCustomer(
  id: string,
  changes: Partial<{ full_name: string; phone: string | null; email: string | null; notes: string | null }>
): Promise<void> {
  const db = client();
  const { error } = await db
    .from("customers")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Record a payment against a customer's outstanding balance */
export async function recordPayment(
  businessId: string,
  customerId: string,
  saleId: string,
  amount: number,
  method: string,
  reference?: string
): Promise<void> {
  const db = client();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Insert payment record
  const { error: paymentError } = await db.from("payments").insert({
    business_id: businessId,
    sale_id: saleId,
    customer_id: customerId,
    amount,
    payment_method: method,
    reference: reference?.trim() || null,
    received_by: user.id,
  });
  if (paymentError) throw paymentError;

  // Update sale balance and payment status
  const { data: sale, error: saleReadError } = await db
    .from("sales")
    .select("amount_paid, total, balance")
    .eq("id", saleId)
    .single();
  if (saleReadError) throw saleReadError;

  const newPaid = Number(sale.amount_paid) + amount;
  const newBalance = Math.max(0, Number(sale.total) - newPaid);
  const newStatus = newBalance === 0 ? "paid" : newPaid === 0 ? "credit" : "partial";

  const { error: updateError } = await db
    .from("sales")
    .update({ amount_paid: newPaid, balance: newBalance, payment_status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", saleId);
  if (updateError) throw updateError;
}
