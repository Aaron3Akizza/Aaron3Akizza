import { supabase } from "./supabase";

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

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function listProducts(businessId: string, page = 0, pageSize = 50) {
  const { data, error } = await client()
    .from("products")
    .select("*, product_devices(*)")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function createProduct(businessId: string, product: Omit<Product, "id" | "business_id" | "created_at" | "updated_at" | "is_active" | "product_devices"> & { devices?: Partial<Device>[] }) {
  const { devices = [], ...fields } = product;
  const { data, error } = await client().rpc("create_product_with_devices", {
    target_business_id: businessId,
    product_name: fields.name,
    product_sku: fields.sku,
    product_category: fields.category,
    product_brand: fields.brand,
    product_model: fields.model,
    product_inventory_type: fields.inventory_type,
    product_buying_price: fields.buying_price,
    product_selling_price: fields.selling_price,
    product_quantity: fields.quantity,
    product_minimum_stock: fields.minimum_stock,
    product_supplier: fields.supplier,
    product_description: fields.description,
    device_rows: devices,
  });
  if (error) throw error;
  return data as string;
}

export async function updateProduct(id: string, changes: Partial<Pick<Product, "name" | "sku" | "category" | "brand" | "model" | "selling_price" | "buying_price" | "minimum_stock" | "supplier" | "description" | "is_active">>) {
  const { data, error } = await client().from("products").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data as Product;
}

export async function receiveStock(id: string, quantity: number, reason: string) {
  const { error } = await client().rpc("receive_quantity_stock", { target_product_id: id, received_quantity: quantity, movement_reason: reason });
  if (error) throw error;
}

export async function adjustStock(id: string, delta: number, reason: string) {
  const { error } = await client().rpc("adjust_quantity_stock", { target_product_id: id, quantity_delta: delta, adjustment_reason: reason });
  if (error) throw error;
}

export function isValidImei(value: string) {
  const digits = value.trim();
  if (!/^\d{15}$/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[index]);
    if (index % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function availableStock(product: Product) {
  return product.inventory_type === "individual" ? (product.product_devices ?? []).filter((device) => device.status === "in_stock").length : product.quantity;
}

export function stockState(product: Product) {
  const stock = availableStock(product);
  if (stock === 0) return "out";
  if (stock <= product.minimum_stock) return "low";
  return "healthy";
}

/** Add new devices (IMEI-tracked) to an existing product */
export async function receiveDevices(
  productId: string,
  devices: Partial<Device>[]
): Promise<void> {
  const db = client();
  const rows = devices.map((d) => ({
    product_id: productId,
    imei: d.imei,
    imei_2: d.imei_2 || null,
    serial_number: d.serial_number || null,
    storage: d.storage || null,
    ram: d.ram || null,
    color: d.color || null,
    condition: d.condition || "New",
    status: "in_stock" as DeviceStatus,
    buying_price: d.buying_price ?? null,
    selling_price: d.selling_price ?? null,
  }));
  const { error } = await db.from("product_devices").insert(rows);
  if (error) throw error;
}

/** Toggle product active/inactive */
export async function setProductActive(id: string, active: boolean): Promise<void> {
  const { error } = await client()
    .from("products")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
