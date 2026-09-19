import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Business = {
  id: string;
  name: string;
  owner_id: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  currency: string;
};

type BusinessMembership = {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  business: Business;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  membership: BusinessMembership | null;
  loading: boolean;
  configured: boolean;
  refreshBusiness: () => Promise<void>;
  createBusiness: (details: {
    name: string;
    phone: string;
    email: string;
    location: string;
    currency: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<BusinessMembership | null>(null);
  const [loading, setLoading] = useState(true);
  // Track whether the membership fetch for the current session is complete
  const [membershipLoaded, setMembershipLoaded] = useState(false);

  const refreshBusiness = async () => {
    if (!supabase || !session?.user) {
      setMembership(null);
      return;
    }

    const { data, error } = await supabase
      .from("business_members")
      .select("id, business_id, user_id, role, businesses(id, name, owner_id, phone, email, location, currency)")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    const business = Array.isArray(data?.businesses) ? data.businesses[0] : data?.businesses;
    setMembership(data && business ? { ...data, business } as BusinessMembership : null);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setMembershipLoaded(true);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      // If no session, nothing to fetch — mark loading done immediately
      if (!data.session) {
        setMembershipLoaded(true);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setMembership(null);
        setMembershipLoaded(true);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setMembership(null);
      setMembershipLoaded(true);
      return;
    }
    setMembershipLoaded(false);
    refreshBusiness()
      .catch(() => setMembership(null))
      .finally(() => {
        setMembershipLoaded(true);
        setLoading(false);
      });
  }, [session]);

  const createBusiness = async (details: {
    name: string;
    phone: string;
    email: string;
    location: string;
    currency: string;
  }) => {
    if (!supabase || !session?.user) throw new Error("You must be signed in to create a business.");
    const { data: businessId, error } = await supabase.rpc("create_business_for_current_user", {
      business_name: details.name,
      business_phone: details.phone || null,
      business_email: details.email || null,
      business_location: details.location || null,
      business_currency: details.currency,
    });
    if (error) throw error;
    if (!businessId) throw new Error("Business was created without an ID.");
    const { data: membershipData, error: membershipError } = await supabase
      .from("business_members")
      .select("id, business_id, user_id, role, businesses(id, name, owner_id, phone, email, location, currency)")
      .eq("user_id", session.user.id)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (membershipError || !membershipData) throw membershipError ?? new Error("Business membership was not created.");
    const business = Array.isArray(membershipData.businesses) ? membershipData.businesses[0] : membershipData.businesses;
    if (!business) throw new Error("Business membership was created without a business record.");
    setMembership({ ...membershipData, business } as BusinessMembership);
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        membership,
        loading: loading || !membershipLoaded,
        configured: isSupabaseConfigured,
        refreshBusiness,
        createBusiness,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function useBusiness() {
  const { membership } = useAuth();
  return { business: membership?.business ?? null, role: membership?.role ?? null };
}
