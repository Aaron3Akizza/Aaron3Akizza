import { supabase } from "./supabase";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus = "trial" | "active" | "suspended" | "cancelled";

export type BusinessRow = {
  id: string;
  name: string;
  owner_email: string;
  owner_name: string;
  phone: string | null;
  location: string | null;
  currency: string;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  max_staff_accounts: number;
  staff_count: number;
  sale_count: number;
  notes: string | null;
  created_at: string;
  suspended_at: string | null;
  suspended_reason: string | null;
};

export type PlatformStats = {
  total_businesses: number;
  active_businesses: number;
  trial_businesses: number;
  suspended_businesses: number;
  total_users: number;
  total_sales: number;
  total_revenue: number;
  total_products: number;
  new_businesses_this_month: number;
};

// ─── Check if current user is platform admin ──────────────────────────────────

export async function checkIsPlatformAdmin(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await client()
      .from("platform_admins")
      .select("user_id")
      .limit(1);
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

// ─── Platform stats ───────────────────────────────────────────────────────────

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await client().rpc("get_platform_stats");
  if (error) throw error;
  return data as PlatformStats;
}

// ─── All businesses (paginated) ───────────────────────────────────────────────

export async function getAllBusinesses(
  opts: {
    limit?: number;
    offset?: number;
    status?: SubscriptionStatus | null;
  } = {}
): Promise<BusinessRow[]> {
  const { data, error } = await client().rpc("get_all_businesses", {
    p_limit:  opts.limit  ?? 50,
    p_offset: opts.offset ?? 0,
    p_status: opts.status ?? null,
  });
  if (error) throw error;
  return (data ?? []) as BusinessRow[];
}

// ─── Update subscription ──────────────────────────────────────────────────────

export async function updateSubscription(
  businessId: string,
  status: SubscriptionStatus,
  opts: {
    expiresAt?:     string | null;
    maxStaff?:      number | null;
    note?:          string | null;
    suspendReason?: string | null;
  } = {}
): Promise<void> {
  const { error } = await client().rpc("update_business_subscription", {
    target_business_id: businessId,
    new_status:         status,
    new_expires_at:     opts.expiresAt     ?? null,
    new_max_staff:      opts.maxStaff      ?? null,
    admin_note:         opts.note          ?? null,
    suspend_reason:     opts.suspendReason ?? null,
  });
  if (error) throw error;
}
