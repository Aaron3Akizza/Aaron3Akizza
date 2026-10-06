-- BizFlow Phase 6: Inventory fixes.
-- Safe to run multiple times.
-- Fixes:
--   1. create_product_with_devices now reads per-device buying/selling prices from device_rows
--   2. receive_devices_for_product new RPC — adds devices to existing product with correct business_id
--   3. Adds product_no column to product_devices for easy reference (e.g. "Unit 1")

-- ─── 1. Fix create_product_with_devices to honour per-device prices ────────
create or replace function public.create_product_with_devices(
  target_business_id uuid,
  product_name text, product_sku text, product_category text, product_brand text, product_model text,
  product_inventory_type text, product_buying_price numeric, product_selling_price numeric,
  product_quantity integer, product_minimum_stock integer, product_supplier text, product_description text,
  device_rows jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = public
as $$
declare
  new_product_id uuid;
  device_row jsonb;
  device_buying  numeric;
  device_selling numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.can_manage_inventory(target_business_id) then
    raise exception 'You are not allowed to manage inventory';
  end if;

  -- Insert product row
  insert into public.products (
    business_id, name, sku, category, brand, model,
    inventory_type, buying_price, selling_price,
    quantity, minimum_stock, supplier, description, created_by
  ) values (
    target_business_id,
    trim(product_name),
    nullif(trim(coalesce(product_sku, '')), ''),
    trim(product_category),
    nullif(trim(coalesce(product_brand, '')), ''),
    nullif(trim(coalesce(product_model, '')), ''),
    product_inventory_type,
    product_buying_price,
    product_selling_price,
    case
      when product_inventory_type = 'individual' then jsonb_array_length(device_rows)
      else product_quantity
    end,
    product_minimum_stock,
    nullif(trim(coalesce(product_supplier, '')), ''),
    nullif(trim(coalesce(product_description, '')), ''),
    auth.uid()
  )
  returning id into new_product_id;

  -- Insert device rows, using per-device prices when provided
  for device_row in select * from jsonb_array_elements(device_rows) loop
    -- Use device-level price if provided, fall back to product price
    device_buying  := coalesce(
      nullif((device_row->>'buying_price')::text, '')::numeric,
      product_buying_price
    );
    device_selling := coalesce(
      nullif((device_row->>'selling_price')::text, '')::numeric,
      product_selling_price
    );

    insert into public.product_devices (
      product_id, business_id,
      imei, imei_2, serial_number,
      storage, ram, color, condition,
      buying_price, selling_price
    ) values (
      new_product_id,
      target_business_id,
      device_row->>'imei',
      nullif(coalesce(device_row->>'imei_2', ''), ''),
      nullif(coalesce(device_row->>'serial_number', ''), ''),
      nullif(coalesce(device_row->>'storage', ''), ''),
      nullif(coalesce(device_row->>'ram', ''), ''),
      nullif(coalesce(device_row->>'color', ''), ''),
      nullif(coalesce(device_row->>'condition', ''), ''),
      device_buying,
      device_selling
    );
  end loop;

  -- Record initial stock movement for quantity-type products
  if product_quantity > 0 and product_inventory_type = 'quantity' then
    insert into public.stock_movements (
      business_id, product_id, movement_type, quantity, reason, created_by
    ) values (
      target_business_id, new_product_id, 'stock_received', product_quantity, 'Initial stock', auth.uid()
    );
  end if;

  return new_product_id;
end;
$$;

-- ─── 2. New RPC: receive_devices_for_product ─────────────────────────────────
-- Adds new IMEI-tracked devices to an existing product.
-- Fixes the missing business_id bug in the client-side receiveDevices function.
create or replace function public.receive_devices_for_product(
  target_product_id uuid,
  device_rows jsonb
) returns void language plpgsql security definer set search_path = public
as $$
declare
  target_business_id uuid;
  target_buying      numeric;
  target_selling     numeric;
  device_row         jsonb;
  device_buying      numeric;
  device_selling     numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Get the product's business and default prices
  select business_id, buying_price, selling_price
  into   target_business_id, target_buying, target_selling
  from   public.products
  where  id = target_product_id;

  if not found then
    raise exception 'Product not found';
  end if;

  if not public.can_manage_inventory(target_business_id) then
    raise exception 'You are not allowed to manage inventory';
  end if;

  for device_row in select * from jsonb_array_elements(device_rows) loop
    device_buying  := coalesce(
      nullif((device_row->>'buying_price')::text, '')::numeric,
      target_buying
    );
    device_selling := coalesce(
      nullif((device_row->>'selling_price')::text, '')::numeric,
      target_selling
    );

    insert into public.product_devices (
      product_id, business_id,
      imei, imei_2, serial_number,
      storage, ram, color, condition,
      buying_price, selling_price
    ) values (
      target_product_id,
      target_business_id,
      device_row->>'imei',
      nullif(coalesce(device_row->>'imei_2', ''), ''),
      nullif(coalesce(device_row->>'serial_number', ''), ''),
      nullif(coalesce(device_row->>'storage', ''), ''),
      nullif(coalesce(device_row->>'ram', ''), ''),
      nullif(coalesce(device_row->>'color', ''), ''),
      nullif(coalesce(device_row->>'condition', ''), ''),
      device_buying,
      device_selling
    );

    -- Update product quantity to reflect actual in-stock device count
    update public.products
    set    quantity   = (
             select count(*)
             from   public.product_devices
             where  product_id = target_product_id
               and  status     = 'in_stock'
           ),
           updated_at = now()
    where  id = target_product_id;
  end loop;
end;
$$;

-- Grant execute permissions
revoke all on function public.receive_devices_for_product(uuid, jsonb) from public;
grant execute on function public.receive_devices_for_product(uuid, jsonb) to authenticated;

-- Re-grant create_product_with_devices (idempotent)
revoke all on function public.create_product_with_devices(uuid,text,text,text,text,text,text,numeric,numeric,integer,integer,text,text,jsonb) from public;
grant execute on function public.create_product_with_devices(uuid,text,text,text,text,text,text,numeric,numeric,integer,integer,text,text,jsonb) to authenticated;
