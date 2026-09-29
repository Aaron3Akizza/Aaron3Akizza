/**
 * AdminContext — tracks whether the current logged-in user is a platform admin.
 *
 * Checks the platform_admins table in Supabase.
 * This is checked server-side (RLS enforced) — the check cannot be spoofed
 * by manipulating client-side state.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { checkIsPlatformAdmin } from "../lib/admin";

type AdminContextValue = {
  isAdmin:      boolean;
  adminLoading: boolean;
};

const AdminContext = createContext<AdminContextValue>({ isAdmin: false, adminLoading: true });

export function AdminProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading, isDemo } = useAuth();
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    // No session or demo mode — definitely not an admin
    if (authLoading) return;
    if (!session || isDemo) {
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }

    setAdminLoading(true);
    checkIsPlatformAdmin()
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false))
      .finally(() => setAdminLoading(false));
  }, [session, authLoading, isDemo]);

  return (
    <AdminContext.Provider value={{ isAdmin, adminLoading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
