import { supabase } from "./supabase";
import { demoExpenses, DEMO_BUSINESS_ID } from "./demo";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

const isDemo = () => !supabase;
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export const EXPENSE_CATEGORIES = [
  "Rent", "Electricity", "Transport", "Airtime", "Internet",
  "Salaries", "Repairs", "Packaging", "Stock purchase", "Bank charges", "Marketing", "Other",
];

export type Expense = {
  id: string; business_id: string; category: string; amount: number;
  description: string | null; expense_date: string; recorded_by: string; created_at: string;
};

export async function listExpenses(businessId: string, from?: string, to?: string): Promise<Expense[]> {
  if (isDemo()) {
    return demoExpenses.list().filter((e) => {
      const inFrom = !from || e.expense_date >= from;
      const inTo = !to || e.expense_date <= to;
      return inFrom && inTo;
    }).sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }
  let query = client().from("expenses").select("*").eq("business_id", businessId).order("expense_date", { ascending: false }).limit(200);
  if (from) query = query.gte("expense_date", from);
  if (to) query = query.lte("expense_date", to);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function createExpense(
  businessId: string,
  expense: { category: string; amount: number; description?: string; expense_date: string }
): Promise<Expense> {
  if (isDemo()) {
    const e: Expense = {
      id: "exp-" + uid(), business_id: businessId, category: expense.category,
      amount: expense.amount, description: expense.description?.trim() || null,
      expense_date: expense.expense_date, recorded_by: DEMO_BUSINESS_ID,
      created_at: new Date().toISOString(),
    };
    demoExpenses.add(e);
    return e;
  }
  const db = client();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await db.from("expenses").insert({
    business_id: businessId, category: expense.category, amount: expense.amount,
    description: expense.description?.trim() || null, expense_date: expense.expense_date,
    recorded_by: user.id,
  }).select().single();
  if (error) throw error;
  return data as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  if (isDemo()) { demoExpenses.remove(id); return; }
  const { error } = await client().from("expenses").delete().eq("id", id);
  if (error) throw error;
}
