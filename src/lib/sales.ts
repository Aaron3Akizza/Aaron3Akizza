import { Product, availableStock } from "./inventory";
import { supabase } from "./supabase";
import { demoSales, demoCustomers, demoProducts, DEMO_BUSINESS_ID } from "./demo";

export type CartItem = { product: Product; quantity: number; deviceId?: string };
export type Sale = {
  id: string; receipt_number: string; customer_id: string | null;
  subtotal: number; discount: number; total: number; amount_paid: number;
  balance: number; cost_of_goods: number; gross_profit: number;
  payment_status: "paid" | "partial" | "credit";
  sale_status: "completed" | "voided" | "refunded";
  sold_by: string; due_date: string | null; created_at: string;
};
export type Customer = { id: string; full_name: string; phone: string | null };

const isDemo = () => !supabase;
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function listSales(businessId: string): Promise<Sale[]> {
  if (isDemo()) return [...demoSales.list()].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
  const { data, error } = await client().from("sales").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).range(0, 49);
  if (error) throw error;
  return (data ?? []) as Sale[];
}

export async function getSale(id: string): Promise<any> {
  if (isDemo()) {
    const sale = demoSales.list().find((s) => s.id === id);
    if (!sale) throw new Error("Sale not found");
    const customer = sale.customer_id ? demoCustomers.list().find((c) => c.id === sale.customer_id) : null;
    return {
      ...sale,
      customers: customer ? { full_name: customer.full_name } : null,
      sale_items: [
        { id: uid(), product_name_snapshot: "Demo Product", quantity: 1, unit_price: sale.total + sale.discount, unit_cost: sale.cost_of_goods, subtotal: sale.total + sale.discount, profit: sale.gross_profit, device_id: null, device_imei: null },
      ],
      payments: [],
    };
  }
  const { data, error } = await client().from("sales").select("*, sale_items(*), payments(*), customers(full_name)").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function listCustomers(businessId: string): Promise<Customer[]> {
  if (isDemo()) return demoCustomers.list().map((c) => ({ id: c.id, full_name: c.full_name, phone: c.phone }));
  const { data, error } = await client().from("customers").select("id, full_name, phone").eq("business_id", businessId).order("full_name").range(0, 99);
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function createCustomer(businessId: string, fullName: string, phone: string): Promise<Customer> {
  if (isDemo()) {
    const c = { id: "cust-" + uid(), full_name: fullName.trim(), phone: phone.trim() || null };
    demoCustomers.add({ ...c, business_id: businessId, email: null, notes: null, created_at: new Date().toISOString(), total_purchased: 0, total_paid: 0, total_balance: 0, sale_count: 0 });
    return c;
  }
  const { data, error } = await client().from("customers").insert({ business_id: businessId, full_name: fullName.trim(), phone: phone.trim() || null }).select("id, full_name, phone").single();
  if (error) throw error;
  return data as Customer;
}

export async function completeSale(
  businessId: string, customerId: string | null, discount: number,
  paid: number, method: string, reference: string, cart: CartItem[]
): Promise<{ id: string; receipt_number: string }> {
  if (isDemo()) {
    const subtotal = cart.reduce((s, item) => s + item.product.selling_price * item.quantity, 0);
    const total = Math.max(0, subtotal - discount);
    const balance = Math.max(0, total - paid);
    const costOfGoods = cart.reduce((s, item) => s + item.product.buying_price * item.quantity, 0);
    const id = "sale-" + uid();
    const receiptNumber = "BF-2026-" + String(demoSales.list().length + 1).padStart(6, "0");
    const sale: Sale = {
      id, receipt_number: receiptNumber, customer_id: customerId,
      subtotal, discount, total, amount_paid: paid, balance,
      cost_of_goods: costOfGoods, gross_profit: total - costOfGoods,
      payment_status: balance === 0 ? "paid" : paid === 0 ? "credit" : "partial",
      sale_status: "completed", sold_by: DEMO_BUSINESS_ID, due_date: null,
      created_at: new Date().toISOString(),
    };
    demoSales.add(sale);
    // Deduct stock from demo products
    cart.forEach((item) => {
      if (item.product.inventory_type === "quantity") {
        demoProducts.update(item.product.id, { quantity: Math.max(0, item.product.quantity - item.quantity) });
      } else if (item.deviceId) {
        const p = demoProducts.list().find((x) => x.id === item.product.id);
        if (p && p.product_devices) {
          demoProducts.update(p.id, {
            product_devices: p.product_devices.map((d) =>
              d.id === item.deviceId ? { ...d, status: "sold" as const } : d
            ),
          });
        }
      }
    });
    // Update customer totals
    if (customerId) {
      const cust = demoCustomers.list().find((c) => c.id === customerId);
      if (cust) {
        demoCustomers.update(customerId, {
          total_purchased: cust.total_purchased + total,
          total_paid: cust.total_paid + paid,
          total_balance: cust.total_balance + balance,
          sale_count: cust.sale_count + 1,
        });
      }
    }
    return { id, receipt_number: receiptNumber };
  }
  const { data, error } = await client().rpc("complete_sale", {
    target_business_id: businessId, target_customer_id: customerId,
    discount_amount: discount, paid_amount: paid, paid_method: method,
    paid_reference: reference,
    cart_items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity, device_id: item.deviceId ?? null })),
  });
  if (error) throw error;
  return data as { id: string; receipt_number: string };
}

export async function updateSaleDueDate(saleId: string, dueDate: string | null): Promise<void> {
  if (isDemo()) {
    const s = demoSales.list().find((x) => x.id === saleId);
    if (s) Object.assign(s, { due_date: dueDate });
    return;
  }
  const { error } = await client().from("sales").update({ due_date: dueDate }).eq("id", saleId);
  if (error) throw error;
}

export function cartTotal(cart: CartItem[], discount: number): number {
  return Math.max(0, cart.reduce((total, item) => total + item.product.selling_price * item.quantity, 0) - discount);
}

export { availableStock };

export async function voidSale(id: string, reason: string): Promise<void> {
  if (isDemo()) {
    const s = demoSales.list().find((x) => x.id === id);
    if (s) Object.assign(s, { sale_status: "voided" });
    return;
  }
  const { error } = await client().rpc("void_sale", { target_sale_id: id, void_reason: reason });
  if (error) throw error;
}
