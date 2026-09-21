import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import LandingPage from "./pages/LandingPage";
import BizFlowApp from "./pages/AppShell";
import { AuthPage, SetupPage } from "./pages/AuthPage";
import { useAuth, useBusiness } from "./context/AuthContext";
import { NewSalePage } from "./pages/SalesPage";

function LoadingScreen() {
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">Loading BizFlow...</div>;
}

function ProtectedRoute({ children, setup = false }: { children: ReactNode; setup?: boolean }) {
  const { session, membership, loading, isDemo } = useAuth();
  if (loading) return <LoadingScreen />;
  // Demo mode — always allow access
  if (isDemo) return <>{children}</>;
  if (!session) return <Navigate to="/login" replace />;
  if (!setup && !membership) return <Navigate to="/app/setup" replace />;
  return <>{children}</>;
}

function PublicRoute() {
  const { session, membership, loading, isDemo } = useAuth();
  if (loading) return <LoadingScreen />;
  // In demo mode — skip login, go straight to the app
  if (isDemo) return <Navigate to="/app" replace />;
  if (session) return <Navigate to={membership ? "/app" : "/app/setup"} replace />;
  return <AuthPage />;
}

function NewSaleRoute() {
  const { business } = useBusiness();
  if (!business) return <LoadingScreen />;
  return <NewSalePage businessId={business.id} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute />} />
        <Route path="/signup" element={<PublicRoute />} />
        <Route path="/app/setup" element={<ProtectedRoute setup><SetupPage /></ProtectedRoute>} />
        <Route path="/app/sales/new" element={<ProtectedRoute><NewSaleRoute /></ProtectedRoute>} />
        <Route path="/app/*" element={<ProtectedRoute><BizFlowApp /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
