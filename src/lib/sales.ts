import { Product, availableStock } from "./inventory";
import { supabase } from "./supabase";
import { demoSales, demoCustomers, demoProducts, DEMO_BUSINESS_ID } from "./demo";

export type CartItem = { product: Product; quantity: number; deviceId?: string };

/** Matches what the DB returns — includes customer_name from the RPC */
export type Sale = {
  id: string;
  receipt_number: string;
  customer_id: string | null;
  customer_name: string | null;   // joined from customers table
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  cost_of_goods: number;
  gross_profit: number;
  payment_status: "paid" | "partial" | "credit";
  sale_status: "completed" | "voided" | "refunded";
  sold_by: string;
  due_date: string | null;
  created_at: string;
};

export type SaleDetail = {
  id: string;
  receipt_number: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  gross_profit: number;
  payment_status: string;
  sale_status: string;
  due_date: string | null;
  created_at: string;
  customers: { full_name: string } | null;
  sale_items: SaleItem[];
  payments: PaymentRecord[];
};

export type SaleItem = {
  id: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  profit: number;
  device_id: string | null;
  device_imei: string | null;
};

export type PaymentRecord = {
  id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  created_at: string;
};

export type Customer = { id: string; full_name: string; phone: string | null };

export type SalesFilter = {
  query?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};

const isDemo = () => !supabase;
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

// ─── LIST SALES (server-side filtered + paginated) ────────────────────────────

export async function listSales(
  businessId: string,
  filter: SalesFilter = {}
): Promise<Sale[]> {
  const { query, status, fromDate, toDate, limit = 50, offset = 0 } = filter;

  if (isDemo()) {
    let rows = [...demoSales.list()].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((s) => {
        const custName = demoCustomers.list().find((c) => c.id === s.customer_id)?.full_name ?? "";
        return s.receipt_number.toLowerCase().includes(q) || custName.toLowerCase().includes(q);
      });
    }
    if (status && status !== "all") {
      rows = rows.filter((s) => s.payment_status === status || s.sale_status === status);
    }
    if (fromDate) rows = rows.filter((s) => s.created_at >= fromDate);
    if (toDate)   rows = rows.filter((s) => s.created_at <= toDate + "T23:59:59");
    return rows.slice(offset, offset + limit).map((s) => {
      const custName = s.customer_id
        ? demoCustomers.list().find((c) => c.id === s.customer_id)?.full_name ?? null
        : null;
      return { ...s, customer_name: custName };
    });
  }

  // Use the server-side RPC for real Supabase — correct pagination + customer name
  const { data, error } = await client().rpc("list_sales_filtered", {
    target_business_id: businessId,
    search_query:       query?.trim() || null,
    status_filter:      (status && status !== "all") ? status : null,
    date_from:          fromDate || null,
    date_to:            toDate   || null,
    p_limit:            limit,
    p_offset:           offset,
  });
  if (error) throw error;
  return (data ?? []) as Sale[];
}

// ─── GET SINGLE SALE (typed) ──────────────────────────────────────────────────

export async function getSale(id: string): Promise<SaleDetail> {
  if (isDemo()) {
    const sale = demoSales.list().find((s) => s.id === id);
    if (!sale) throw new Error("Sale not found");
    const customer = sale.customer_id
      ? demoCustomers.list().find((c) => c.id === sale.customer_id)
      : null;
    return {
      id: sale.id,
      receipt_number: sale.receipt_number,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      amount_paid: sale.amount_paid,
      balance: sale.balance,
      gross_profit: sale.gross_profit,
      payment_status: sale.payment_status,
      sale_status: sale.sale_status,
      due_date: sale.due_date,
      created_at: sale.created_at,
      customers: customer ? { full_name: customer.full_name } : null,
      sale_items: [
        {
          id: uid(),
          product_name_snapshot: "Demo Product",
          quantity: 1,
          unit_price: sale.total + sale.discount,
          unit_cost: sale.cost_of_goods,
          subtotal: sale.total + sale.discount,
          profit: sale.gross_profit,
          device_id: null,
          device_imei: null,
        },
      ],
      payments: [],
    };
  }
  const { data, error } = await client()
    .from("sales")
    .select("*, sale_items(*), payments(*), customers(full_name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as SaleDetail;
}

// ─── CUSTOMERS (for cart dropdown — stays at 100, pageable later) ─────────────

export async function listCustomers(businessId: string): Promise<Customer[]> {
  if (isDemo()) {
    return demoCustomers.list().map((c) => ({ id: c.id, full_name: c.full_name, phone: c.phone }));
  }
  const { data, error } = await client()
    .from("customers")
    .select("id, full_name, phone")
    .eq("business_id", businessId)
    .order("full_name")
    .range(0, 149); // extended to 150
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function createCustomer(
  businessId: string,
  fullName: string,
  phone: string
): Promise<Customer> {
  if (isDemo()) {
    const c = { id: "cust-" + uid(), full_name: fullName.trim(), phone: phone.trim() || null };
    demoCustomers.add({
      ...c,
      business_id: businessId, email: null, notes: null,
      created_at: new Date().toISOString(),
      total_purchased: 0, total_paid: 0, total_balance: 0, sale_count: 0,
    });
    return c;
  }
  const { data, error } = await client()
    .from("customers")
    .insert({ business_id: businessId, full_name: fullName.trim(), phone: phone.trim() || null })
    .select("id, full_name, phone")
    .single();
  if (error) throw error;
  return data as Customer;
}

// ─── COMPLETE SALE ────────────────────────────────────────────────────────────

export async function completeSale(
  businessId: string,
  customerId: string | null,
  discount: number,
  paid: number,
  method: string,
  reference: string,
  cart: CartItem[]
): Promise<{ id: string; receipt_number: string }> {
  if (isDemo()) {
    const subtotal    = cart.reduce((s, item) => s + item.product.selling_price * item.quantity, 0);
    const total       = Math.max(0, subtotal - discount);
    const balance     = Math.max(0, total - paid);
    const costOfGoods = cart.reduce((s, item) => s + item.product.buying_price * item.quantity, 0);
    const id          = "sale-" + uid();
    const receiptNum  = "BF-2026-" + String(demoSales.list().length + 1).padStart(6, "0");

    demoSales.add({
      id, receipt_number: receiptNum, customer_id: customerId,
      customer_name: customerId
        ? demoCustomers.list().find((c) => c.id === customerId)?.full_name ?? null
        : null,
      subtotal, discount, total, amount_paid: paid, balance,
      cost_of_goods: costOfGoods, gross_profit: total - costOfGoods,
      payment_status: balance === 0 ? "paid" : paid === 0 ? "credit" : "partial",
      sale_status: "completed", sold_by: DEMO_BUSINESS_ID, due_date: null,
      created_at: new Date().toISOString(),
    } as any);

    // Deduct demo stock
    cart.forEach((item) => {
      if (item.product.inventory_type === "quantity") {
        demoProducts.update(item.product.id, { quantity: Math.max(0, item.product.quantity - item.quantity) });
      } else if (item.deviceId) {
        const p = demoProducts.list().find((x) => x.id === item.product.id);
        if (p?.product_devices) {
          demoProducts.update(p.id, {
            product_devices: p.product_devices.map((d) =>
              d.id === item.deviceId ? { ...d, status: "sold" as const } : d
            ),
          });
        }
      }
    });

    // Update demo customer totals
    if (customerId) {
      const cust = demoCustomers.list().find((c) => c.id === customerId);
      if (cust) {
        demoCustomers.update(customerId, {
          total_purchased: cust.total_purchased + total,
          total_paid:      cust.total_paid      + paid,
          total_balance:   cust.total_balance   + balance,
          sale_count:      cust.sale_count      + 1,
        });
      }
    }
    return { id, receipt_number: receiptNum };
  }

  const { data, error } = await client().rpc("complete_sale", {
    target_business_id: businessId,
    target_customer_id: customerId,
    discount_amount:    discount,
    paid_amount:        paid,
    paid_method:        method,
    paid_reference:     reference,
    cart_items: cart.map((item) => ({
      product_id: item.product.id,
      quantity:   item.quantity,
      device_id:  item.deviceId ?? null,
    })),
  });
  if (error) throw error;
  return data as { id: string; receipt_number: string };
}

// ─── DUE DATE ─────────────────────────────────────────────────────────────────

export async function updateSaleDueDate(saleId: string, dueDate: string | null): Promise<void> {
  if (isDemo()) {
    const s = demoSales.list().find((x) => x.id === saleId);
    if (s) Object.assign(s, { due_date: dueDate });
    return;
  }
  const { error } = await client().from("sales").update({ due_date: dueDate }).eq("id", saleId);
  if (error) throw error;
}

// ─── VOID ─────────────────────────────────────────────────────────────────────

export async function voidSale(id: string, reason: string): Promise<void> {
  if (isDemo()) {
    const s = demoSales.list().find((x) => x.id === id);
    if (s) Object.assign(s, { sale_status: "voided" });
    return;
  }
  const { error } = await client().rpc("void_sale", { target_sale_id: id, void_reason: reason });
  if (error) throw error;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function cartTotal(cart: CartItem[], discount: number): number {
  return Math.max(0, cart.reduce((t, item) => t + item.product.selling_price * item.quantity, 0) - discount);
}

export { availableStock };
