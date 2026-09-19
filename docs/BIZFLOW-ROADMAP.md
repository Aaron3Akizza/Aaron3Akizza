# BizFlow — Development Roadmap

This roadmap sequences the remaining work. Each phase should be tested,
checked for regressions, and confirmed responsive before moving to the next.
Status markers reflect reality as of this handoff — update them as work
lands (they should stay in sync with `docs/BIZFLOW-STATUS.md`).

## Phase 1 — Foundation
**Status: partially done (frontend-only)**

- [x] Application shell (sidebar, top bar, routing skeleton) — `src/pages/AppShell.jsx`
- [x] Login / signup / business setup screens (UI only, no real auth)
- [ ] Real authentication (sign up, log in, log out, reset password) backed by `users`
- [ ] Real business creation backed by `businesses` + `business_members`
- [ ] Database foundation — apply `db/bizflow_schema.sql` to an actual database
- [ ] Route-based navigation inside `/app/*` (currently local `useState`, not URL-driven)

## Phase 2 — Products
**Status: partially done (frontend-only)**

- [x] Products table UI with search/category filter — `ProductsScreen` in `AppShell.jsx`
- [x] Add-product modal with quantity-vs-device tracking toggle
- [x] IMEI display for device-tracked products (expandable row, sample data)
- [ ] Real product CRUD against `products` table
- [ ] Real `product_devices` CRUD (add/edit individual IMEI units)
- [ ] Real `stock_movements` writes on every inventory change
- [ ] Low-stock calculation from real data (currently hardcoded sample comparison)

## Phase 3 — Sales
**Status: implemented in code; live Supabase verification pending**

- [x] New sale flow: search → select product → quantity/IMEI → customer → payment → complete
- [x] IMEI selection UI for device-tracked products at point of sale
- [x] Payments (cash, mobile money, bank, card, credit)
- [x] Credit sales with partial payment and balance tracking
- [x] Receipt confirmation with print action
- [x] Atomic stock deduction and `stock_movements` write on sale completion
- [ ] Live Supabase verification of checkout, RLS, concurrency, and voiding

## Phase 4 — Customers
**Status: not started**

- [ ] Customer list and profile view
- [ ] Purchase history and payment history on profile
- [ ] Debt management (balance, due date, payment history)
- [ ] Record a payment against an existing balance

## Phase 5 — Expenses
**Status: not started**

- [ ] Expense recording form (category, amount, description, date)
- [ ] Expense list/history view
- [ ] Feed expenses into profit calculation

## Phase 6 — Dashboard and Reports
**Status: partially done (frontend-only, sample data)**

- [x] Dashboard UI: today's sales/profit/expenses/debt, sales chart with
      period toggle, top products, low stock, customers owing, recent sales
      — `DashboardScreen` in `AppShell.jsx`
- [ ] Wire dashboard to real aggregated data
- [ ] Sales report (totals, by day, by product, by staff)
- [ ] Profit report (revenue, COGS, gross/net profit)
- [ ] Inventory report (stock value, fast/slow movers)
- [ ] Customer debt report
- [ ] Date-range filtering (Today / This week / This month / Custom)
- [ ] PDF/CSV export

## Phase 7 — Staff
**Status: not started (roles are only sketched in the planned schema)**

- [ ] Staff account creation under a business
- [ ] Role assignment (Owner, Manager, Cashier, Inventory Staff)
- [ ] Permission enforcement in UI (e.g. hide profit figures from Cashier role)
- [ ] Permission enforcement at the data layer, not just the UI

## Phase 8 — Production
**Status: not started**

- [ ] Security audit, especially Row-Level Security for multi-business isolation
- [ ] Input validation on frontend and backend for every form
- [ ] Error handling and user-facing error states throughout
- [ ] Automated tests (none exist yet — no test runner is configured)
- [ ] Deployment pipeline

---

## Copilot starting point

**The single next task is Phase 1's real authentication + database
foundation** — specifically:

1. Decide and confirm the backend/database technology (Supabase/Postgres is
   assumed throughout `db/bizflow_schema.sql`, but this has not been
   formally decided — confirm before building).
2. Apply `db/bizflow_schema.sql` to a real database instance.
3. Replace the fake `authStep` state machine in `AppShell.jsx` with real
   sign-up/log-in calls, without changing the visual design of those
   screens.
4. Wire the business-setup form to actually create a `businesses` row and
   a `business_members` row for the owner.

Only after that foundation is real should Phase 2 move from "UI with sample
data" to "UI with real data."
