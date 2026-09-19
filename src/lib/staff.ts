import { supabase } from "./supabase";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export type StaffMember = {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
};

export async function listStaff(businessId: string): Promise<StaffMember[]> {
  const db = client();
  const { data, error } = await db
    .from("business_members")
    .select("id, user_id, role, is_active, created_at, profiles(full_name, phone)")
    .eq("business_id", businessId)
    .order("created_at");

  if (error) throw error;

  // We need emails from auth.users — only available through profiles join or admin.
  // Profiles stores full_name and phone from the trigger. We display what we have.
  return (data ?? []).map((m: any) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      is_active: m.is_active,
      created_at: m.created_at,
      full_name: profile?.full_name ?? "Unknown",
      email: "",
      phone: profile?.phone ?? null,
    };
  });
}

export async function updateMemberRole(memberId: string, role: string): Promise<void> {
  const db = client();
  const { error } = await db
    .from("business_members")
    .update({ role })
    .eq("id", memberId);
  if (error) throw error;
}

export async function deactivateMember(memberId: string): Promise<void> {
  const db = client();
  const { error } = await db
    .from("business_members")
    .update({ is_active: false })
    .eq("id", memberId);
  if (error) throw error;
}

export async function reactivateMember(memberId: string): Promise<void> {
  const db = client();
  const { error } = await db
    .from("business_members")
    .update({ is_active: true })
    .eq("id", memberId);
  if (error) throw error;
}

/**
 * Invite a user by email — this creates an auth invite via Supabase Admin API.
 * Since we only have the anon key on the client, we call a Supabase Edge Function
 * or fallback to signUp with a magic link approach.
 *
 * The practical approach for now: create the business_members row after the
 * invited user signs up. This function records a pending invite note.
 */
export async function inviteStaff(
  businessId: string,
  email: string,
  role: string
): Promise<void> {
  const db = client();
  // Use Supabase's built-in invite (requires service role on backend — use Edge Function in prod)
  // On the client with anon key, signInWithOtp acts as magic link
  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/app/setup`,
      data: { invited_business_id: businessId, invited_role: role },
    },
  });
  if (error) throw error;
}
