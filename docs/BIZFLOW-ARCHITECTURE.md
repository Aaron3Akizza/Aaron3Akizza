# BizFlow Architecture

BizFlow is a React 18 + TypeScript/Vite application for small phone and phone-accessory shops. Tailwind CSS supplies the existing design system and `react-router-dom` supplies routing.

## Frontend

`index.html` loads `src/main.tsx`, which wraps `src/App.tsx` in `AuthProvider` from `src/context/AuthContext.tsx`. The public landing page is `/`. `/login` and `/signup` render the shared Supabase auth screen. The authenticated application is `/app/*`, with `/app/setup` reserved for a signed-in user who has not created a business yet.

`src/pages/AppShell.jsx` remains the existing visual shell and currently keeps dashboard and product data as sample data. Its sidebar navigation is local state and the non-dashboard modules remain placeholders. This is intentional: the backend foundation does not claim those modules are implemented.

## Supabase data layer

`src/lib/supabase.ts` creates the single Supabase browser client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Sessions persist and refresh through Supabase Auth. Missing environment variables produce a clear auth-screen configuration error rather than a fake successful login.

`AuthProvider` owns the current session, user, business membership, role, business creation, and sign-out operations. The shell consumes that context; components do not create their own clients or infer tenant identity.

## Database and security

`db/bizflow_schema.sql` is the reproducible Phase 1 Supabase schema. It creates:

- `profiles`, linked one-to-one with `auth.users`
- `businesses`, with an owner and configurable currency (default `UGX`)
- `business_members`, with owner, manager, cashier, and inventory roles

An `auth.users` trigger creates or updates a profile. The `create_business_for_current_user` security-definer function creates a business and its owner membership using `auth.uid()`; it cannot be called anonymously. RLS is enabled on all three tables. Business reads use the security-definer `is_business_member` helper, avoiding recursive membership policies and preventing cross-business access at the database boundary.

`db/phase2_products_inventory.sql` adds products, IMEI devices, and audited stock movements. `db/phase3_sales.sql` adds customers, sales, sale item snapshots, payments, receipt counters, atomic checkout, and controlled voiding. All sales writes occur through security-definer functions that validate the authenticated business membership and role, lock inventory rows, and roll back on failure. Sales reads are RLS-scoped to active business membership.

The Phase 3 customer table is intentionally minimal. Full debt management, later balance payments, and customer profiles are scheduled for the next phase. The dashboard still displays sample aggregates until reporting queries are added.

## Operations

Apply migrations in this order: `db/bizflow_schema.sql`, `db/phase2_products_inventory.sql`, then `db/phase3_sales.sql`. Copy `.env.example` to a local env file, set the two Supabase values, and run `npm run dev`. `npm run build` is the required production validation command. No automated test runner is configured yet.
