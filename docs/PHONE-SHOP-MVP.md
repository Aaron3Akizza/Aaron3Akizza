# BizFlow — Phone Shop MVP Requirements

This document records the exact product behavior agreed for BizFlow's first
release. It is the reference for what "correct" looks like when building the
Sales, Products, and Customers modules. Everything described here is
**PLANNED** unless the note next to it says otherwise — cross-check against
`docs/BIZFLOW-STATUS.md` before assuming something is built.

BizFlow v1 is scoped specifically to **small phone and phone-accessory
shops**. Brands and product names below (Samsung, Tecno, Infinix, iTel,
Xiaomi, Redmi, Oppo, Nokia, Apple, Oraimo, etc.) are examples for demo data
only — they must never be hardcoded into application logic. The merchant
creates their own product catalog.

---

## Products

A product is either:

- **A phone** — usually tracked as individual devices.
- **An accessory** — chargers, cables, earphones, headphones, power banks,
  cases, screen protectors, memory cards, smart watches, adapters, etc. —
  usually tracked by quantity.

Every product has: name, SKU, category, brand, model, buying price, selling
price, quantity, minimum stock level, supplier, image, description, date
added, active/inactive status.

### Two tracking modes

Every product declares a `tracking_mode`:

1. **`device`** — Track individual device. Used for phones. Each unit is its
   own row with its own IMEI, serial number, storage, RAM, color, and
   condition (New / Used). Selling one device marks that specific unit sold
   — it does not just decrement a shared counter.
2. **`quantity`** — Track quantity. Used for accessories. A single row holds
   a running count; selling N units decrements that count by N.

**Do not force IMEI/serial/storage/RAM/color/condition fields onto
accessories.** Those fields only apply to `device`-tracked products.

**Reference implementation:** `src/pages/AppShell.jsx` → `ProductsScreen` and
its `AddProductModal` already model this exact distinction with sample data
(`SAMPLE_PRODUCTS`), including the toggle between "Track quantity" and
"Track individual device" in the add-product form, and an expandable IMEI
list per device-tracked product. This is UI-only today — there is no
persistence — but the behavior it demonstrates is the target behavior.

---

## Inventory / stock management

Every inventory change must be recorded, never applied silently. Recognized
movement types:

- Stock received
- Sale
- Return
- Damaged
- Lost
- Manual adjustment

Each movement records: product, quantity, reason, date, and the user
responsible. See `stock_movements` in `docs/BIZFLOW-ARCHITECTURE.md` /
`db/bizflow_schema.sql` for the planned schema.

Example of the expected behavior once Sales is implemented:

```
Initial stock: Samsung A15 = 10
Customer buys: 2
New stock:     8
(one stock_movements row: movement_type = 'sale', quantity = -2)
```

---

## Sales

The sales workflow must be fast:

```
Search product → Select product → Quantity → Price → Customer → Payment → Complete sale
```

Supported payment methods: **Cash, Mobile Money, Bank, Card, Credit.** The
payment architecture should stay flexible enough to add processors later
without a redesign (this is why `payments` is a separate table from `sales`
in the planned schema — a sale can accumulate multiple payments over time).

### Selling a device-tracked phone

When the product being sold uses `device` tracking, the cashier selects the
**specific unit** (by IMEI) being sold, not just a quantity. That IMEI must
appear on the resulting receipt. This is one of BizFlow's differentiating
capabilities for phone shops and should not be simplified away.

---

## Credit / customer debt

A sale can be paid in full, partially, or entirely on credit. The system
must track, per sale: original amount, amount paid, remaining balance, due
date, and full payment history. Example:

```
Customer: Michael
Purchase: Samsung A15 — UGX 850,000
Paid:     UGX 500,000
Balance:  UGX 350,000
```

A customer's profile must clearly surface **total purchased**, **total
paid**, and **amount owed** at a glance — not require the viewer to add up a
transaction list themselves.

**Reference implementation:** `AppShell.jsx` → `DashboardScreen` already
renders a "Customers owing" panel and `CUSTOMERS_OWING` sample data in this
exact shape (name, amount owed, due status). The Customers module itself
(full profile view) is not yet built.

---

## Customer management

A customer profile includes: full name, phone number, email,
address/location, purchase history, payment history, outstanding debt, and
notes. The goal is that opening a customer record immediately answers "what
is our relationship with this person" — not just "what is their name."

---

## Expenses

Recorded expenses include category (rent, electricity, transport, airtime,
internet, salaries, repairs, packaging, other), amount, description, date,
and who recorded it. Expense data feeds directly into the profit calculation
— see "Business calculations" below.

---

## Reports

Required reports for v1:

- **Sales report:** total sales, number of transactions, average sale,
  sales by day, sales by product, sales by staff member.
- **Profit report:** revenue, cost of goods sold, gross profit, expenses,
  net profit.
- **Inventory report:** current stock, stock value, low-stock products,
  fast-moving products, slow-moving products.
- **Customer debt report:** total outstanding, customers owing, amount owed
  per customer.

All reports must support filtering by **Today, This week, This month,
Custom date range**, and should be built so PDF/CSV export can be added
later without restructuring the underlying queries.

---

## Business calculations (must be correct, not approximate)

```
Revenue           = total amount charged for sales
Cost of Goods Sold = cost associated with the specific units sold
Gross Profit       = Revenue - Cost of Goods Sold
Net Profit         = Gross Profit - Expenses
```

**Total sales is never the same thing as profit.** Example:

```
Buying price:  UGX 700,000
Selling price: UGX 850,000
Profit:        UGX 150,000
```

These calculations must be derived from real transaction data once the
backend exists (see `unit_cost` on `sale_items` in the planned schema, which
exists specifically so COGS stays accurate even if a product's price changes
after the sale).

---

## Alerts and semantic color use

Use BizFlow's established semantic colors — never decoratively:

- **Green** — growth, success, healthy activity.
- **Amber** — attention required (low stock, upcoming debt payment).
- **Red** — danger, critical issue, destructive action (critical stock
  shortage, failed transaction, delete confirmation).

See `docs/BIZFLOW-DESIGN-SYSTEM.md` for the full color system.

---

## Explicitly out of scope for this MVP

Do not add: AI assistants, predictive analytics, full accounting/payroll,
e-commerce, delivery management, supplier marketplace, cryptocurrency,
social features, chat systems, or unnecessary third-party integrations.
These may become future products — they are not part of the phone-shop MVP.
