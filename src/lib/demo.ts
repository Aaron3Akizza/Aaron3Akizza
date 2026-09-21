/**
 * BizFlow Demo Mode
 * -----------------
 * In-memory mock data store. Used when Supabase is not configured or when
 * the user is in demo mode. Every module reads/writes from this store so
 * all dashboard tabs, CRUD operations, and calculations work realistically.
 *
 * No real database, no IMEIs, no credentials required.
 */

import type { Product } from "./inventory";
import type { Sale } from "./sales";
import type { Expense } from "./expenses";
import type { CustomerProfile } from "./customers";

// ─── Stable IDs ──────────────────────────────────────────────────────────────
export const DEMO_BUSINESS_ID = "demo-business-001";
export const DEMO_USER_ID = "demo-user-001";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// Products
const _products: Product[] = [
  {
    id: "prod-001", business_id: DEMO_BUSINESS_ID,
    name: "Samsung Galaxy A15", sku: "SAM-A15-128", category: "Phones",
    brand: "Samsung", model: "Galaxy A15", inventory_type: "individual",
    buying_price: 700000, selling_price: 850000, quantity: 0,
    minimum_stock: 2, supplier: "MTN Distributor", image_url: null,
    description: "128GB, 6GB RAM", is_active: true,
    created_at: daysAgo(30), updated_at: daysAgo(1),
    product_devices: [
      { id: "dev-001", imei: "123456789012341", imei_2: null, serial_number: "SN001", storage: "128GB", ram: "6GB", color: "Black", condition: "New", status: "in_stock", buying_price: 700000, selling_price: 850000 },
      { id: "dev-002", imei: "123456789012342", imei_2: null, serial_number: "SN002", storage: "128GB", ram: "6GB", color: "Blue", condition: "New", status: "in_stock", buying_price: 700000, selling_price: 850000 },
      { id: "dev-003", imei: "123456789012343", imei_2: null, serial_number: "SN003", storage: "256GB", ram: "8GB", color: "Black", condition: "New", status: "sold", buying_price: 720000, selling_price: 870000 },
    ],
  },
  {
    id: "prod-002", business_id: DEMO_BUSINESS_ID,
    name: "Tecno Spark 30", sku: "TEC-SP30", category: "Phones",
    brand: "Tecno", model: "Spark 30", inventory_type: "individual",
    buying_price: 410000, selling_price: 520000, quantity: 0,
    minimum_stock: 2, supplier: "Airtel Distributor", image_url: null,
    description: "128GB, 4GB RAM", is_active: true,
    created_at: daysAgo(25), updated_at: daysAgo(2),
    product_devices: [
      { id: "dev-004", imei: "123456789012344", imei_2: null, serial_number: "SN004", storage: "128GB", ram: "4GB", color: "Black", condition: "New", status: "in_stock", buying_price: 410000, selling_price: 520000 },
      { id: "dev-005", imei: "123456789012345", imei_2: null, serial_number: "SN005", storage: "128GB", ram: "4GB", color: "Gold", condition: "New", status: "sold", buying_price: 410000, selling_price: 520000 },
    ],
  },
  {
    id: "prod-003", business_id: DEMO_BUSINESS_ID,
    name: "Itel P55", sku: "ITE-P55", category: "Phones",
    brand: "Itel", model: "P55", inventory_type: "individual",
    buying_price: 245000, selling_price: 310000, quantity: 0,
    minimum_stock: 3, supplier: null, image_url: null,
    description: "64GB, 4GB RAM", is_active: true,
    created_at: daysAgo(20), updated_at: daysAgo(3),
    product_devices: [
      { id: "dev-006", imei: "123456789012346", imei_2: null, serial_number: null, storage: "64GB", ram: "4GB", color: "Blue", condition: "New", status: "in_stock", buying_price: 245000, selling_price: 310000 },
    ],
  },
  {
    id: "prod-004", business_id: DEMO_BUSINESS_ID,
    name: "Oraimo Fast Charger 33W", sku: "ORA-FC33", category: "Accessories",
    brand: "Oraimo", model: "OCW-33W", inventory_type: "quantity",
    buying_price: 21000, selling_price: 35000, quantity: 58,
    minimum_stock: 15, supplier: "Oraimo Uganda", image_url: null,
    description: "Fast charging 33W", is_active: true,
    created_at: daysAgo(15), updated_at: daysAgo(0),
    product_devices: [],
  },
  {
    id: "prod-005", business_id: DEMO_BUSINESS_ID,
    name: "Oraimo Earphones E63", sku: "ORA-E63", category: "Accessories",
    brand: "Oraimo", model: "E63", inventory_type: "quantity",
    buying_price: 17000, selling_price: 28000, quantity: 8,
    minimum_stock: 10, supplier: "Oraimo Uganda", image_url: null,
    description: "In-ear earphones", is_active: true,
    created_at: daysAgo(10), updated_at: daysAgo(1),
    product_devices: [],
  },
  {
    id: "prod-006", business_id: DEMO_BUSINESS_ID,
    name: "Tempered Glass Protector", sku: "ACC-GLASS", category: "Accessories",
    brand: "Generic", model: "Universal", inventory_type: "quantity",
    buying_price: 3000, selling_price: 8000, quantity: 140,
    minimum_stock: 30, supplier: null, image_url: null,
    description: "Universal screen protector", is_active: true,
    created_at: daysAgo(8), updated_at: daysAgo(0),
    product_devices: [],
  },
  {
    id: "prod-007", business_id: DEMO_BUSINESS_ID,
    name: "32GB Memory Card", sku: "ACC-SD32", category: "Accessories",
    brand: "SanDisk", model: "Ultra 32GB", inventory_type: "quantity",
    buying_price: 16000, selling_price: 25000, quantity: 4,
    minimum_stock: 10, supplier: null, image_url: null,
    description: null, is_active: true,
    created_at: daysAgo(5), updated_at: daysAgo(0),
    product_devices: [],
  },
];

// Customers
const _customers: CustomerProfile[] = [
  { id: "cust-001", business_id: DEMO_BUSINESS_ID, full_name: "Grace Nakato", phone: "0770123456", email: null, notes: "Regular customer", created_at: daysAgo(20), total_purchased: 1370000, total_paid: 1020000, total_balance: 350000, sale_count: 3 },
  { id: "cust-002", business_id: DEMO_BUSINESS_ID, full_name: "Michael Otieno", phone: "0752987654", email: "michael@gmail.com", notes: null, created_at: daysAgo(15), total_purchased: 520000, total_paid: 520000, total_balance: 0, sale_count: 1 },
  { id: "cust-003", business_id: DEMO_BUSINESS_ID, full_name: "Ronald Kato", phone: "0701456789", email: null, notes: null, created_at: daysAgo(10), total_purchased: 890000, total_paid: 0, total_balance: 890000, sale_count: 1 },
  { id: "cust-004", business_id: DEMO_BUSINESS_ID, full_name: "Sarah Atim", phone: "0782345678", email: null, notes: "Pays on time", created_at: daysAgo(7), total_purchased: 310000, total_paid: 310000, total_balance: 0, sale_count: 1 },
];

// Expenses
const _expenses: Expense[] = [
  { id: "exp-001", business_id: DEMO_BUSINESS_ID, category: "Rent", amount: 500000, description: "Monthly rent for shop", expense_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), recorded_by: DEMO_USER_ID, created_at: daysAgo(25) },
  { id: "exp-002", business_id: DEMO_BUSINESS_ID, category: "Electricity", amount: 85000, description: "UMEME electricity bill", expense_date: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString().slice(0, 10), recorded_by: DEMO_USER_ID, created_at: daysAgo(20) },
  { id: "exp-003", business_id: DEMO_BUSINESS_ID, category: "Transport", amount: 45000, description: "Stock pickup from distributor", expense_date: new Date(new Date().getFullYear(), new Date().getMonth(), 8).toISOString().slice(0, 10), recorded_by: DEMO_USER_ID, created_at: daysAgo(15) },
  { id: "exp-004", business_id: DEMO_BUSINESS_ID, category: "Airtime", amount: 20000, description: "Staff airtime", expense_date: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().slice(0, 10), recorded_by: DEMO_USER_ID, created_at: daysAgo(10) },
  { id: "exp-005", business_id: DEMO_BUSINESS_ID, category: "Stock purchase", amount: 2100000, description: "Samsung and Tecno phones restock", expense_date: new Date(new Date().getFullYear(), new Date().getMonth(), 12).toISOString().slice(0, 10), recorded_by: DEMO_USER_ID, created_at: daysAgo(7) },
];

// Sales
const _sales: Sale[] = [
  { id: "sale-001", receipt_number: "BF-2026-000001", customer_id: "cust-001", subtotal: 850000, discount: 0, total: 850000, amount_paid: 500000, balance: 350000, cost_of_goods: 700000, gross_profit: 150000, payment_status: "partial", sale_status: "completed", sold_by: DEMO_USER_ID, due_date: null, created_at: daysAgo(12) },
  { id: "sale-002", receipt_number: "BF-2026-000002", customer_id: "cust-002", subtotal: 520000, discount: 0, total: 520000, amount_paid: 520000, balance: 0, cost_of_goods: 410000, gross_profit: 110000, payment_status: "paid", sale_status: "completed", sold_by: DEMO_USER_ID, due_date: null, created_at: daysAgo(10) },
  { id: "sale-003", receipt_number: "BF-2026-000003", customer_id: "cust-003", subtotal: 890000, discount: 0, total: 890000, amount_paid: 0, balance: 890000, cost_of_goods: 700000, gross_profit: 190000, payment_status: "credit", sale_status: "completed", sold_by: DEMO_USER_ID, due_date: null, created_at: daysAgo(8) },
  { id: "sale-004", receipt_number: "BF-2026-000004", customer_id: null, subtotal: 35000, discount: 0, total: 35000, amount_paid: 35000, balance: 0, cost_of_goods: 21000, gross_profit: 14000, payment_status: "paid", sale_status: "completed", sold_by: DEMO_USER_ID, due_date: null, created_at: daysAgo(5) },
  { id: "sale-005", receipt_number: "BF-2026-000005", customer_id: "cust-004", subtotal: 310000, discount: 10000, total: 300000, amount_paid: 300000, balance: 0, cost_of_goods: 245000, gross_profit: 55000, payment_status: "paid", sale_status: "completed", sold_by: DEMO_USER_ID, due_date: null, created_at: daysAgo(3) },
  { id: "sale-006", receipt_number: "BF-2026-000006", customer_id: "cust-001", subtotal: 56000, discount: 0, total: 56000, amount_paid: 56000, balance: 0, cost_of_goods: 34000, gross_profit: 22000, payment_status: "paid", sale_status: "completed", sold_by: DEMO_USER_ID, due_date: null, created_at: daysAgo(2) },
  { id: "sale-007", receipt_number: "BF-2026-000007", customer_id: null, subtotal: 520000, discount: 20000, total: 500000, amount_paid: 500000, balance: 0, cost_of_goods: 410000, gross_profit: 90000, payment_status: "paid", sale_status: "completed", sold_by: DEMO_USER_ID, due_date: null, created_at: daysAgo(1) },
  { id: "sale-008", receipt_number: "BF-2026-000008", customer_id: "cust-001", subtotal: 310000, discount: 0, total: 310000, amount_paid: 200000, balance: 110000, cost_of_goods: 245000, gross_profit: 65000, payment_status: "partial", sale_status: "completed", sold_by: DEMO_USER_ID, due_date: null, created_at: daysAgo(0) },
];

// ─── Exported stores (mutable arrays) ────────────────────────────────────────
export const demoProducts = { list: () => [..._products], add: (p: Product) => _products.push(p), update: (id: string, changes: Partial<Product>) => { const i = _products.findIndex((x) => x.id === id); if (i >= 0) Object.assign(_products[i], changes); }, remove: (id: string) => { const i = _products.findIndex((x) => x.id === id); if (i >= 0) _products.splice(i, 1); } };
export const demoCustomers = { list: () => [..._customers], add: (c: CustomerProfile) => _customers.push(c), update: (id: string, changes: Partial<CustomerProfile>) => { const i = _customers.findIndex((x) => x.id === id); if (i >= 0) Object.assign(_customers[i], changes); } };
export const demoExpenses = { list: () => [..._expenses], add: (e: Expense) => _expenses.push(e), remove: (id: string) => { const i = _expenses.findIndex((x) => x.id === id); if (i >= 0) _expenses.splice(i, 1); } };
export const demoSales = { list: () => [..._sales], add: (s: Sale) => _sales.push(s) };

// ─── Demo auth / business ─────────────────────────────────────────────────────
export const DEMO_BUSINESS = {
  id: DEMO_BUSINESS_ID,
  name: "ABC Mobile Shop",
  owner_id: DEMO_USER_ID,
  phone: "+256 700 000 000",
  email: "shop@abc.com",
  location: "Kampala, Uganda",
  currency: "UGX",
};

export const DEMO_MEMBERSHIP = {
  id: "mem-001",
  business_id: DEMO_BUSINESS_ID,
  user_id: DEMO_USER_ID,
  role: "owner",
  business: DEMO_BUSINESS,
};

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: "demo@bizflow.app",
  user_metadata: { full_name: "Demo Owner", phone: "+256 700 000 000" },
  app_metadata: {},
  aud: "authenticated",
  created_at: daysAgo(30),
};
