import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth, useBusiness } from "../context/AuthContext";
import ProductsPage from "./ProductsPage";
import { SalesHistoryPage } from "./SalesPage";
import DashboardPage from "./DashboardPage";
import CustomersPage from "./CustomersPage";
import ExpensesPage from "./ExpensesPage";
import ReportsPage from "./ReportsPage";
import StaffPage from "./StaffPage";
import SettingsPage from "./SettingsPage";
import {
  TrendingUp,
  Package,
  Users,
  Wallet,
  FileBarChart,
  UserCog,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  LayoutGrid,
  LogOut,
  HelpCircle,
  Receipt,
} from "lucide-react";

/* =========================================================
   MODULE REGISTRY
   ========================================================= */

const MODULES = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "sales",     label: "Sales",     icon: Receipt    },
  { id: "products",  label: "Products",  icon: Package    },
  { id: "customers", label: "Customers", icon: Users      },
  { id: "expenses",  label: "Expenses",  icon: Wallet     },
  { id: "reports",   label: "Reports",   icon: FileBarChart },
  { id: "staff",     label: "Staff",     icon: UserCog    },
  { id: "settings",  label: "Settings",  icon: Settings   },
];

const TITLES = {
  dashboard: "Dashboard",
  sales:     "Sales",
  products:  "Products",
  customers: "Customers",
  expenses:  "Expenses",
  reports:   "Reports",
  staff:     "Staff",
  settings:  "Settings",
};

/* =========================================================
   SIDEBAR
   ========================================================= */

function Sidebar({ active, onSelect, mobileOpen, onCloseMobile, user, business, role, onSignOut }) {
  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-800 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
          <TrendingUp className="text-white" strokeWidth={2.25} size={18} />
        </div>
        <span className="text-white text-base font-bold tracking-tight">BizFlow</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {MODULES.map((m) => {
          const isActive = active === m.id;
          return (
            <button
              key={m.id}
              onClick={() => { onSelect(m.id); onCloseMobile(); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left w-full ${
                isActive
                  ? "bg-green-600 text-white font-semibold"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <m.icon size={17} strokeWidth={2} />
              {m.label}
            </button>
          );
        })}
      </nav>

      {/* Footer — user info + sign out */}
      <div className="px-3 py-4 border-t border-gray-800 flex flex-col gap-1 shrink-0">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full">
          <HelpCircle size={17} strokeWidth={2} />
          Help / support
        </button>
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="h-8 w-8 rounded-full bg-green-600/20 border border-green-600/40 flex items-center justify-center text-xs font-bold text-green-400 shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <p className="text-[11px] text-gray-500 truncate capitalize">
              {role || "Member"}{business?.name ? ` · ${business.name}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full"
        >
          <LogOut size={17} strokeWidth={2} />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-gray-900 shrink-0 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <aside className="relative w-64 bg-gray-900 h-full">
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

/* =========================================================
   TOPBAR
   ========================================================= */

function TopBar({ title, onOpenMobile, user }) {
  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center justify-between h-16 px-5 lg:px-8 border-b border-gray-100 bg-white sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden text-gray-600"
          onClick={onOpenMobile}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-bold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 w-56 border border-gray-100">
          <Search size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400">Search products, customers...</span>
        </div>
        <Bell size={18} className="text-gray-400" aria-label="Notifications" />
        <div
          className="h-8 w-8 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-xs font-bold text-green-600"
          aria-label="Your account"
        >
          {initials}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ROOT SHELL
   ========================================================= */

export default function BizFlowApp() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { business, role } = useBusiness();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active module from the URL path segment after /app/
  const activeModule = location.pathname.split("/")[2] || "dashboard";

  const selectModule = (module) => {
    navigate(module === "dashboard" ? "/app" : `/app/${module}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  // Guard: business must be loaded before rendering any module
  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        Loading your workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans antialiased">
      <Sidebar
        active={activeModule}
        onSelect={selectModule}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        user={user}
        business={business}
        role={role}
        onSignOut={handleSignOut}
      />
      <div className="flex-1 min-w-0">
        <TopBar
          title={TITLES[activeModule] ?? "BizFlow"}
          onOpenMobile={() => setMobileOpen(true)}
          user={user}
        />
        {activeModule === "dashboard" && <DashboardPage businessId={business.id} />}
        {activeModule === "sales"     && <SalesHistoryPage businessId={business.id} role={role} />}
        {activeModule === "products"  && <ProductsPage businessId={business.id} role={role} />}
        {activeModule === "customers" && <CustomersPage businessId={business.id} role={role} />}
        {activeModule === "expenses"  && <ExpensesPage businessId={business.id} role={role} />}
        {activeModule === "reports"   && <ReportsPage businessId={business.id} role={role} />}
        {activeModule === "staff"     && <StaffPage businessId={business.id} role={role} />}
        {activeModule === "settings"  && <SettingsPage role={role} />}
      </div>
    </div>
  );
}
