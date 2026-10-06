-- BizFlow Phase 5: Patch migrations.
-- Safe to run multiple times — all statements use IF NOT EXISTS / IF EXISTS / DO blocks.
-- Can be run BEFORE or AFTER phase4 — the expenses-dependent parts are guarded.
--
-- Run order: phase1 → phase2 → phase3 → phase4 → phase5
-- If you haven't run phase4 yet, run it first then re-run this file.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add due_date column to sales
--    Used by credit/partial sales to track repayment deadline.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sales
  add column if not exists due_date date;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add device_imei snapshot to sale_items
--    Lets receipts show the IMEI number without a separate join.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sale_items
  add column if not exists device_imei text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Index on sales.due_date for fast overdue queries
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists sales_due_date_idx
  on public.sales(business_id, due_date)
  where due_date is not null
    and sale_status  = 'completed'
    and payment_status in ('partial', 'credit');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Ensure profiles table has a phone column
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists phone text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Shared updated_at trigger function
--    Used by both expenses and customers tables.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Expenses table patches — only run if the expenses table exists.
--    If you get an error here, run phase4_customers_expenses.sql first.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  -- Check the expenses table exists before touching it
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'expenses'
  ) then

    -- Re-create RLS read policy (idempotent)
    drop policy if exists "members can read expenses" on public.expenses;
    execute '
      create policy "members can read expenses" on public.expenses
        for select using (public.is_business_member(business_id))
    ';

    -- Add updated_at trigger if not already present
    if not exists (
      select 1 from information_schema.triggers
      where event_object_schema = 'public'
        and event_object_table  = 'expenses'
        and trigger_name        = 'expenses_set_updated_at'
    ) then
      execute '
        create trigger expenses_set_updated_at
          before update on public.expenses
          for each row execute function public.set_updated_at()
      ';
    end if;

  else
    raise notice 'Skipping expenses patches — run phase4_customers_expenses.sql first, then re-run this file.';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Customers table updated_at trigger
--    customers table is created in phase3, so this is always safe.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table  = 'customers'
      and trigger_name        = 'customers_set_updated_at'
  ) then
    execute '
      create trigger customers_set_updated_at
        before update on public.customers
        for each row execute function public.set_updated_at()
    ';
  end if;
end;
$$;
