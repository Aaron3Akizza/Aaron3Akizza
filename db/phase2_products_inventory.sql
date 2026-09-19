-- BizFlow Phase 2: Products and inventory.
-- Requires db/bizflow_schema.sql to be applied first.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  sku text,
  category text not null check (char_length(trim(category)) > 0),
  brand text,
  model text,
  inventory_type text not null check (inventory_type in ('quantity', 'individual')),
  buying_price numeric(14,2) not null check (buying_price >= 0),
  selling_price numeric(14,2) not null check (selling_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  supplier text,
  image_url text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  unique (business_id, sku)
);

create table if not exists public.product_devices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  imei text not null check (imei ~ '^[0-9]{15}$'),
  imei_2 text check (imei_2 is null or imei_2 ~ '^[0-9]{15}$'),
  serial_number text,
  storage text,
  ram text,
  color text,
  condition text,
  status text not null default 'in_stock' check (status in ('in_stock', 'sold', 'returned', 'damaged', 'lost')),
  buying_price numeric(14,2) check (buying_price is null or buying_price >= 0),
  selling_price numeric(14,2) check (selling_price is null or selling_price >= 0),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, imei),
  unique (business_id, imei_2)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  device_id uuid references public.product_devices(id) on delete set null,
  movement_type text not null check (movement_type in ('stock_received', 'sale', 'return', 'damaged', 'lost', 'adjustment')),
  quantity integer not null check (quantity <> 0),
  reference_id uuid,
  reason text,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists products_business_updated_idx on public.products(business_id, updated_at desc);
create index if not exists products_business_category_idx on public.products(business_id, category);
create index if not exists products_business_brand_idx on public.products(business_id, brand);
create index if not exists product_devices_business_product_idx on public.product_devices(business_id, product_id);
create index if not exists stock_movements_business_product_idx on public.stock_movements(business_id, product_id, created_at desc);

create or replace function public.can_manage_inventory(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.business_members where business_id = target_business_id and user_id = auth.uid() and is_active and role in ('owner', 'manager', 'inventory')); $$;

create or replace function public.prevent_product_tenant_change()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.business_id <> old.business_id or new.created_by <> old.created_by then
    raise exception 'Product ownership cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists products_immutable_tenant on public.products;
create trigger products_immutable_tenant
before update on public.products
for each row execute procedure public.prevent_product_tenant_change();

create or replace function public.create_product_with_devices(
  target_business_id uuid,
  product_name text, product_sku text, product_category text, product_brand text, product_model text,
  product_inventory_type text, product_buying_price numeric, product_selling_price numeric,
  product_quantity integer, product_minimum_stock integer, product_supplier text, product_description text,
  device_rows jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = public
as $$
declare new_product_id uuid; device_row jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.can_manage_inventory(target_business_id) then raise exception 'You are not allowed to manage inventory'; end if;
  insert into public.products (business_id, name, sku, category, brand, model, inventory_type, buying_price, selling_price, quantity, minimum_stock, supplier, description, created_by)
  values (target_business_id, trim(product_name), nullif(trim(product_sku), ''), trim(product_category), nullif(trim(product_brand), ''), nullif(trim(product_model), ''), product_inventory_type, product_buying_price, product_selling_price,
    case when product_inventory_type = 'individual' then jsonb_array_length(device_rows) else product_quantity end, product_minimum_stock, nullif(trim(product_supplier), ''), nullif(trim(product_description), ''), auth.uid()) returning id into new_product_id;
  for device_row in select * from jsonb_array_elements(device_rows) loop
    insert into public.product_devices (product_id, business_id, imei, imei_2, serial_number, storage, ram, color, condition, buying_price, selling_price)
    values (new_product_id, target_business_id, device_row->>'imei', nullif(device_row->>'imei_2', ''), nullif(device_row->>'serial_number', ''), nullif(device_row->>'storage', ''), nullif(device_row->>'ram', ''), nullif(device_row->>'color', ''), nullif(device_row->>'condition', ''), product_buying_price, product_selling_price);
  end loop;
  if product_quantity > 0 and product_inventory_type = 'quantity' then
    insert into public.stock_movements (business_id, product_id, movement_type, quantity, reason, created_by)
    values (target_business_id, new_product_id, 'stock_received', product_quantity, 'Initial stock', auth.uid());
  end if;
  return new_product_id;
end;
$$;

create or replace function public.receive_quantity_stock(target_product_id uuid, received_quantity integer, movement_reason text)
returns void language plpgsql security definer set search_path = public
as $$ declare target_business_id uuid; begin
  if received_quantity <= 0 or nullif(trim(movement_reason), '') is null then raise exception 'Quantity and reason are required'; end if;
  select business_id into target_business_id from public.products where id = target_product_id;
  if not public.can_manage_inventory(target_business_id) then raise exception 'You are not allowed to manage inventory'; end if;
  update public.products set quantity = quantity + received_quantity, updated_at = now() where id = target_product_id and inventory_type = 'quantity';
  insert into public.stock_movements (business_id, product_id, movement_type, quantity, reason, created_by) values (target_business_id, target_product_id, 'stock_received', received_quantity, movement_reason, auth.uid());
end; $$;

create or replace function public.adjust_quantity_stock(target_product_id uuid, quantity_delta integer, adjustment_reason text)
returns void language plpgsql security definer set search_path = public
as $$ declare target_business_id uuid; current_quantity integer; begin
  if quantity_delta = 0 or nullif(trim(adjustment_reason), '') is null then raise exception 'Adjustment and reason are required'; end if;
  select business_id, quantity into target_business_id, current_quantity from public.products where id = target_product_id for update;
  if not public.can_manage_inventory(target_business_id) then raise exception 'You are not allowed to manage inventory'; end if;
  if current_quantity + quantity_delta < 0 then raise exception 'Stock cannot become negative'; end if;
  update public.products set quantity = quantity + quantity_delta, updated_at = now() where id = target_product_id and inventory_type = 'quantity';
  insert into public.stock_movements (business_id, product_id, movement_type, quantity, reason, created_by) values (target_business_id, target_product_id, 'adjustment', quantity_delta, adjustment_reason, auth.uid());
end; $$;

revoke all on function public.create_product_with_devices(uuid,text,text,text,text,text,text,numeric,numeric,integer,integer,text,text,jsonb) from public;
revoke all on function public.receive_quantity_stock(uuid,integer,text) from public;
revoke all on function public.adjust_quantity_stock(uuid,integer,text) from public;
grant execute on function public.create_product_with_devices(uuid,text,text,text,text,text,text,numeric,numeric,integer,integer,text,text,jsonb) to authenticated;
grant execute on function public.receive_quantity_stock(uuid,integer,text) to authenticated;
grant execute on function public.adjust_quantity_stock(uuid,integer,text) to authenticated;

alter table public.products enable row level security;
alter table public.product_devices enable row level security;
alter table public.stock_movements enable row level security;
drop policy if exists "members can read products" on public.products;
create policy "members can read products" on public.products for select using (public.is_business_member(business_id));
drop policy if exists "inventory roles can update products" on public.products;
create policy "inventory roles can update products" on public.products for update using (public.can_manage_inventory(business_id)) with check (public.can_manage_inventory(business_id));
drop policy if exists "members can read devices" on public.product_devices;
create policy "members can read devices" on public.product_devices for select using (public.is_business_member(business_id));
drop policy if exists "inventory roles can read movements" on public.stock_movements;
create policy "inventory roles can read movements" on public.stock_movements for select using (public.is_business_member(business_id));
