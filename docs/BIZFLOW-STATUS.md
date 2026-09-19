# BizFlow Development Status

## Implemented

- Existing landing page and authenticated shell remain intact.
- Products now load from Supabase with a 50-row page window, loading/error/empty states, search, category/type/stock filters, and responsive desktop/mobile layouts.
- Products support quantity inventory and individually tracked devices.
- Product creation persists pricing, SKU, category, supplier, description, initial quantity, or device records.
- Device creation validates IMEIs with the standard Luhn checksum and database constraints enforce 15-digit formatting and business-scoped uniqueness.
- Product details show stock, prices, estimated margin, inventory value, metadata, and device records.
- Authorized users can edit product details, receive quantity stock, and make signed quantity adjustments with required reasons. Each creation receipt, receipt, or adjustment records a `stock_movements` row atomically.
- Owner, manager, and inventory roles can mutate inventory; cashiers can read products but cannot execute inventory RPCs or update products.

## Partially implemented

- Product activation/deactivation is represented in the database and shown in product data, but the current detail UI does not yet expose a dedicated toggle.
- Individual-device receiving after initial product creation is not yet a separate workflow; devices can be added during product creation.
- Search is database-backed for the page window and includes IMEI values returned with devices. Full server-side text search/pagination beyond the first 50 records is a future optimization.
- Product images have an `image_url` field, but Supabase Storage bucket configuration and upload UI are not implemented.

## Database

- Added `db/phase2_products_inventory.sql` with `products`, `product_devices`, and `stock_movements`.
- Added indexes for business, category, brand, product-device, and movement lookups.
- Added security-definer RPCs for product/device creation, quantity receiving, and quantity adjustment.
- Removed the orphaned SQL fragment from the Phase 1 schema.

## Security

- RLS is enabled on all Phase 2 tables.
- Product/device/movement reads require active membership through `is_business_member`.
- Product updates and inventory mutations require owner, manager, or inventory role through `can_manage_inventory`.
- RPCs derive the authenticated creator from `auth.uid()` and verify the target business membership; client business IDs are not trusted without that check.
- Database constraints prevent negative quantities, invalid prices, invalid IMEI formatting, and duplicate IMEIs/SKUs within a business.

## Not yet implemented

- The migration has not been applied to a live Supabase project in this environment, so live CRUD, RLS cross-business isolation, role denial, and duplicate-IMEI responses remain unverified.
- Sales, checkout, payments, customers, expenses, reports, and supplier management remain out of scope.

## Phase 3 verification gate

### Verified in live Supabase

None. This workspace contains no `.env` file, Supabase project reference, project URL, publishable key, Supabase CLI, or `psql` client. No live database operation is being claimed.

### Implemented but not yet live-tested

The Phase 3 SQL and frontend workflow are implemented in code, but cash sales, credit sales, device sales, duplicate IMEI rejection, insufficient stock, concurrency, RLS isolation, cashier permissions, and void reversal require a configured Supabase project and applied migrations.

### Failed tests fixed

- Corrected the Phase 1 `auth.users` trigger declaration so the SQL is executable.
- Added an immutable product tenant/creator trigger to prevent cross-business product reassignment.
- Made void stock restoration fail the transaction when the expected product/device row is not restored.

### Known remaining issues

- Phase 3 has no due-date or later debt-payment workflow yet; those belong with Customers + Debt Management.
- Printed receipt output is currently a minimal confirmation view rather than a complete itemized receipt.
- Existing dashboard statistics remain sample data.

### Local validation

`npm run build` passes. Workspace diagnostics report no errors for the changed TypeScript/JSX files. No automated test runner is configured.

## Sales and checkout

- Added `db/phase3_sales.sql` with customers, sales, sale items, payments, and a per-business receipt counter.
- Added atomic `complete_sale` and `void_sale` security-definer functions. Checkout locks products/devices, validates business membership and role, snapshots product name/prices/cost, records payment and stock movements, calculates COGS/gross profit, and generates receipts such as `BF-2026-000001`.
- Added `/sales` history and `/sales/new` checkout routes. The existing shell's Sales navigation now opens the real sales history.
- Checkout supports quantity items, specific IMEI device selection, walk-in or new/existing customer selection, discounts, payment methods, payment references, balances, receipts, printing, and controlled manager/owner-only voiding.

## Known limitations

- The Phase 3 migration has not been applied to a live Supabase project here, so cash/credit/device/concurrency/RLS/permission smoke tests remain pending.
- Sale history currently loads the latest 50 records and has no date/status search controls yet.
- Receipt view is intentionally minimal; full itemized receipt data is available from sale details, while PDF/WhatsApp and refunds remain future work.
- Dashboard cards still use the existing sample data and are not yet connected to sales aggregates.

## Next phase

Apply all three SQL files to Supabase in dependency order, run the complete Phase 3 verification matrix, fix any live failures, and only then implement **Customers + Debt Management**.
