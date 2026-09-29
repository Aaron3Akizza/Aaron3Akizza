import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { type ReactNode, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import BizFlowApp from "./pages/AppShell";
import { AuthPage, SetupPage } from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ResendConfirmationPage from "./pages/ResendConfirmationPage";
import AdminPage from "./pages/AdminPage";
import { useAuth, useBusiness } from "./context/AuthContext";
import { useAdmin } from "./context/AdminContext";
import { NewSalePage } from "./pages/SalesPage";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
      Loading BizFlow...
    </div>
  );
}

function ProtectedRoute({ children, setup = false }: { children: ReactNode; setup?: boolean }) {
  const { session, membership, loading, isDemo, refreshBusiness } = useAuth();

  useEffect(() => {
    // If logged in but no membership found, try refreshing once more
    // This handles the case where the business was just created
    if (!loading && session && !membership && !setup && !isDemo) {
      refreshBusiness().catch(() => undefined);
    }
  }, [loading, session, membership, setup, isDemo]);

  if (loading) return <LoadingScreen />;
  if (isDemo) return <>{children}</>;
  if (!session) return <Navigate to="/login" replace />;
  if (!setup && !membership) return <Navigate to="/app/setup" replace />;
  return <>{children}</>;
}

function PublicRoute() {
  const { session, membership, loading, isDemo } = useAuth();
  if (loading) return <LoadingScreen />;
  // Real Supabase mode — redirect already-logged-in users
  if (!isDemo && session) {
    return <Navigate to={membership ? "/app" : "/app/setup"} replace />;
  }
  // Demo mode OR not logged in — show the auth page normally
  return <AuthPage />;
}

function NewSaleRoute() {
  const { business } = useBusiness();
  if (!business) return <LoadingScreen />;
  return <NewSalePage businessId={business.id} />;
}

/**
 * AdminRoute — only platform admins can access this.
 * Non-admins are redirected to /login (unauthenticated) or /app (authenticated non-admin).
 * The admin check is done against the Supabase platform_admins table — cannot be bypassed.
 */
function AdminRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, adminLoading }          = useAdmin();

  if (authLoading || adminLoading) return <LoadingScreen />;
  if (!session)  return <Navigate to="/login" replace />;
  if (!isAdmin)  return <Navigate to="/app"   replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page — always public, always shows first */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth routes */}
        <Route path="/login"  element={<PublicRoute />} />
        <Route path="/signup" element={<PublicRoute />} />

        {/* Auth callback — Supabase redirects here after email confirmation / password reset */}
        <Route path="/auth/callback"       element={<AuthCallbackPage />} />
        <Route path="/resend-confirmation" element={<ResendConfirmationPage />} />

        {/* Admin — platform administrators only */}
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* App routes — protected */}
        <Route path="/app/setup"     element={<ProtectedRoute setup><SetupPage /></ProtectedRoute>} />
        <Route path="/app/sales/new" element={<ProtectedRoute><NewSaleRoute /></ProtectedRoute>} />
        <Route path="/app/*"         element={<ProtectedRoute><BizFlowApp /></ProtectedRoute>} />

        {/* Catch-all → landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
