import { Product, availableStock } from "./inventory";
import { supabase } from "./supabase";

export type CartItem = { product: Product; quantity: number; deviceId?: string };
export type Sale = { id: string; receipt_number: string; customer_id: string | null; subtotal: number; discount: number; total: number; amount_paid: number; balance: number; cost_of_goods: number; gross_profit: number; payment_status: "paid" | "partial" | "credit"; sale_status: "completed" | "voided" | "refunded"; sold_by: string; due_date: string | null; created_at: string };
export type Customer = { id: string; full_name: string; phone: string | null };

function client() { if (!supabase) throw new Error("Supabase is not configured."); return supabase; }
export async function listSales(businessId: string) { const { data, error } = await client().from("sales").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).range(0, 49); if (error) throw error; return (data ?? []) as Sale[]; }
export async function getSale(id: string) { const { data, error } = await client().from("sales").select("*, sale_items(*), payments(*)").eq("id", id).single(); if (error) throw error; return data; }
export async function listCustomers(businessId: string) { const { data, error } = await client().from("customers").select("id, full_name, phone").eq("business_id", businessId).order("full_name").range(0, 99); if (error) throw error; return (data ?? []) as Customer[]; }
export async function createCustomer(businessId: string, fullName: string, phone: string) { const { data, error } = await client().from("customers").insert({ business_id: businessId, full_name: fullName.trim(), phone: phone.trim() || null }).select("id, full_name, phone").single(); if (error) throw error; return data as Customer; }
export async function completeSale(businessId: string, customerId: string | null, discount: number, paid: number, method: string, reference: string, cart: CartItem[]) { const { data, error } = await client().rpc("complete_sale", { target_business_id: businessId, target_customer_id: customerId, discount_amount: discount, paid_amount: paid, paid_method: method, paid_reference: reference, cart_items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity, device_id: item.deviceId ?? null })) }); if (error) throw error; return data as { id: string; receipt_number: string }; }
export async function updateSaleDueDate(saleId: string, dueDate: string | null): Promise<void> {
  const { error } = await client().from("sales").update({ due_date: dueDate }).eq("id", saleId);
  if (error) throw error;
}
export function cartTotal(cart: CartItem[], discount: number) { return Math.max(0, cart.reduce((total, item) => total + item.product.selling_price * item.quantity, 0) - discount); }
export { availableStock };
export async function voidSale(id: string, reason: string) { const { error } = await client().rpc("void_sale", { target_sale_id: id, void_reason: reason }); if (error) throw error; }
