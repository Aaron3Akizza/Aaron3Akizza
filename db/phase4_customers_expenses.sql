-- BizFlow Phase 4: Expenses table and customer profile enhancements.
-- Requires phases 1, 2, and 3 SQL files.

-- Add notes column to customers if not present
alter table public.customers add column if not exists notes text;

-- Expenses table
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null check (char_length(trim(category)) > 0),
  amount numeric(14,2) not null check (amount > 0),
  description text,
  expense_date date not null default current_date,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_business_date_idx on public.expenses(business_id, expense_date desc);
create index if not exists expenses_business_category_idx on public.expenses(business_id, category);

alter table public.expenses enable row level security;

drop policy if exists "members can read expenses" on public.expenses;
create policy "members can read expenses" on public.expenses
  for select using (public.is_business_member(business_id));

drop policy if exists "managers can insert expenses" on public.expenses;
create policy "managers can insert expenses" on public.expenses
  for insert with check (
    exists (
      select 1 from public.business_members
      where business_id = expenses.business_id
        and user_id = auth.uid()
        and is_active
        and role in ('owner', 'manager')
    )
  );

drop policy if exists "managers can delete expenses" on public.expenses;
create policy "managers can delete expenses" on public.expenses
  for delete using (
    exists (
      select 1 from public.business_members
      where business_id = expenses.business_id
        and user_id = auth.uid()
        and is_active
        and role in ('owner', 'manager')
    )
  );

-- Allow customers to be updated by cashiers and above
drop policy if exists "cashiers can update customers" on public.customers;
create policy "cashiers can update customers" on public.customers
  for update using (public.can_sell(business_id))
  with check (public.can_sell(business_id));
