-- BizFlow Phase 5: Patch migrations — safe to run multiple times (all use IF NOT EXISTS / IF EXISTS).
-- Run this file AFTER phases 1–4.

-- 1. Add due_date column to sales (used by credit/partial sales to track repayment deadline)
alter table public.sales add column if not exists due_date date;

-- 2. Add device_imei snapshot to sale_items so receipts show IMEI without a join
alter table public.sale_items add column if not exists device_imei text;

-- 3. Add index on due_date for overdue queries
create index if not exists sales_due_date_idx on public.sales(business_id, due_date)
  where due_date is not null and sale_status = 'completed' and payment_status in ('partial', 'credit');

-- 4. Ensure the profiles table has a phone column (some installs may be missing it)
alter table public.profiles add column if not exists phone text;

-- 5. Tighten RLS: prevent a cashier from reading another business's expenses
--    (re-create policy idempotently)
drop policy if exists "members can read expenses" on public.expenses;
create policy "members can read expenses" on public.expenses
  for select using (public.is_business_member(business_id));

-- 6. Add updated_at auto-trigger for expenses (was missing)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();
