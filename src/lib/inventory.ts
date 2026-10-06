import { supabase } from "./supabase";
import { demoProducts, DEMO_BUSINESS_ID } from "./demo";

export type InventoryType = "quantity" | "individual";
export type DeviceStatus = "in_stock" | "sold" | "returned" | "damaged" | "lost";

export type Device = {
  id: string;
  imei: string;
  imei_2: string | null;
  serial_number: string | null;
  storage: string | null;
  ram: string | null;
  color: string | null;
  condition: string | null;
  status: DeviceStatus;
  buying_price: number | null;
  selling_price: number | null;
};

export type Product = {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  category: string;
  brand: string | null;
  model: string | null;
  inventory_type: InventoryType;
  buying_price: number;
  selling_price: number;
  quantity: number;
  minimum_stock: number;
  supplier: string | null;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_devices?: Device[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isDemo = (businessId: string) => businessId === DEMO_BUSINESS_ID || !supabase;

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Sanitise a device object — convert empty strings to null for DB constraints */
function cleanDevice(d: Partial<Device>) {
  return {
    imei: d.imei?.trim() || null,
    imei_2: d.imei_2?.trim() || null,
    serial_number: d.serial_number?.trim() || null,
    storage: d.storage?.trim() || null,
    ram: d.ram?.trim() || null,
    color: d.color?.trim() || null,
    condition: d.condition?.trim() || "New",
    buying_price: (d.buying_price != null && d.buying_price > 0) ? d.buying_price : null,
    selling_price: (d.selling_price != null && d.selling_price > 0) ? d.selling_price : null,
  };
}

// ─── IMEI Validation ──────────────────────────────────────────────────────────

/**
 * Validate an IMEI.
 * - In demo mode: accept any non-empty string (no real IMEI required).
 * - In real mode: must be exactly 15 digits AND pass the Luhn checksum.
 */
export function isValidImei(value: string): boolean {
  const digits = value.trim();
  if (!supabase) {
    // Demo mode — just needs to be non-empty
    return digits.length > 0;
  }
  if (!/^\d{15}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/**
 * Check IMEI validity and return a user-friendly message, or null if valid.
 */
export function imeiError(value: string): string | null {
  const v = value.trim();
  if (!v) return "IMEI is required.";
  if (!supabase) return null; // demo — anything goes
  if (!/^\d{15}$/.test(v)) return "IMEI must be exactly 15 digits.";
  if (!isValidImei(v)) return "IMEI checksum is invalid. Double-check the number.";
  return null;
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function listProducts(
  businessId: string,
  page = 0,
  pageSize = 100
): Promise<Product[]> {
  if (isDemo(businessId)) return demoProducts.list();
  const { data, error } = await client()
    .from("products")
    .select("*, product_devices(*)")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;
  return (data ?? []) as Product[];
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createProduct(
  businessId: string,
  product: Omit<Product, "id" | "business_id" | "created_at" | "updated_at" | "is_active" | "product_devices"> & {
    devices?: Partial<Device>[];
  }
): Promise<Product> {
  const { devices = [], ...fields } = product;

  if (isDemo(businessId)) {
    const id = "prod-" + uid();
    const now = new Date().toISOString();
    const newProduct: Product = {
      id,
      business_id: businessId,
      ...fields,
      is_active: true,
      created_at: now,
      updated_at: now,
      product_devices: devices.map((d, i) => ({
        id: "dev-" + uid(),
        imei: d.imei?.trim() || `DEMO-${id.slice(-4)}-${i + 1}`,
        imei_2: d.imei_2?.trim() || null,
        serial_number: d.serial_number?.trim() || null,
        storage: d.storage?.trim() || null,
        ram: d.ram?.trim() || null,
        color: d.color?.trim() || null,
        condition: d.condition?.trim() || "New",
        status: "in_stock" as DeviceStatus,
        buying_price: d.buying_price ?? fields.buying_price,
        selling_price: d.selling_price ?? fields.selling_price,
      })),
    };
    demoProducts.add(newProduct);
    return newProduct;
  }

  // Sanitise all device fields
  const cleanDevices = devices.map(cleanDevice);

  const { data, error } = await client().rpc("create_product_with_devices", {
    target_business_id: businessId,
    product_name: fields.name.trim(),
    product_sku: fields.sku?.trim() || null,
    product_category: fields.category.trim(),
    product_brand: fields.brand?.trim() || null,
    product_model: fields.model?.trim() || null,
    product_inventory_type: fields.inventory_type,
    product_buying_price: fields.buying_price,
    product_selling_price: fields.selling_price,
    product_quantity: fields.inventory_type === "quantity" ? (fields.quantity ?? 0) : 0,
    product_minimum_stock: fields.minimum_stock ?? 0,
    product_supplier: fields.supplier?.trim() || null,
    product_description: fields.description?.trim() || null,
    device_rows: cleanDevices,
  });
  if (error) throw error;

  // Fetch the full product record including devices so the UI gets real data
  const productId = data as string;
  const { data: saved, error: fetchError } = await client()
    .from("products")
    .select("*, product_devices(*)")
    .eq("id", productId)
    .single();
  if (fetchError) throw fetchError;
  return saved as Product;
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  changes: Partial<Pick<
    Product,
    "name" | "sku" | "category" | "brand" | "model" |
    "selling_price" | "buying_price" | "minimum_stock" |
    "supplier" | "description" | "is_active"
  >>
): Promise<Product> {
  if (!supabase) {
    demoProducts.update(id, { ...changes, updated_at: new Date().toISOString() });
    return demoProducts.list().find((p) => p.id === id)!;
  }
  const { data, error } = await client()
    .from("products")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, product_devices(*)")
    .single();
  if (error) throw error;
  return data as Product;
}

// ─── STOCK ACTIONS ────────────────────────────────────────────────────────────

export async function receiveStock(
  id: string,
  quantity: number,
  reason: string
): Promise<void> {
  if (!supabase) {
    const p = demoProducts.list().find((x) => x.id === id);
    if (p) demoProducts.update(id, { quantity: p.quantity + quantity, updated_at: new Date().toISOString() });
    return;
  }
  const { error } = await client().rpc("receive_quantity_stock", {
    target_product_id: id,
    received_quantity: quantity,
    movement_reason: reason,
  });
  if (error) throw error;
}

export async function adjustStock(
  id: string,
  delta: number,
  reason: string
): Promise<void> {
  if (!supabase) {
    const p = demoProducts.list().find((x) => x.id === id);
    if (p) demoProducts.update(id, { quantity: Math.max(0, p.quantity + delta), updated_at: new Date().toISOString() });
    return;
  }
  const { error } = await client().rpc("adjust_quantity_stock", {
    target_product_id: id,
    quantity_delta: delta,
    adjustment_reason: reason,
  });
  if (error) throw error;
}

/**
 * Add new IMEI-tracked devices to an existing product.
 * Uses the receive_devices_for_product RPC on real Supabase (includes business_id correctly).
 */
export async function receiveDevices(
  productId: string,
  devices: Partial<Device>[]
): Promise<void> {
  if (!supabase) {
    const newDevices: Device[] = devices.map((d) => ({
      id: "dev-" + uid(),
      imei: d.imei?.trim() || uid(),
      imei_2: d.imei_2?.trim() || null,
      serial_number: d.serial_number?.trim() || null,
      storage: d.storage?.trim() || null,
      ram: d.ram?.trim() || null,
      color: d.color?.trim() || null,
      condition: d.condition?.trim() || "New",
      status: "in_stock" as DeviceStatus,
      buying_price: d.buying_price ?? null,
      selling_price: d.selling_price ?? null,
    }));
    const p = demoProducts.list().find((x) => x.id === productId);
    if (p) {
      demoProducts.update(productId, {
        product_devices: [...(p.product_devices ?? []), ...newDevices],
        updated_at: new Date().toISOString(),
      });
    }
    return;
  }
  // Use the new RPC that correctly includes business_id
  const { error } = await client().rpc("receive_devices_for_product", {
    target_product_id: productId,
    device_rows: devices.map(cleanDevice),
  });
  if (error) throw error;
}

// ─── ACTIVATE / DEACTIVATE ────────────────────────────────────────────────────

export async function setProductActive(id: string, active: boolean): Promise<void> {
  if (!supabase) {
    demoProducts.update(id, { is_active: active, updated_at: new Date().toISOString() });
    return;
  }
  const { error } = await client()
    .from("products")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ─── STOCK HELPERS ────────────────────────────────────────────────────────────

export function availableStock(product: Product): number {
  return product.inventory_type === "individual"
    ? (product.product_devices ?? []).filter((d) => d.status === "in_stock").length
    : product.quantity;
}

export function stockState(product: Product): "healthy" | "low" | "out" {
  const stock = availableStock(product);
  if (stock === 0) return "out";
  if (stock <= product.minimum_stock) return "low";
  return "healthy";
}
