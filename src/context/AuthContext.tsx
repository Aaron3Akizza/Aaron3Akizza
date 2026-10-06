import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { DEMO_MEMBERSHIP, DEMO_USER } from "../lib/demo";

type Business = {
  id: string; name: string; owner_id: string;
  phone: string | null; email: string | null;
  location: string | null; currency: string;
};

type BusinessMembership = {
  id: string; business_id: string; user_id: string;
  role: string; business: Business;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  membership: BusinessMembership | null;
  loading: boolean;
  configured: boolean;
  isDemo: boolean;
  refreshBusiness: () => Promise<void>;
  createBusiness: (details: { name: string; phone: string; email: string; location: string; currency: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<BusinessMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [membershipLoaded, setMembershipLoaded] = useState(false);

  // Demo mode = Supabase not configured
  const isDemo = !isSupabaseConfigured;

  // ── Demo mode — skip all Supabase calls ────────────────────────────────────
  useEffect(() => {
    if (!isDemo) return;
    setMembership(DEMO_MEMBERSHIP as BusinessMembership);
    setMembershipLoaded(true);
    setLoading(false);
  }, [isDemo]);

  // ── Real Supabase mode ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo || !supabase) {
      if (!isDemo) { setLoading(false); setMembershipLoaded(true); }
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (!data.session) { setMembershipLoaded(true); setLoading(false); }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) { setMembership(null); setMembershipLoaded(true); }
    });

    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [isDemo]);

  const refreshBusiness = async () => {
    if (isDemo) return;
    if (!supabase) { setMembership(null); return; }

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user) { setMembership(null); return; }

    // Use limit(1) + array access instead of maybeSingle() to avoid
    // "multiple rows" errors if a user somehow has duplicate memberships
    const { data, error } = await supabase
      .from("business_members")
      .select("id, business_id, user_id, role, businesses(id, name, owner_id, phone, email, location, currency)")
      .eq("user_id", currentSession.user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) throw error;

    const row = data?.[0] ?? null;
    if (!row) { setMembership(null); return; }

    const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
    if (!business) { setMembership(null); return; }

    setMembership({ ...row, business } as BusinessMembership);
  };

  useEffect(() => {
    if (isDemo || !session) {
      if (!isDemo) { setMembership(null); setMembershipLoaded(true); }
      return;
    }
    setMembershipLoaded(false);
    refreshBusiness()
      .catch(() => setMembership(null))
      .finally(() => { setMembershipLoaded(true); setLoading(false); });
  }, [session]);

  const createBusiness = async (details: { name: string; phone: string; email: string; location: string; currency: string }) => {
    if (isDemo) return;
    if (!supabase || !session?.user) throw new Error("You must be signed in to create a business.");

    const { data: businessId, error } = await supabase.rpc("create_business_for_current_user", {
      business_name: details.name,
      business_phone: details.phone || null,
      business_email: details.email || null,
      business_location: details.location || null,
      business_currency: details.currency,
    });

    if (error) {
      // If the user already has a business (duplicate), just load the existing one
      if (error.message?.toLowerCase().includes("duplicate") ||
          error.message?.toLowerCase().includes("unique") ||
          error.code === "23505") {
        await refreshBusiness();
        return;
      }
      throw error;
    }

    if (!businessId) throw new Error("Business was created without an ID.");

    // Use refreshBusiness to load membership — it handles all edge cases cleanly
    await refreshBusiness();
  };

  const signOut = async () => {
    if (isDemo) return;
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user: isDemo ? (DEMO_USER as unknown as User) : (session?.user ?? null),
      session,
      membership,
      loading: loading || !membershipLoaded,
      configured: isSupabaseConfigured,
      isDemo,
      refreshBusiness,
      createBusiness,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useBusiness() {
  const { membership } = useAuth();
  return { business: membership?.business ?? null, role: membership?.role ?? null };
}
