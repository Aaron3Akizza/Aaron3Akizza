import React, { useState, useEffect } from "react";
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
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Check,
  AlertTriangle,
  ShoppingBag,
  Receipt,
  ShieldCheck,
  LayoutGrid,
  PlayCircle,
} from "lucide-react";
// NOTE: `Clock` was previously imported here but never used — removed
// during the Copilot-handoff stabilization pass (see docs/BIZFLOW-STATUS.md).

/* ---------------------------------- */
/* Small reusable building blocks     */
/* ---------------------------------- */

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600 border border-green-200">
      {children}
    </span>
  );
}

function Button({ children, variant = "primary", size = "md", className = "", href, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:opacity-50";
  const sizes = {
    sm: "px-3.5 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };
  const variants = {
    primary: "bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-200",
    secondary:
      "bg-white text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-gray-50",
    ghost: "text-gray-900 hover:bg-gray-100",
  };
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-6 hover:border-green-300 hover:shadow-[0_4px_20px_rgba(22,163,74,0.08)] transition-all duration-200">
      <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-green-600" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard({ label, value, trend, trendLabel, tone = "neutral" }) {
  const toneStyles = {
    positive: "text-green-600",
    warning: "text-amber-600",
    neutral: "text-gray-400",
  };
  return (
    <div className="rounded-xl bg-white border border-gray-100 p-4">
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      <p className="text-lg font-bold text-gray-900 mb-1">{value}</p>
      {trend && (
        <p className={`text-xs font-medium ${toneStyles[tone]}`}>{trend} {trendLabel}</p>
      )}
    </div>
  );
}

/* ---------------------------------- */
/* Navbar                             */
/* ---------------------------------- */

const NAV_LINKS = [
  { label: "Features", id: "features" },
  { label: "How it works", id: "how-it-works" },
  { label: "Pricing", id: "pricing" },
  { label: "About", id: "about" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const sections = NAV_LINKS.map((link) => document.getElementById(link.id)).filter(Boolean);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
              <TrendingUp className="h-[18px] w-[18px] text-white" strokeWidth={2.25} size={18} />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">BizFlow</span>
          </a>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => scrollToSection(e, link.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`px-3.5 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "text-green-600 font-semibold bg-green-50"
                      : "text-gray-600 font-medium hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button href="/login" variant="ghost" size="sm">
              Log in
            </Button>
            <Button href="/signup" size="sm">
              Start free trial
            </Button>
          </div>

          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-5 flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => scrollToSection(e, link.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`text-sm py-2.5 border-b border-gray-50 ${
                    isActive ? "text-green-600 font-semibold" : "text-gray-600 font-medium"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
            <div className="flex flex-col gap-2 pt-4">
              <Button href="/login" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Log in
              </Button>
              <Button href="/signup" size="sm" onClick={() => setOpen(false)}>
                Start free trial
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ---------------------------------- */
/* Dashboard preview (hero visual)    */
/* ---------------------------------- */

function DashboardPreview() {
  const sidebarItems = [
    { icon: LayoutGrid, label: "Dashboard", active: true },
    { icon: Receipt, label: "Sales" },
    { icon: Package, label: "Products" },
    { icon: Users, label: "Customers" },
    { icon: Wallet, label: "Expenses" },
    { icon: FileBarChart, label: "Reports" },
    { icon: UserCog, label: "Staff" },
    { icon: Settings, label: "Settings" },
  ];

  const chartData = [40, 55, 48, 65, 58, 72, 62];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxVal = Math.max(...chartData);

  const products = [
    { name: "Tecno Spark 30", qty: 42 },
    { name: "Samsung A15", qty: 31 },
    { name: "Itel P55", qty: 27 },
    { name: "Oraimo Charger", qty: 58 },
  ];

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-[0_20px_50px_rgba(17,24,39,0.08)] overflow-hidden">
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden sm:flex flex-col w-40 bg-gray-900 py-4 shrink-0">
          <div className="flex items-center gap-2 px-4 pb-4 mb-2 border-b border-gray-700">
            <div className="h-6 w-6 rounded-md bg-green-600 flex items-center justify-center">
              <TrendingUp className="text-white" size={13} strokeWidth={2.5} />
            </div>
            <span className="text-white text-sm font-bold">BizFlow</span>
          </div>
          <div className="flex flex-col gap-0.5 px-2">
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                  item.active
                    ? "bg-green-600 text-white"
                    : "text-gray-400"
                }`}
              >
                <item.icon size={14} strokeWidth={2} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 w-40 sm:w-52">
              <Search size={13} className="text-gray-400" />
              <span className="text-xs text-gray-400">Search</span>
            </div>
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-gray-400" />
              <div className="h-7 w-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-[10px] font-bold text-green-600">
                AK
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Dashboard</h3>
                <p className="text-xs text-gray-400">Overview of your business</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5">
                This week <ChevronDown size={12} />
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <StatCard label="Total sales" value="UGX 1,850,000" trend="+12.4%" trendLabel="vs last week" tone="positive" />
              <StatCard label="Total profit" value="UGX 420,000" trend="+8.1%" trendLabel="vs last week" tone="positive" />
              <StatCard label="Expenses" value="UGX 180,000" trend="Stable" trendLabel="" tone="neutral" />
              <StatCard label="Outstanding debt" value="UGX 3,240,000" trend="12 customers" trendLabel="owing" tone="warning" />
            </div>

            {/* Chart + top products */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-900 mb-3">Sales overview</p>
                <div className="flex items-end justify-between gap-2 h-24">
                  {chartData.map((val, i) => (
                    <div key={days[i]} className="flex-1 flex flex-col items-center gap-1.5">
                      <div
                        className="w-full rounded-md bg-green-600"
                        style={{ height: `${(val / maxVal) * 100}%`, minHeight: "10%" }}
                      />
                      <span className="text-[9px] text-gray-400 font-medium">{days[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-900 mb-3">Top selling products</p>
                <div className="flex flex-col gap-2.5">
                  {products.map((p) => (
                    <div key={p.name} className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-600 truncate pr-2">{p.name}</span>
                      <span className="text-[11px] font-semibold text-gray-900 shrink-0">{p.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom mini cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div className="rounded-xl border border-gray-100 p-3.5">
                <p className="text-[10px] text-gray-400 font-medium mb-1">Low stock items</p>
                <p className="text-sm font-bold text-amber-600">7 items</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3.5">
                <p className="text-[10px] text-gray-400 font-medium mb-1">Customers owing</p>
                <p className="text-sm font-bold text-amber-600">12 customers</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3.5">
                <p className="text-[10px] text-gray-400 font-medium mb-1">Today's sales</p>
                <p className="text-sm font-bold text-green-600">UGX 1,850,000</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3.5">
                <p className="text-[10px] text-gray-400 font-medium mb-1">Monthly projection</p>
                <p className="text-sm font-bold text-gray-900">UGX 14.2M</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- */
/* Hero                               */
/* ---------------------------------- */

function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <Badge>Built for small businesses</Badge>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold text-gray-900 leading-[1.1] tracking-tight">
            Run your business.
            <br />
            <span className="text-green-600">Grow your profit.</span>
          </h1>
          <p className="mt-5 text-base text-gray-500 leading-relaxed max-w-lg">
            BizFlow is the all-in-one operating system for small businesses. Manage
            sales, inventory, expenses, customers and reports — simple, smart, and powerful.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button href="/signup" size="lg">
              Start free trial <ArrowRight size={16} />
            </Button>
            <Button href="/login" size="lg" variant="secondary">
              <PlayCircle size={17} /> Log in
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-semibold text-gray-900">Free 14-day trial</p>
              <p className="text-xs text-gray-400 mt-0.5">No credit card required</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Secure & reliable</p>
              <p className="text-xs text-gray-400 mt-0.5">Your data is safe</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Local support</p>
              <p className="text-xs text-gray-400 mt-0.5">We're here to help</p>
            </div>
          </div>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}

/* ---------------------------------- */
/* Why businesses love BizFlow        */
/* ---------------------------------- */

function WhySection() {
  const features = [
    { icon: Receipt, title: "Manage sales easily", description: "Record sales in seconds. Track payments, credit and receipts." },
    { icon: Package, title: "Smart inventory", description: "Know what's in stock, what's running low, and what to restock." },
    { icon: Users, title: "Happy customers", description: "Track customer history, balances, and automated reminders." },
    { icon: FileBarChart, title: "Powerful reports", description: "See your profit, best sellers, expenses and growth in one place." },
  ];

  return (
    <section id="features" className="scroll-mt-20 bg-green-50 py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Why businesses love BizFlow
          </h2>
          <p className="mt-3 text-gray-500">
            Simple tools to help you save time, reduce stress, and make more money.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- */
/* How BizFlow works                  */
/* ---------------------------------- */

function HowItWorks() {
  const steps = [
    { title: "Add your business", description: "Set up your business profile in minutes — no technical skills required." },
    { title: "Start recording transactions", description: "Log sales, expenses and stock as they happen, from your phone or computer." },
    { title: "Understand and grow your business", description: "See clear reports on profit, debt and performance so you can make better decisions." },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center max-w-xl mx-auto mb-14">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">How BizFlow works</h2>
        <p className="mt-3 text-gray-500">Get up and running in three simple steps.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, i) => (
          <div key={step.title} className="relative">
            <div className="h-11 w-11 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-sm mb-4">
              {i + 1}
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">{step.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------- */
/* Business performance section       */
/* ---------------------------------- */

function BusinessPerformance() {
  const metrics = [
    { icon: Receipt, label: "Sales", value: "UGX 1.85M", tone: "positive" },
    { icon: TrendingUp, label: "Profit", value: "UGX 420K", tone: "positive" },
    { icon: Wallet, label: "Expenses", value: "UGX 180K", tone: "neutral" },
    { icon: Package, label: "Inventory", value: "312 items", tone: "neutral" },
    { icon: Users, label: "Customer debt", value: "UGX 3.24M", tone: "warning" },
    { icon: TrendingUp, label: "Growth", value: "+12.4%", tone: "positive" },
  ];

  const toneStyles = {
    positive: "text-green-600 bg-green-50",
    warning: "text-amber-600 bg-amber-50",
    neutral: "text-gray-500 bg-gray-50",
  };

  return (
    <section className="bg-gray-900 py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Turn daily activity into business clarity
          </h2>
          <p className="mt-3 text-gray-400">
            Every sale, expense and customer interaction feeds straight into insight you can act on.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl bg-gray-800 border border-gray-700 p-4">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-3 ${toneStyles[m.tone]}`}>
                <m.icon size={15} strokeWidth={2} />
              </div>
              <p className="text-xs text-gray-400 mb-1">{m.label}</p>
              <p className="text-sm font-bold text-white">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- */
/* Detailed feature grid              */
/* ---------------------------------- */

function FeatureGrid() {
  const features = [
    { icon: Receipt, title: "Sales management", description: "Record and track every sale with automatic receipts and totals." },
    { icon: Package, title: "Inventory management", description: "Stay on top of stock levels, restock alerts and product performance." },
    { icon: Users, title: "Customer management", description: "Keep a clear record of every customer and their purchase history." },
    { icon: AlertTriangle, title: "Debt tracking", description: "See who owes you, how much, and get reminded before it's overdue." },
    { icon: Wallet, title: "Expense tracking", description: "Log business expenses and understand where your money goes." },
    { icon: UserCog, title: "Staff management", description: "Manage staff accounts, roles and permissions in one place." },
    { icon: FileBarChart, title: "Reports", description: "Generate sales, profit and expense reports whenever you need them." },
    { icon: ShoppingBag, title: "Business analytics", description: "Understand trends and best sellers to plan your next move." },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center max-w-xl mx-auto mb-14">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
          Everything your business needs
        </h2>
        <p className="mt-3 text-gray-500">
          One system, built to cover the full picture of running a small business.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------- */
/* Pricing                            */
/* ---------------------------------- */

function PricingCard({ name, price, description, features, highlighted }) {
  return (
    <div
      className={`rounded-2xl p-7 flex flex-col ${
        highlighted
          ? "bg-gray-900 text-white shadow-[0_20px_50px_rgba(17,24,39,0.25)] scale-[1.03]"
          : "bg-white border border-gray-100 text-gray-900"
      }`}
    >
      {highlighted && (
        <span className="inline-block mb-4 text-[11px] font-semibold tracking-wide uppercase text-green-400">
          Most popular
        </span>
      )}
      <h3 className={`text-lg font-bold mb-1 ${highlighted ? "text-white" : "text-gray-900"}`}>{name}</h3>
      <p className={`text-sm mb-5 ${highlighted ? "text-gray-400" : "text-gray-500"}`}>{description}</p>
      <div className="mb-6">
        <span className="text-3xl font-extrabold">{price}</span>
        {price !== "Free" && <span className={`text-sm ${highlighted ? "text-gray-400" : "text-gray-500"}`}> /month</span>}
      </div>
      <ul className="flex flex-col gap-2.5 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check size={15} className={highlighted ? "text-green-400 mt-0.5 shrink-0" : "text-green-600 mt-0.5 shrink-0"} />
            <span className={highlighted ? "text-gray-200" : "text-gray-600"}>{f}</span>
          </li>
        ))}
      </ul>
      <Button href="/signup" variant={highlighted ? "primary" : "secondary"} className="w-full">
        Get started
      </Button>
    </div>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "Free",
      description: "For solo owners just getting started.",
      features: ["Up to 50 sales/month", "Basic inventory tracking", "1 staff account", "Email support"],
    },
    {
      name: "Business",
      price: "UGX 49,000",
      description: "For growing businesses with a team.",
      features: [
        "Unlimited sales",
        "Full inventory & debt tracking",
        "Up to 5 staff accounts",
        "Reports & analytics",
        "Priority support",
      ],
      highlighted: true,
    },
    {
      name: "Pro",
      price: "UGX 99,000",
      description: "For established businesses that need more.",
      features: [
        "Everything in Business",
        "Unlimited staff accounts",
        "Advanced analytics",
        "Multi-branch support",
        "Dedicated account manager",
      ],
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-20 bg-green-50 py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Simple, honest pricing
          </h2>
          <p className="mt-3 text-gray-500">Pick a plan that fits your business today. Change anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 md:gap-5 max-w-5xl mx-auto items-center">
          {plans.map((p) => (
            <PricingCard key={p.name} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- */
/* Final CTA                          */
/* ---------------------------------- */

function FinalCTA() {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <div className="rounded-2xl bg-green-600 px-8 py-14 sm:px-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Your business deserves better tools.
        </h2>
        <p className="mt-3 text-green-50 max-w-lg mx-auto">
          Start managing your business with clarity today.
        </p>
        <Button
          href="/signup"
          size="lg"
          variant="secondary"
          className="mt-8 border-0 hover:bg-gray-50"
          style={{ backgroundColor: "#ffffff", color: "#16A34A" }}
        >
          Start free trial <ArrowRight size={16} />
        </Button>
      </div>
    </section>
  );
}

/* ---------------------------------- */
/* Footer                             */
/* ---------------------------------- */

function Footer() {
  const columns = [
    {
      title: "Product",
      links: ["Features", "Pricing", "Security", "Updates"],
    },
    {
      title: "Company",
      links: ["About", "Blog", "Careers", "Contact"],
    },
    {
      title: "Support",
      links: ["Help center", "Getting started", "Community", "Status"],
    },
  ];

  return (
    <footer id="about" className="scroll-mt-20 border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.25} />
              </div>
              <span className="text-lg font-bold text-gray-900">BizFlow</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              The all-in-one operating system for small businesses. Know your sales.
              Know your stock. Know your business.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-gray-900 mb-3.5">{col.title}</h4>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3.5">Social</h4>
            <ul className="flex flex-col gap-2.5">
              {["Twitter", "LinkedIn", "Facebook", "Instagram"].map((s) => (
                <li key={s}>
                  <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© 2026 BizFlow. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ShieldCheck size={13} /> Built for small businesses in Uganda
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------------------------------- */
/* Page                               */
/* ---------------------------------- */

export default function BizFlowLanding() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar />
      <Hero />
      <WhySection />
      <HowItWorks />
      <BusinessPerformance />
      <FeatureGrid />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
