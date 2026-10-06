-- =============================================================================
-- BizFlow Phase 8: Platform Admin
-- Safe to run multiple times (idempotent).
-- Run AFTER phases 1–7.
--
-- This creates a PLATFORM-LEVEL admin role that is separate from the
-- business-level roles (owner / manager / cashier / inventory).
--
-- A platform admin can:
--   - View all businesses on the platform
--   - View all users / profiles
--   - Suspend or reactivate any business
--   - View aggregate system statistics
--   - Manage subscription status per business
--
-- A platform admin CANNOT see another business's financial data
-- (sales, expenses, products) — those remain RLS-protected per business.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Platform admins table
--    Maps auth.users → platform admin. Simple list of elevated accounts.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.platform_admins (
  user_id    uuid    primary key references auth.users(id) on delete cascade,
  granted_by uuid    references auth.users(id),
  note       text,
  created_at timestamptz not null default now()
);

-- Only other platform admins can read this table
alter table public.platform_admins enable row level security;

drop policy if exists "platform admins can read admin list" on public.platform_admins;
create policy "platform admins can read admin list" on public.platform_admins
  for select using (
    exists (select 1 from public.platform_admins where user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add subscription fields to businesses
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.businesses
  add column if not exists subscription_status text
    not null default 'trial'
    check (subscription_status in ('trial', 'active', 'suspended', 'cancelled')),
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists max_staff_accounts      integer not null default 5,
  add column if not exists notes                   text,
  add column if not exists suspended_at            timestamptz,
  add column if not exists suspended_reason        text;

-- Index for platform admin queries
create index if not exists businesses_subscription_status_idx
  on public.businesses(subscription_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Helper function — is the current user a platform admin?
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Platform admin policies on existing tables
--    Admins can read any business, any profile, any business_member.
--    They cannot read per-business financial data (sales/expenses/products).
-- ─────────────────────────────────────────────────────────────────────────────

-- Businesses: admins can read all + update subscription fields
drop policy if exists "platform admins can read all businesses" on public.businesses;
create policy "platform admins can read all businesses" on public.businesses
  for select using (public.is_platform_admin());

drop policy if exists "platform admins can update businesses" on public.businesses;
create policy "platform admins can update businesses" on public.businesses
  for update using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Profiles: admins can read all profiles
drop policy if exists "platform admins can read all profiles" on public.profiles;
create policy "platform admins can read all profiles" on public.profiles
  for select using (public.is_platform_admin());

-- Business members: admins can read all
drop policy if exists "platform admins can read all memberships" on public.business_members;
create policy "platform admins can read all memberships" on public.business_members
  for select using (public.is_platform_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Prevent suspended businesses from making sales / managing inventory
--    Adds a check to can_sell and can_manage_inventory
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.can_sell(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    join public.businesses       b  on b.id = bm.business_id
    where bm.business_id = target_business_id
      and bm.user_id     = auth.uid()
      and bm.is_active
      and bm.role       in ('owner', 'manager', 'cashier')
      -- Block if business is suspended
      and b.subscription_status <> 'suspended'
  );
$$;

create or replace function public.can_manage_inventory(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    join public.businesses       b  on b.id = bm.business_id
    where bm.business_id = target_business_id
      and bm.user_id     = auth.uid()
      and bm.is_active
      and bm.role       in ('owner', 'manager', 'inventory')
      and b.subscription_status <> 'suspended'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. get_platform_stats RPC — system overview for admin dashboard
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_platform_stats()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied';
  end if;

  return (
    select jsonb_build_object(
      'total_businesses',    (select count(*) from public.businesses),
      'active_businesses',   (select count(*) from public.businesses where subscription_status = 'active'),
      'trial_businesses',    (select count(*) from public.businesses where subscription_status = 'trial'),
      'suspended_businesses',(select count(*) from public.businesses where subscription_status = 'suspended'),
      'total_users',         (select count(*) from auth.users),
      'total_sales',         (select count(*) from public.sales   where sale_status = 'completed'),
      'total_revenue',       (select coalesce(sum(total), 0) from public.sales where sale_status = 'completed'),
      'total_products',      (select count(*) from public.products where is_active = true),
      'new_businesses_this_month', (
        select count(*) from public.businesses
        where created_at >= date_trunc('month', now())
      )
    )
  );
end;
$$;

revoke all on function public.get_platform_stats() from public;
grant execute on function public.get_platform_stats() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. get_all_businesses RPC — paginated list with stats for admin dashboard
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_all_businesses(
  p_limit  integer default 50,
  p_offset integer default 0,
  p_status text    default null   -- filter by subscription_status
) returns table (
  id                   uuid,
  name                 text,
  owner_email          text,
  owner_name           text,
  phone                text,
  location             text,
  currency             text,
  subscription_status  text,
  subscription_expires_at timestamptz,
  max_staff_accounts   integer,
  staff_count          bigint,
  sale_count           bigint,
  notes                text,
  created_at           timestamptz,
  suspended_at         timestamptz,
  suspended_reason     text
) language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied';
  end if;

  return query
  select
    b.id,
    b.name,
    u.email       as owner_email,
    pr.full_name  as owner_name,
    b.phone,
    b.location,
    b.currency,
    b.subscription_status,
    b.subscription_expires_at,
    b.max_staff_accounts,
    (select count(*) from public.business_members bm where bm.business_id = b.id and bm.is_active) as staff_count,
    (select count(*) from public.sales           s  where s.business_id  = b.id and s.sale_status = 'completed') as sale_count,
    b.notes,
    b.created_at,
    b.suspended_at,
    b.suspended_reason
  from       public.businesses b
  join       auth.users        u  on u.id  = b.owner_id
  left join  public.profiles   pr on pr.id = b.owner_id
  where (p_status is null or b.subscription_status = p_status)
  order by b.created_at desc
  limit  p_limit
  offset p_offset;
end;
$$;

revoke all on function public.get_all_businesses(integer, integer, text) from public;
grant execute on function public.get_all_businesses(integer, integer, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. update_business_subscription RPC — admin changes subscription status
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.update_business_subscription(
  target_business_id   uuid,
  new_status           text,
  new_expires_at       timestamptz default null,
  new_max_staff        integer     default null,
  admin_note           text        default null,
  suspend_reason       text        default null
) returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied';
  end if;

  if new_status not in ('trial', 'active', 'suspended', 'cancelled') then
    raise exception 'Invalid subscription status: %', new_status;
  end if;

  update public.businesses set
    subscription_status      = new_status,
    subscription_expires_at  = coalesce(new_expires_at, subscription_expires_at),
    max_staff_accounts       = coalesce(new_max_staff,  max_staff_accounts),
    notes                    = coalesce(admin_note,     notes),
    suspended_at             = case when new_status = 'suspended' then now()     else null end,
    suspended_reason         = case when new_status = 'suspended' then suspend_reason else null end,
    updated_at               = now()
  where id = target_business_id;
end;
$$;

revoke all on function public.update_business_subscription(uuid, text, timestamptz, integer, text, text) from public;
grant execute on function public.update_business_subscription(uuid, text, timestamptz, integer, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. HOW TO MAKE YOURSELF A PLATFORM ADMIN
--    Run this in the Supabase SQL Editor, replacing the email with your own.
--
--    insert into public.platform_admins (user_id, note)
--    select id, 'Founder / System Administrator'
--    from auth.users
--    where email = 'your-email@example.com';
-- ─────────────────────────────────────────────────────────────────────────────
