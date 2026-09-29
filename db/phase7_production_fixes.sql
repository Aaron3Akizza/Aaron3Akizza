-- =============================================================================
-- BizFlow Phase 7: Production fixes.
-- Safe to run multiple times (idempotent).
-- Run AFTER phases 1–6.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RLS: INSERT policy on payments table (was missing — blocked recordPayment)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "cashiers can insert payments" on public.payments;
create policy "cashiers can insert payments" on public.payments
  for insert with check (public.can_sell(business_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS: UPDATE policy on sales table (was missing — blocked recordPayment)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "cashiers can update sales" on public.sales;
create policy "cashiers can update sales" on public.sales
  for update using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. updated_at trigger on sales table (was missing — patch5 skipped it)
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Missing indexes — customer_id lookups were full-table scans
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists sales_customer_id_idx
  on public.sales(customer_id)
  where customer_id is not null;

create index if not exists payments_customer_id_idx
  on public.payments(customer_id)
  where customer_id is not null;

create index if not exists customers_business_id_idx
  on public.customers(business_id);

create index if not exists expenses_business_date_desc_idx
  on public.expenses(business_id, expense_date desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Add FK from stock_movements.reference_id to sales
--    Use a soft reference — not enforced so voided sales can still exist
--    (PostgreSQL doesn't support conditional FKs, keep as bare uuid but document)
-- ─────────────────────────────────────────────────────────────────────────────
-- Index so reference_id lookups are fast when showing movement history
create index if not exists stock_movements_reference_id_idx
  on public.stock_movements(reference_id)
  where reference_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Add updated_at on business_members (track role changes)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.business_members
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists business_members_set_updated_at on public.business_members;
create trigger business_members_set_updated_at
  before update on public.business_members
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Fix complete_sale: populate sale_items.device_imei snapshot
--    Also fixes the "Today" chart by keeping complete_sale unchanged but
--    ensuring device_imei is written correctly.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.complete_sale(
  target_business_id uuid,
  target_customer_id uuid,
  discount_amount     numeric,
  paid_amount         numeric,
  paid_method         text,
  paid_reference      text,
  cart_items          jsonb
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  sale_id         uuid;
  receipt         text;
  year_number     integer := extract(year from now());
  next_number     integer;
  cart_item       jsonb;
  product_row     record;
  device_row      record;
  line_subtotal   numeric;
  line_cost       numeric;
  computed_subtotal  numeric := 0;
  computed_cost      numeric := 0;
  computed_total     numeric;
  computed_balance   numeric;
  computed_profit    numeric;
  item_quantity   integer;
  item_device_id  uuid;
  item_unit_price numeric;
  item_device_imei text;
begin
  -- Auth + permission check
  if auth.uid() is null or not public.can_sell(target_business_id) then
    raise exception 'Not allowed to complete sales';
  end if;
  if jsonb_array_length(cart_items) = 0 then
    raise exception 'Cart cannot be empty';
  end if;
  if discount_amount is null or discount_amount < 0
     or paid_amount  is null or paid_amount  < 0 then
    raise exception 'Invalid discount or payment';
  end if;
  if paid_method not in ('cash','mobile_money','bank','card','credit') then
    raise exception 'Invalid payment method';
  end if;
  if target_customer_id is not null
     and not exists (
       select 1 from public.customers
       where id = target_customer_id
         and business_id = target_business_id
     ) then
    raise exception 'Customer does not belong to this business';
  end if;

  -- ── First pass: validate stock and compute totals ─────────────────────────
  for cart_item in select * from jsonb_array_elements(cart_items) loop
    item_quantity  := coalesce((cart_item->>'quantity')::integer, 0);
    item_device_id := nullif(cart_item->>'device_id', '')::uuid;

    if item_quantity <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select * into product_row
    from   public.products
    where  id          = (cart_item->>'product_id')::uuid
      and  business_id = target_business_id
      and  is_active
    for update;

    if not found then
      raise exception 'Product is no longer available';
    end if;

    item_unit_price  := product_row.selling_price;
    item_device_imei := null;

    if product_row.inventory_type = 'quantity' then
      if item_device_id is not null
         or product_row.quantity < item_quantity then
        raise exception 'Insufficient stock';
      end if;
      update public.products
      set    quantity   = quantity - item_quantity,
             updated_at = now()
      where  id = product_row.id
        and  quantity >= item_quantity;
      if not found then
        raise exception 'Stock changed during checkout';
      end if;
      line_cost := product_row.buying_price * item_quantity;

    else  -- individual / IMEI-tracked
      if item_quantity <> 1 or item_device_id is null then
        raise exception 'Select one device for each phone';
      end if;

      select * into device_row
      from   public.product_devices
      where  id          = item_device_id
        and  product_id  = product_row.id
        and  business_id = target_business_id
      for update;

      if not found or device_row.status <> 'in_stock' then
        raise exception 'This device is no longer available';
      end if;

      update public.product_devices
      set    status     = 'sold',
             sold_at    = now(),
             updated_at = now()
      where  id     = item_device_id
        and  status = 'in_stock';

      if not found then
        raise exception 'Device was sold by another cashier';
      end if;

      line_cost        := coalesce(device_row.buying_price, product_row.buying_price);
      item_device_imei := device_row.imei;  -- ← capture IMEI snapshot
    end if;

    line_subtotal      := item_unit_price * item_quantity;
    computed_subtotal  := computed_subtotal + line_subtotal;
    computed_cost      := computed_cost    + line_cost;
  end loop;

  -- ── Validate totals ───────────────────────────────────────────────────────
  computed_total := computed_subtotal - discount_amount;

  if computed_total < 0 then
    raise exception 'Discount exceeds the sale total';
  end if;
  if paid_amount > computed_total then
    raise exception 'Payment exceeds the sale total';
  end if;
  if paid_amount < computed_total and target_customer_id is null then
    raise exception 'A customer is required for unpaid sales';
  end if;

  computed_balance := computed_total - paid_amount;
  computed_profit  := computed_total - computed_cost;

  -- ── Receipt counter ───────────────────────────────────────────────────────
  insert into public.business_receipt_counters
    (business_id, receipt_year, last_number)
  values
    (target_business_id, year_number, 1)
  on conflict (business_id, receipt_year)
  do update set last_number = business_receipt_counters.last_number + 1
  returning last_number into next_number;

  receipt := 'BF-' || year_number || '-' || lpad(next_number::text, 6, '0');

  -- ── Insert sale header ────────────────────────────────────────────────────
  insert into public.sales (
    business_id, receipt_number, customer_id,
    subtotal, discount, total, amount_paid, balance,
    cost_of_goods, gross_profit, payment_status, sold_by
  ) values (
    target_business_id, receipt, target_customer_id,
    computed_subtotal, discount_amount, computed_total, paid_amount, computed_balance,
    computed_cost, computed_profit,
    case
      when computed_balance = 0 then 'paid'
      when paid_amount      = 0 then 'credit'
      else 'partial'
    end,
    auth.uid()
  )
  returning id into sale_id;

  -- ── Second pass: insert sale_items + stock_movements ──────────────────────
  for cart_item in select * from jsonb_array_elements(cart_items) loop
    item_device_id := nullif(cart_item->>'device_id', '')::uuid;

    -- Re-resolve cost and device IMEI for sale_items snapshot
    select
      p.name,
      p.selling_price,
      case
        when p.inventory_type = 'individual'
        then coalesce(d.buying_price, p.buying_price)
        else p.buying_price
      end                  as cost,
      p.inventory_type,
      d.imei               as device_imei_snapshot
    into product_row
    from       public.products      p
    left join  public.product_devices d
      on d.id = item_device_id
    where p.id = (cart_item->>'product_id')::uuid;

    item_quantity := (cart_item->>'quantity')::integer;
    line_subtotal := product_row.selling_price * item_quantity;
    line_cost     := product_row.cost          * item_quantity;

    insert into public.sale_items (
      sale_id, business_id, product_id, device_id,
      product_name_snapshot, quantity, unit_price, unit_cost,
      subtotal, profit, device_imei
    ) values (
      sale_id, target_business_id,
      (cart_item->>'product_id')::uuid, item_device_id,
      product_row.name, item_quantity,
      product_row.selling_price, product_row.cost,
      line_subtotal, line_subtotal - line_cost,
      product_row.device_imei_snapshot   -- ← populated now
    );

    insert into public.stock_movements (
      business_id, product_id, device_id,
      movement_type, quantity, reference_id, reason, created_by
    ) values (
      target_business_id,
      (cart_item->>'product_id')::uuid,
      item_device_id,
      'sale', -item_quantity,
      sale_id,
      'Sale ' || receipt,
      auth.uid()
    );
  end loop;

  -- ── Record initial payment if any ─────────────────────────────────────────
  if paid_amount > 0 then
    insert into public.payments (
      business_id, sale_id, customer_id,
      amount, payment_method, reference, received_by
    ) values (
      target_business_id, sale_id, target_customer_id,
      paid_amount, paid_method,
      nullif(trim(coalesce(paid_reference, '')), ''),
      auth.uid()
    );
  end if;

  return jsonb_build_object('id', sale_id, 'receipt_number', receipt);
end;
$$;

-- Re-grant (idempotent)
revoke all on function public.complete_sale(uuid,uuid,numeric,numeric,text,text,jsonb) from public;
grant execute on function public.complete_sale(uuid,uuid,numeric,numeric,text,text,jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. record_payment RPC — atomic payment recording with FOR UPDATE lock
--    Replaces the two-query client-side pattern in customers.ts
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.record_payment(
  target_sale_id    uuid,
  payment_amount    numeric,
  payment_method    text,
  payment_reference text default null
) returns void language plpgsql security definer set search_path = public
as $$
declare
  sale_row record;
  new_paid    numeric;
  new_balance numeric;
  new_status  text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the sale row to prevent concurrent payment race
  select * into sale_row
  from   public.sales
  where  id = target_sale_id
  for update;

  if not found then
    raise exception 'Sale not found';
  end if;

  if not public.can_sell(sale_row.business_id) then
    raise exception 'Not allowed to record payments for this business';
  end if;

  if sale_row.sale_status = 'voided' then
    raise exception 'Cannot record a payment on a voided sale';
  end if;

  if payment_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if payment_method not in ('cash','mobile_money','bank','card','credit') then
    raise exception 'Invalid payment method';
  end if;

  new_paid    := sale_row.amount_paid + payment_amount;
  new_balance := greatest(0, sale_row.total - new_paid);

  -- Prevent overpayment
  if new_paid > sale_row.total then
    raise exception 'Payment of % exceeds outstanding balance of %',
      payment_amount, sale_row.balance;
  end if;

  new_status := case
    when new_balance = 0 then 'paid'
    when new_paid    = 0 then 'credit'
    else 'partial'
  end;

  -- Insert payment record
  insert into public.payments (
    business_id, sale_id, customer_id,
    amount, payment_method, reference, received_by
  ) values (
    sale_row.business_id, target_sale_id, sale_row.customer_id,
    payment_amount, payment_method,
    nullif(trim(coalesce(payment_reference, '')), ''),
    auth.uid()
  );

  -- Update sale in same transaction
  update public.sales
  set    amount_paid    = new_paid,
         balance        = new_balance,
         payment_status = new_status,
         updated_at     = now()
  where  id = target_sale_id;
end;
$$;

revoke all on function public.record_payment(uuid, numeric, text, text) from public;
grant execute on function public.record_payment(uuid, numeric, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Staff invite handler
--    When a new user is created whose raw_user_meta_data contains
--    invited_business_id and invited_role, add them to that business.
--    This fires on EVERY new user; the invited fields are optional.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_staff_invite()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_business_id uuid;
  v_role        text;
begin
  -- Read invitation metadata written by inviteStaff() on the client
  v_business_id := (new.raw_user_meta_data->>'invited_business_id')::uuid;
  v_role        := new.raw_user_meta_data->>'invited_role';

  -- Only act if both fields are present and the business exists
  if v_business_id is not null and v_role is not null
     and v_role in ('manager','cashier','inventory')
     and exists (select 1 from public.businesses where id = v_business_id) then

    -- Add member if not already a member
    insert into public.business_members (business_id, user_id, role)
    values (v_business_id, new.id, v_role)
    on conflict (business_id, user_id) do update
      set role       = excluded.role,
          is_active  = true,
          updated_at = now();

  end if;

  return new;
end;
$$;

-- Fire AFTER the existing handle_new_user trigger (which creates the profile)
drop trigger if exists on_auth_user_invited on auth.users;
create trigger on_auth_user_invited
  after insert on auth.users
  for each row execute function public.handle_staff_invite();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Customer aggregate view — fast stats without scanning all sales
--     Used by list_customers_with_stats RPC below
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.customer_stats as
select
  c.id                                                         as customer_id,
  c.business_id,
  c.full_name,
  c.phone,
  c.email,
  c.notes,
  c.created_at,
  c.updated_at,
  coalesce(sum(s.total)       filter (where s.sale_status <> 'voided'), 0) as total_purchased,
  coalesce(sum(s.amount_paid) filter (where s.sale_status <> 'voided'), 0) as total_paid,
  coalesce(sum(s.balance)     filter (where s.sale_status <> 'voided'
                                        and s.payment_status in ('partial','credit')), 0) as total_balance,
  count(s.id)                 filter (where s.sale_status <> 'voided')     as sale_count
from   public.customers c
left join public.sales  s on s.customer_id = c.id
group by c.id;

-- Grant select on the view to authenticated users
-- RLS on the underlying customers and sales tables still applies
grant select on public.customer_stats to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. list_customers_with_stats RPC — returns paginated stats
--     Avoids shipping ALL sales to the client for aggregation
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.list_customers_with_stats(
  target_business_id uuid,
  search_query       text    default null,
  only_with_balance  boolean default false,
  p_limit            integer default 100,
  p_offset           integer default 0
) returns table (
  customer_id      uuid,
  full_name        text,
  phone            text,
  email            text,
  notes            text,
  created_at       timestamptz,
  total_purchased  numeric,
  total_paid       numeric,
  total_balance    numeric,
  sale_count       bigint
) language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_business_member(target_business_id) then
    raise exception 'Not allowed to list customers for this business';
  end if;

  return query
  select
    cs.customer_id,
    cs.full_name,
    cs.phone,
    cs.email,
    cs.notes,
    cs.created_at,
    cs.total_purchased::numeric,
    cs.total_paid::numeric,
    cs.total_balance::numeric,
    cs.sale_count
  from   public.customer_stats cs
  where  cs.business_id = target_business_id
    and  (search_query is null
          or cs.full_name ilike '%' || search_query || '%'
          or cs.phone    ilike '%' || search_query || '%'
          or cs.email    ilike '%' || search_query || '%')
    and  (not only_with_balance or cs.total_balance > 0)
  order by cs.full_name
  limit  p_limit
  offset p_offset;
end;
$$;

revoke all on function public.list_customers_with_stats(uuid, text, boolean, integer, integer) from public;
grant execute on function public.list_customers_with_stats(uuid, text, boolean, integer, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. list_sales_filtered RPC — server-side filtering + pagination
--     Replaces the client-side 50-row hard limit in listSales()
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.list_sales_filtered(
  target_business_id uuid,
  search_query       text    default null,
  status_filter      text    default null,
  date_from          date    default null,
  date_to            date    default null,
  p_limit            integer default 50,
  p_offset           integer default 0
) returns table (
  id              uuid,
  receipt_number  text,
  customer_id     uuid,
  customer_name   text,
  subtotal        numeric,
  discount        numeric,
  total           numeric,
  amount_paid     numeric,
  balance         numeric,
  gross_profit    numeric,
  payment_status  text,
  sale_status     text,
  sold_by         uuid,
  due_date        date,
  created_at      timestamptz
) language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_business_member(target_business_id) then
    raise exception 'Not allowed to list sales for this business';
  end if;

  return query
  select
    s.id,
    s.receipt_number,
    s.customer_id,
    c.full_name      as customer_name,
    s.subtotal,
    s.discount,
    s.total,
    s.amount_paid,
    s.balance,
    s.gross_profit,
    s.payment_status,
    s.sale_status,
    s.sold_by,
    s.due_date,
    s.created_at
  from       public.sales     s
  left join  public.customers c on c.id = s.customer_id
  where  s.business_id = target_business_id
    -- Receipt number OR customer name search
    and  (search_query is null
          or s.receipt_number ilike '%' || search_query || '%'
          or c.full_name      ilike '%' || search_query || '%')
    -- Payment or sale status filter
    and  (status_filter is null
          or s.payment_status = status_filter
          or s.sale_status    = status_filter)
    -- Date range (inclusive)
    and  (date_from is null or s.created_at::date >= date_from)
    and  (date_to   is null or s.created_at::date <= date_to)
  order by s.created_at desc
  limit  p_limit
  offset p_offset;
end;
$$;

revoke all on function public.list_sales_filtered(uuid, text, text, date, date, integer, integer) from public;
grant execute on function public.list_sales_filtered(uuid, text, text, date, date, integer, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. get_dashboard_stats RPC — accurate debtCount + today's expenses
--     Replaces the three-query client pattern in getDashboardStats()
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_dashboard_stats(
  target_business_id uuid,
  tz_offset_hours    integer default 3   -- EAT = UTC+3
) returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  today_start  timestamptz;
  today_end    timestamptz;
  result       jsonb;
begin
  if not public.is_business_member(target_business_id) then
    raise exception 'Not allowed to view stats for this business';
  end if;

  -- Compute "today" in the business's local time
  today_start := date_trunc('day', now() at time zone 'UTC' + (tz_offset_hours || ' hours')::interval)
                   - (tz_offset_hours || ' hours')::interval;
  today_end   := today_start + interval '1 day';

  select jsonb_build_object(
    'today_sales',        coalesce(sum(s.total)        filter (where s.created_at >= today_start and s.created_at < today_end), 0),
    'today_profit',       coalesce(sum(s.gross_profit) filter (where s.created_at >= today_start and s.created_at < today_end), 0),
    'today_transactions', coalesce(count(s.id)         filter (where s.created_at >= today_start and s.created_at < today_end), 0),
    'today_expenses',     coalesce((
                            select sum(e.amount)
                            from   public.expenses e
                            where  e.business_id = target_business_id
                              and  e.expense_date = (today_start at time zone 'UTC')::date
                          ), 0),
    'outstanding_debt',   coalesce(sum(s.balance) filter (where s.payment_status in ('partial','credit')), 0),
    'debt_customer_count', (
                            select count(distinct s2.customer_id)
                            from   public.sales s2
                            where  s2.business_id  = target_business_id
                              and  s2.sale_status   = 'completed'
                              and  s2.payment_status in ('partial','credit')
                              and  s2.customer_id   is not null
                          )
  )
  into result
  from public.sales s
  where s.business_id = target_business_id
    and s.sale_status = 'completed';

  return result;
end;
$$;

revoke all on function public.get_dashboard_stats(uuid, integer) from public;
grant execute on function public.get_dashboard_stats(uuid, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. get_stock_movements — paginated product stock history
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_stock_movements(
  target_product_id uuid,
  p_limit           integer default 50,
  p_offset          integer default 0
) returns table (
  id            uuid,
  movement_type text,
  quantity      integer,
  reason        text,
  reference_id  uuid,
  receipt_number text,
  staff_name    text,
  created_at    timestamptz
) language plpgsql stable security definer set search_path = public
as $$
declare
  v_business_id uuid;
begin
  select business_id into v_business_id
  from   public.products
  where  id = target_product_id;

  if not found or not public.is_business_member(v_business_id) then
    raise exception 'Product not found or access denied';
  end if;

  return query
  select
    sm.id,
    sm.movement_type,
    sm.quantity,
    sm.reason,
    sm.reference_id,
    sl.receipt_number,
    pr.full_name   as staff_name,
    sm.created_at
  from       public.stock_movements sm
  left join  public.sales           sl on sl.id = sm.reference_id
  left join  public.profiles        pr on pr.id = sm.created_by
  where  sm.product_id = target_product_id
  order by sm.created_at desc
  limit  p_limit
  offset p_offset;
end;
$$;

revoke all on function public.get_stock_movements(uuid, integer, integer) from public;
grant execute on function public.get_stock_movements(uuid, integer, integer) to authenticated;
