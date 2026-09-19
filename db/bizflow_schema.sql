-- BizFlow backend foundation for Supabase PostgreSQL.
-- Apply this file in the Supabase SQL editor or through migrations.
-- Phase 1 only: profiles, businesses, and business memberships.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  owner_id uuid not null references auth.users(id) on delete restrict,
  phone text,
  email text,
  location text,
  currency text not null default 'UGX' check (char_length(currency) between 3 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'cashier' check (role in ('owner', 'manager', 'cashier', 'inventory')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists business_members_user_id_idx on public.business_members(user_id);
create index if not exists business_members_business_id_idx on public.business_members(business_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'phone')
  on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = target_business_id and user_id = auth.uid() and is_active
  );
$$;

create or replace function public.create_business_for_current_user(
  business_name text,
  business_phone text default null,
  business_email text default null,
  business_location text default null,
  business_currency text default 'UGX'
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare new_business_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.businesses (name, owner_id, phone, email, location, currency)
  values (trim(business_name), auth.uid(), business_phone, business_email, business_location, upper(business_currency))
  returning id into new_business_id;
  insert into public.business_members (business_id, user_id, role) values (new_business_id, auth.uid(), 'owner');
  return new_business_id;
end;
$$;

revoke all on function public.create_business_for_current_user(text, text, text, text, text) from public;
grant execute on function public.create_business_for_current_user(text, text, text, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;

drop policy if exists "users can read their profile" on public.profiles;
create policy "users can read their profile" on public.profiles for select using (id = auth.uid());
drop policy if exists "users can update their profile" on public.profiles;
create policy "users can update their profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members can read their businesses" on public.businesses;
create policy "members can read their businesses" on public.businesses for select using (public.is_business_member(id));
drop policy if exists "owners can update their businesses" on public.businesses;
create policy "owners can update their businesses" on public.businesses for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "users can read their memberships" on public.business_members;
create policy "users can read their memberships" on public.business_members for select using (user_id = auth.uid() or public.is_business_member(business_id));
