-- BizFlow Phase 3: sales, checkout, customers, payments, receipts and voids.
-- Requires the Phase 1 and Phase 2 SQL files.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) > 0),
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_receipt_counters (
  business_id uuid not null references public.businesses(id) on delete cascade,
  receipt_year integer not null,
  last_number integer not null default 0 check (last_number >= 0),
  primary key (business_id, receipt_year)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  receipt_number text not null,
  customer_id uuid references public.customers(id),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  total numeric(14,2) not null check (total >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  balance numeric(14,2) not null default 0 check (balance >= 0),
  cost_of_goods numeric(14,2) not null default 0 check (cost_of_goods >= 0),
  gross_profit numeric(14,2) not null default 0,
  payment_status text not null check (payment_status in ('paid', 'partial', 'credit')),
  sale_status text not null default 'completed' check (sale_status in ('completed', 'voided', 'refunded')),
  sold_by uuid not null references auth.users(id),
  voided_by uuid references auth.users(id),
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, receipt_number)
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id),
  device_id uuid references public.product_devices(id),
  product_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  profit numeric(14,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  customer_id uuid references public.customers(id),
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'mobile_money', 'bank', 'card', 'credit')),
  reference text,
  received_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists customers_business_name_idx on public.customers(business_id, full_name);
create index if not exists sales_business_created_idx on public.sales(business_id, created_at desc);
create index if not exists sales_business_status_idx on public.sales(business_id, payment_status, sale_status);
create index if not exists sale_items_sale_idx on public.sale_items(sale_id);
create index if not exists payments_sale_idx on public.payments(sale_id, created_at);

create or replace function public.can_sell(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.business_members where business_id = target_business_id and user_id = auth.uid() and is_active and role in ('owner', 'manager', 'cashier')); $$;

create or replace function public.can_void_sale(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.business_members where business_id = target_business_id and user_id = auth.uid() and is_active and role in ('owner', 'manager')); $$;

create or replace function public.complete_sale(
  target_business_id uuid,
  target_customer_id uuid,
  discount_amount numeric,
  paid_amount numeric,
  paid_method text,
  paid_reference text,
  cart_items jsonb
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  sale_id uuid; receipt text; year_number integer := extract(year from now()); next_number integer;
  cart_item jsonb; product_row record; device_row record; line_subtotal numeric; line_cost numeric;
  computed_subtotal numeric := 0; computed_cost numeric := 0; computed_total numeric; computed_balance numeric; computed_profit numeric;
  item_quantity integer; item_device_id uuid; item_unit_price numeric;
begin
  if auth.uid() is null or not public.can_sell(target_business_id) then raise exception 'Not allowed to complete sales'; end if;
  if jsonb_array_length(cart_items) = 0 then raise exception 'Cart cannot be empty'; end if;
  if discount_amount is null or discount_amount < 0 or paid_amount is null or paid_amount < 0 then raise exception 'Invalid discount or payment'; end if;
  if paid_method not in ('cash', 'mobile_money', 'bank', 'card', 'credit') then raise exception 'Invalid payment method'; end if;
  if target_customer_id is not null and not exists (select 1 from public.customers where id = target_customer_id and business_id = target_business_id) then raise exception 'Customer does not belong to this business'; end if;

  for cart_item in select * from jsonb_array_elements(cart_items) loop
    item_quantity := coalesce((cart_item->>'quantity')::integer, 0);
    item_device_id := nullif(cart_item->>'device_id', '')::uuid;
    if item_quantity <= 0 then raise exception 'Invalid quantity'; end if;
    select * into product_row from public.products where id = (cart_item->>'product_id')::uuid and business_id = target_business_id and is_active for update;
    if not found then raise exception 'Product is no longer available'; end if;
    item_unit_price := product_row.selling_price;
    if product_row.inventory_type = 'quantity' then
      if item_device_id is not null or product_row.quantity < item_quantity then raise exception 'Insufficient stock'; end if;
      update public.products set quantity = quantity - item_quantity, updated_at = now() where id = product_row.id and quantity >= item_quantity;
      if not found then raise exception 'Stock changed during checkout'; end if;
      line_cost := product_row.buying_price * item_quantity;
    else
      if item_quantity <> 1 or item_device_id is null then raise exception 'Select one device for each phone'; end if;
      select * into device_row from public.product_devices where id = item_device_id and product_id = product_row.id and business_id = target_business_id for update;
      if not found or device_row.status <> 'in_stock' then raise exception 'This device is no longer available'; end if;
      update public.product_devices set status = 'sold', sold_at = now(), updated_at = now() where id = item_device_id and status = 'in_stock';
      if not found then raise exception 'Device was sold by another cashier'; end if;
      line_cost := coalesce(device_row.buying_price, product_row.buying_price);
    end if;
    line_subtotal := item_unit_price * item_quantity;
    computed_subtotal := computed_subtotal + line_subtotal;
    computed_cost := computed_cost + line_cost;
  end loop;

  computed_total := computed_subtotal - discount_amount;
  if computed_total < 0 or paid_amount > computed_total then raise exception 'Payment does not match the sale total'; end if;
  if paid_amount < computed_total and target_customer_id is null then raise exception 'A customer is required for unpaid sales'; end if;
  computed_balance := computed_total - paid_amount;
  computed_profit := computed_total - computed_cost;
  insert into public.business_receipt_counters (business_id, receipt_year, last_number) values (target_business_id, year_number, 1)
    on conflict (business_id, receipt_year) do update set last_number = business_receipt_counters.last_number + 1 returning last_number into next_number;
  receipt := 'BF-' || year_number || '-' || lpad(next_number::text, 6, '0');
  insert into public.sales (business_id, receipt_number, customer_id, subtotal, discount, total, amount_paid, balance, cost_of_goods, gross_profit, payment_status, sold_by)
    values (target_business_id, receipt, target_customer_id, computed_subtotal, discount_amount, computed_total, paid_amount, computed_balance, computed_cost, computed_profit, case when computed_balance = 0 then 'paid' when paid_amount = 0 then 'credit' else 'partial' end, auth.uid()) returning id into sale_id;
  for cart_item in select * from jsonb_array_elements(cart_items) loop
    select p.name, p.selling_price, case when p.inventory_type = 'individual' then coalesce(d.buying_price, p.buying_price) else p.buying_price end as cost, p.inventory_type
      into product_row from public.products p left join public.product_devices d on d.id = nullif(cart_item->>'device_id', '')::uuid where p.id = (cart_item->>'product_id')::uuid;
    item_quantity := (cart_item->>'quantity')::integer;
    line_subtotal := product_row.selling_price * item_quantity;
    line_cost := product_row.cost * item_quantity;
    insert into public.sale_items (sale_id, business_id, product_id, device_id, product_name_snapshot, quantity, unit_price, unit_cost, subtotal, profit)
      values (sale_id, target_business_id, (cart_item->>'product_id')::uuid, nullif(cart_item->>'device_id', '')::uuid, product_row.name, item_quantity, product_row.selling_price, product_row.cost, line_subtotal, line_subtotal - line_cost);
    insert into public.stock_movements (business_id, product_id, device_id, movement_type, quantity, reference_id, reason, created_by)
      values (target_business_id, (cart_item->>'product_id')::uuid, nullif(cart_item->>'device_id', '')::uuid, 'sale', -item_quantity, sale_id, 'Sale ' || receipt, auth.uid());
  end loop;
  if paid_amount > 0 then insert into public.payments (business_id, sale_id, customer_id, amount, payment_method, reference, received_by) values (target_business_id, sale_id, target_customer_id, paid_amount, paid_method, nullif(trim(paid_reference), ''), auth.uid()); end if;
  return jsonb_build_object('id', sale_id, 'receipt_number', receipt);
end;
$$;

create or replace function public.void_sale(target_sale_id uuid, void_reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare sale_row record; item_row record; begin
  select * into sale_row from public.sales where id = target_sale_id for update;
  if not found or not public.can_void_sale(sale_row.business_id) then raise exception 'You are not allowed to void this sale'; end if;
  if sale_row.sale_status <> 'completed' then raise exception 'Sale is already voided'; end if;
  for item_row in select * from public.sale_items where sale_id = target_sale_id loop
    if item_row.device_id is null then
      update public.products set quantity = quantity + item_row.quantity, updated_at = now() where id = item_row.product_id and business_id = sale_row.business_id;
      if not found then raise exception 'Product stock could not be restored'; end if;
    else
      update public.product_devices set status = 'in_stock', sold_at = null, updated_at = now() where id = item_row.device_id and business_id = sale_row.business_id and status = 'sold';
      if not found then raise exception 'Device stock could not be restored'; end if;
    end if;
    insert into public.stock_movements (business_id, product_id, device_id, movement_type, quantity, reference_id, reason, created_by) values (sale_row.business_id, item_row.product_id, item_row.device_id, 'return', item_row.quantity, target_sale_id, coalesce(nullif(trim(void_reason), ''), 'Voided sale'), auth.uid());
  end loop;
  update public.sales set sale_status = 'voided', voided_by = auth.uid(), voided_at = now(), updated_at = now() where id = target_sale_id;
end;
$$;

revoke all on function public.complete_sale(uuid,uuid,numeric,numeric,text,text,jsonb) from public;
revoke all on function public.void_sale(uuid,text) from public;
grant execute on function public.complete_sale(uuid,uuid,numeric,numeric,text,text,jsonb) to authenticated;
grant execute on function public.void_sale(uuid,text) to authenticated;

alter table public.customers enable row level security;
alter table public.business_receipt_counters enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
drop policy if exists "members can read customers" on public.customers;
create policy "members can read customers" on public.customers for select using (public.is_business_member(business_id));
drop policy if exists "cashiers can create customers" on public.customers;
create policy "cashiers can create customers" on public.customers for insert with check (public.can_sell(business_id));
drop policy if exists "members can read sales" on public.sales;
create policy "members can read sales" on public.sales for select using (public.is_business_member(business_id));
drop policy if exists "members can read sale items" on public.sale_items;
create policy "members can read sale items" on public.sale_items for select using (public.is_business_member(business_id));
drop policy if exists "members can read payments" on public.payments;
create policy "members can read payments" on public.payments for select using (public.is_business_member(business_id));
