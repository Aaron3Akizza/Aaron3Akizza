-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Apple iPhone 14 product with 3 devices
-- Run this in Supabase SQL Editor AFTER you have:
--   1. Signed up and created your business
--   2. Run all phase SQL files (phase1 through phase5)
--
-- HOW TO USE:
--   1. Go to Supabase → SQL Editor → New query
--   2. Paste this entire file
--   3. Replace YOUR_BUSINESS_ID below with your actual business ID
--      (Find it in Table Editor → businesses → copy the id column)
--   4. Replace YOUR_USER_ID with your user ID
--      (Find it in Authentication → Users → copy your user's id)
--   5. Click Run
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_business_id uuid := 'YOUR_BUSINESS_ID';   -- ← replace this
  v_user_id     uuid := 'YOUR_USER_ID';        -- ← replace this
  v_product_id  uuid;
begin
  -- Insert the product
  insert into public.products (
    business_id, name, sku, category, brand, model,
    inventory_type, buying_price, selling_price,
    quantity, minimum_stock, supplier, description,
    is_active, created_by
  ) values (
    v_business_id,
    'Apple iPhone 14',
    'APL-IP14-128',
    'Phones',
    'Apple',
    'iPhone 14',
    'individual',
    2800000,
    3500000,
    0,
    1,
    'Dubai Imports',
    '128GB, 5G, Face ID — Brand new sealed box with all accessories',
    true,
    v_user_id
  )
  returning id into v_product_id;

  -- Insert 3 devices
  insert into public.product_devices (
    product_id, business_id, imei, imei_2, serial_number,
    storage, ram, color, condition, status,
    buying_price, selling_price
  ) values
  (
    v_product_id, v_business_id,
    '356938035643809', null, 'F2LXXXXXXXAF',
    '128GB', '6GB', 'Midnight Black', 'New', 'in_stock',
    2800000, 3500000
  ),
  (
    v_product_id, v_business_id,
    '356938035643810', null, 'F2LXXXXXXXAG',
    '128GB', '6GB', 'Starlight White', 'New', 'in_stock',
    2800000, 3500000
  ),
  (
    v_product_id, v_business_id,
    '356938035643811', null, 'F2LXXXXXXXAH',
    '256GB', '6GB', 'Purple', 'New', 'in_stock',
    3100000, 3900000
  );

  raise notice 'iPhone 14 added successfully. Product ID: %', v_product_id;
end;
$$;
