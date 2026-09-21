import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Boxes, Check, ChevronRight, Edit3, Package,
  Plus, RefreshCw, Search, Smartphone, X, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  adjustStock, availableStock, createProduct, imeiError,
  listProducts, Product, receiveDevices, receiveStock,
  setProductActive, stockState, updateProduct,
} from "../lib/inventory";
import { useMoney } from "../lib/format";

type Props = { businessId: string; role: string | null };
const canManage = (role: string | null) =>
  role === "owner" || role === "manager" || role === "inventory";

/* =========================================================
   SHARED PRIMITIVES
   ========================================================= */

function Field({
  label, hint, ...props
}: {
  label: string;
  hint?: string;
  [key: string]: string | number | boolean | undefined | ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void);
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {hint && <span className="block text-xs text-gray-400 mb-1.5">{hint}</span>}
      <input
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 disabled:bg-gray-50 disabled:text-gray-400"
        {...props}
      />
    </label>
  );
}

function SelectField({ label, children, ...props }: { label: string; children: React.ReactNode; [key: string]: any }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <select
        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

function StatusBadge({ product }: { product: Product }) {
  const state = stockState(product);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      state === "healthy" ? "bg-green-50 text-green-600" :
      state === "low"     ? "bg-amber-50 text-amber-600" :
                            "bg-red-50 text-red-600"
    }`}>
      {state === "healthy" ? "In stock" : state === "low" ? "Low stock" : "Out of stock"}
    </span>
  );
}

/* =========================================================
   DEVICE ROW FORM
   ========================================================= */

type DeviceFormRow = {
  imei: string; imei_2: string; serial_number: string;
  storage: string; ram: string; color: string; condition: string;
  buying_price: string; selling_price: string;
};

const emptyDevice = (): DeviceFormRow => ({
  imei: "", imei_2: "", serial_number: "", storage: "", ram: "",
  color: "", condition: "New", buying_price: "", selling_price: "",
});

function DeviceRow({
  device, index, total, onChange, onRemove, showPrices, productBuyingPrice, productSellingPrice,
}: {
  device: DeviceFormRow;
  index: number;
  total: number;
  onChange: (updated: DeviceFormRow) => void;
  onRemove: () => void;
  showPrices: boolean;
  productBuyingPrice: string;
  productSellingPrice: string;
}) {
  const set = (key: keyof DeviceFormRow, val: string) => onChange({ ...device, [key]: val });
  const err = device.imei.trim() ? imeiError(device.imei) : null;

  return (
    <div className={`${index > 0 ? "border-t border-gray-100 pt-4 mt-2" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Device {index + 1} {device.color ? `· ${device.color}` : ""} {device.storage ? `· ${device.storage}` : ""}
        </p>
        {total > 1 && (
          <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
            <X size={13} /> Remove
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Field
            label="IMEI *"
            hint="15-digit number printed on the phone or under the battery"
            value={device.imei}
            onChange={(e) => set("imei", e.target.value)}
            placeholder="e.g. 356938035643809"
            maxLength={15}
          />
          {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
        </div>
        <Field
          label="IMEI 2 (dual SIM, optional)"
          value={device.imei_2}
          onChange={(e) => set("imei_2", e.target.value)}
          placeholder="Second IMEI if dual-SIM"
          maxLength={15}
        />
        <Field
          label="Serial number"
          value={device.serial_number}
          onChange={(e) => set("serial_number", e.target.value)}
          placeholder="e.g. F2LXXXXXXXXX"
        />
        <SelectField label="Condition" value={device.condition} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("condition", e.target.value)}>
          <option>New</option>
          <option>Used</option>
          <option>Refurbished</option>
          <option>Faulty</option>
        </SelectField>
        <Field label="Storage" value={device.storage} onChange={(e) => set("storage", e.target.value)} placeholder="e.g. 128GB" />
        <Field label="RAM" value={device.ram} onChange={(e) => set("ram", e.target.value)} placeholder="e.g. 6GB" />
        <Field label="Color" value={device.color} onChange={(e) => set("color", e.target.value)} placeholder="e.g. Midnight Black" />
        {showPrices && (
          <>
            <Field
              label={`Buying price (leave blank to use ${productBuyingPrice || "product price"})`}
              type="number" min="0" step="1"
              value={device.buying_price}
              onChange={(e) => set("buying_price", e.target.value)}
              placeholder={productBuyingPrice || "Same as product"}
            />
            <Field
              label={`Selling price (leave blank to use ${productSellingPrice || "product price"})`}
              type="number" min="0" step="1"
              value={device.selling_price}
              onChange={(e) => set("selling_price", e.target.value)}
              placeholder={productSellingPrice || "Same as product"}
            />
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   PRODUCT MODAL (Add / Edit)
   ========================================================= */

type ProductForm = {
  name: string; sku: string; category: string; brand: string; model: string;
  inventory_type: "quantity" | "individual";
  buying_price: string; selling_price: string;
  quantity: string; minimum_stock: string;
  supplier: string; description: string;
  devices: DeviceFormRow[];
  showDevicePrices: boolean;
};

const emptyForm = (): ProductForm => ({
  name: "", sku: "", category: "", brand: "", model: "",
  inventory_type: "quantity",
  buying_price: "", selling_price: "",
  quantity: "", minimum_stock: "0",
  supplier: "", description: "",
  devices: [emptyDevice()],
  showDevicePrices: false,
});

function ProductModal({
  product, businessId, onClose, onSaved,
}: {
  product?: Product;
  businessId: string;
  onClose: () => void;
  onSaved: (saved: Product) => void;
}) {
  const [form, setForm] = useState<ProductForm>(() =>
    product ? {
      ...emptyForm(),
      name: product.name,
      sku: product.sku ?? "",
      category: product.category,
      brand: product.brand ?? "",
      model: product.model ?? "",
      inventory_type: product.inventory_type,
      buying_price: String(product.buying_price),
      selling_price: String(product.selling_price),
      quantity: String(product.quantity),
      minimum_stock: String(product.minimum_stock),
      supplier: product.supplier ?? "",
      description: product.description ?? "",
      devices: [],
    } : emptyForm()
  );

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(false); // double-submit guard

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addDevice = () => set("devices", [...form.devices, emptyDevice()]);

  const updateDevice = (i: number, updated: DeviceFormRow) =>
    set("devices", form.devices.map((d, idx) => idx === i ? updated : d));

  const removeDevice = (i: number) =>
    set("devices", form.devices.filter((_, idx) => idx !== i));

  const validate = (): string | null => {
    const buying = Number(form.buying_price);
    const selling = Number(form.selling_price);
    if (!form.name.trim())     return "Product name is required.";
    if (!form.category.trim()) return "Category is required.";
    if (!Number.isFinite(buying)  || buying < 0)  return "Enter a valid buying price (0 or more).";
    if (!Number.isFinite(selling) || selling < 0) return "Enter a valid selling price (0 or more).";
    if (selling < buying)          return "Selling price should not be less than the buying price.";
    if (!product) {
      if (form.inventory_type === "quantity") {
        const qty = Number(form.quantity);
        if (!Number.isFinite(qty) || qty < 0) return "Initial quantity must be 0 or more.";
      } else {
        if (form.devices.length === 0) return "Add at least one device.";
        for (let i = 0; i < form.devices.length; i++) {
          const d = form.devices[i];
          const err = imeiError(d.imei);
          if (err) return `Device ${i + 1}: ${err}`;
          // Check for duplicate IMEIs within the form itself
          const others = form.devices.filter((_, j) => j !== i);
          if (d.imei.trim() && others.some((o) => o.imei.trim() === d.imei.trim())) {
            return `Device ${i + 1}: IMEI ${d.imei} is duplicated in this form.`;
          }
          if (d.imei_2.trim() && others.some((o) => o.imei_2.trim() === d.imei_2.trim() && o.imei_2.trim())) {
            return `Device ${i + 1}: IMEI 2 is duplicated in this form.`;
          }
        }
      }
    }
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitted) return; // prevent double-submit
    setError("");
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSubmitted(true);
    setSaving(true);

    try {
      let saved: Product;

      if (product) {
        // Edit existing product
        saved = await updateProduct(product.id, {
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          category: form.category.trim(),
          brand: form.brand.trim() || null,
          model: form.model.trim() || null,
          buying_price: Number(form.buying_price),
          selling_price: Number(form.selling_price),
          minimum_stock: Number(form.minimum_stock || 0),
          supplier: form.supplier.trim() || null,
          description: form.description.trim() || null,
        });
      } else {
        // Create new product
        saved = await createProduct(businessId, {
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          category: form.category.trim(),
          brand: form.brand.trim() || null,
          model: form.model.trim() || null,
          inventory_type: form.inventory_type,
          buying_price: Number(form.buying_price),
          selling_price: Number(form.selling_price),
          quantity: form.inventory_type === "quantity" ? Number(form.quantity || 0) : 0,
          minimum_stock: Number(form.minimum_stock || 0),
          supplier: form.supplier.trim() || null,
          image_url: null,
          description: form.description.trim() || null,
          devices: form.inventory_type === "individual" ? form.devices.map((d) => ({
            id: "",
            imei: d.imei.trim(),
            imei_2: d.imei_2.trim() || null,
            serial_number: d.serial_number.trim() || null,
            storage: d.storage.trim() || null,
            ram: d.ram.trim() || null,
            color: d.color.trim() || null,
            condition: d.condition || "New",
            status: "in_stock" as const,
            buying_price: Number(d.buying_price) || null,
            selling_price: Number(d.selling_price) || null,
          })) : [],
        });
      }

      setSuccess(true);
      setTimeout(() => { onSaved(saved); onClose(); }, 600);
    } catch (caught: any) {
      setSubmitted(false); // allow retry on error
      const msg: string = caught?.message ?? "";
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already exists")) {
        setError("A product with this IMEI or SKU already exists in your inventory.");
      } else if (msg.toLowerCase().includes("not allowed") || msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls")) {
        setError("Permission denied. You need owner, manager, or inventory role.");
      } else if (msg.toLowerCase().includes("not authenticated") || msg.toLowerCase().includes("jwt")) {
        setError("Your session has expired. Please log out and log back in.");
      } else if (msg.toLowerCase().includes("15") || msg.toLowerCase().includes("imei")) {
        setError("One of the IMEIs is invalid. Each IMEI must be exactly 15 digits.");
      } else {
        setError(msg || "Could not save the product. Check your connection and try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">
            {product ? "Edit product" : "Add product"}
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Success flash */}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700 flex items-center gap-2">
            <Check size={15} /> Product saved successfully!
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-5">

          {/* ── Basic info ── */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Product details</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Product name *" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Samsung Galaxy A15" required />
              <Field label="Category *" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Phones, Accessories" required />
              <Field label="Brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Samsung" />
              <Field label="Model" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. Galaxy A15" />
              <Field label="SKU (optional)" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. SAM-A15-128" />
              <Field label="Supplier" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="e.g. MTN Distributor" />
            </div>
          </section>

          {/* ── Pricing ── */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pricing</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Buying price *"
                type="number" min="0" step="1"
                value={form.buying_price}
                onChange={(e) => set("buying_price", e.target.value)}
                placeholder="0"
                required
              />
              <Field
                label="Selling price *"
                type="number" min="0" step="1"
                value={form.selling_price}
                onChange={(e) => set("selling_price", e.target.value)}
                placeholder="0"
                required
              />
            </div>
            {form.buying_price && form.selling_price && Number(form.selling_price) >= Number(form.buying_price) && (
              <p className="text-xs text-green-600 mt-1.5 font-medium">
                Margin: {Number(form.selling_price) - Number(form.buying_price) > 0
                  ? `${((Number(form.selling_price) - Number(form.buying_price)) / Number(form.selling_price) * 100).toFixed(1)}% (${(Number(form.selling_price) - Number(form.buying_price)).toLocaleString()} per unit)`
                  : "Break even"}
              </p>
            )}
          </section>

          {/* ── Inventory type — new products only ── */}
          {!product && (
            <section>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Inventory tracking</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => set("inventory_type", "quantity")}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    form.inventory_type === "quantity"
                      ? "border-green-600 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Boxes size={18} className={form.inventory_type === "quantity" ? "text-green-600" : "text-gray-400"} />
                  <p className="font-semibold text-sm mt-2 text-gray-900">Track quantity</p>
                  <p className="text-xs text-gray-500 mt-0.5">Accessories, cables, cases — sold as units</p>
                </button>
                <button
                  type="button"
                  onClick={() => set("inventory_type", "individual")}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    form.inventory_type === "individual"
                      ? "border-green-600 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Smartphone size={18} className={form.inventory_type === "individual" ? "text-green-600" : "text-gray-400"} />
                  <p className="font-semibold text-sm mt-2 text-gray-900">Track by IMEI</p>
                  <p className="text-xs text-gray-500 mt-0.5">Phones — each unit tracked individually</p>
                </button>
              </div>

              {form.inventory_type === "quantity" ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Initial quantity"
                    type="number" min="0"
                    value={form.quantity}
                    onChange={(e) => set("quantity", e.target.value)}
                    placeholder="0"
                  />
                  <Field
                    label="Minimum stock alert"
                    type="number" min="0"
                    value={form.minimum_stock}
                    onChange={(e) => set("minimum_stock", e.target.value)}
                    placeholder="0"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Devices ({form.devices.length})
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.showDevicePrices}
                          onChange={(e) => set("showDevicePrices", e.target.checked)}
                          className="rounded"
                        />
                        Different prices per device
                      </label>
                      <button
                        type="button"
                        onClick={addDevice}
                        className="inline-flex items-center gap-1 text-xs text-green-600 font-medium hover:text-green-800"
                      >
                        <Plus size={13} /> Add device
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">
                    Each phone is tracked individually. The IMEI links the exact unit to the sale and profit record.
                  </p>
                  {form.devices.map((d, i) => (
                    <DeviceRow
                      key={i}
                      device={d}
                      index={i}
                      total={form.devices.length}
                      onChange={(updated) => updateDevice(i, updated)}
                      onRemove={() => removeDevice(i)}
                      showPrices={form.showDevicePrices}
                      productBuyingPrice={form.buying_price}
                      productSellingPrice={form.selling_price}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ── Min stock for edit ── */}
          {product && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Minimum stock alert"
                type="number" min="0"
                value={form.minimum_stock}
                onChange={(e) => set("minimum_stock", e.target.value)}
              />
            </div>
          )}

          {/* ── Description ── */}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Optional — storage size, RAM, any notes..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </label>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || submitted}
              className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-green-700"
            >
              {saving ? "Saving…" : product ? "Save changes" : "Add product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   PRODUCT DETAIL PANEL
   ========================================================= */

function Detail({
  product, onClose, onEdit, onReload, canEdit,
}: {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
  onReload: (updated?: Product) => void;
  canEdit: boolean;
}) {
  const money = useMoney();
  const [stockAction, setStockAction] = useState<"receive" | "adjust" | "receiveDevices" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [newDevices, setNewDevices] = useState<DeviceFormRow[]>([emptyDevice()]);

  const submitStock = async () => {
    setError("");
    if (stockAction === "receive") {
      const qty = Number(amount);
      if (!qty || qty <= 0) { setError("Enter a quantity greater than zero."); return; }
      if (!reason.trim()) { setError("A reason is required."); return; }
    } else if (stockAction === "adjust") {
      if (!amount || Number(amount) === 0) { setError("Enter a non-zero adjustment."); return; }
      if (!reason.trim()) { setError("A reason is required."); return; }
    } else if (stockAction === "receiveDevices") {
      for (let i = 0; i < newDevices.length; i++) {
        const err = imeiError(newDevices[i].imei);
        if (err) { setError(`Device ${i + 1}: ${err}`); return; }
        const others = newDevices.filter((_, j) => j !== i);
        if (newDevices[i].imei.trim() && others.some((o) => o.imei.trim() === newDevices[i].imei.trim())) {
          setError(`Device ${i + 1}: duplicate IMEI in this batch.`); return;
        }
      }
    }
    setSaving(true);
    try {
      if (stockAction === "receive") {
        await receiveStock(product.id, Number(amount), reason.trim());
      } else if (stockAction === "adjust") {
        await adjustStock(product.id, Number(amount), reason.trim());
      } else if (stockAction === "receiveDevices") {
        await receiveDevices(product.id, newDevices.map((d) => ({
          id: "", imei: d.imei.trim(), imei_2: d.imei_2.trim() || null,
          serial_number: d.serial_number.trim() || null, storage: d.storage.trim() || null,
          ram: d.ram.trim() || null, color: d.color.trim() || null,
          condition: d.condition || "New", status: "in_stock" as const,
          buying_price: Number(d.buying_price) || null, selling_price: Number(d.selling_price) || null,
        })));
        setNewDevices([emptyDevice()]);
      }
      setStockAction(null);
      setAmount("");
      setReason("");
      onReload();
    } catch (caught: any) {
      const msg = caught?.message ?? "";
      if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("already exists")) {
        setError("One of these IMEIs already exists in your inventory.");
      } else {
        setError(msg || "Could not record this change. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    setTogglingActive(true);
    try { await setProductActive(product.id, !product.is_active); onReload(); }
    catch { setError("Could not update product status."); }
    finally { setTogglingActive(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6">

        {/* Header */}
        <div className="flex justify-between gap-4 mb-5">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{product.category}{product.brand ? ` · ${product.brand}` : ""}</p>
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {product.model || ""}
              {product.sku ? ` · SKU: ${product.sku}` : ""}
              {product.supplier ? ` · ${product.supplier}` : ""}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">In stock</p>
            <p className="font-bold text-gray-900 text-lg">{availableStock(product)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Buying price</p>
            <p className="font-bold text-gray-900">{money(product.buying_price)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Selling price</p>
            <p className="font-bold text-gray-900">{money(product.selling_price)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Margin</p>
            <p className="font-bold text-green-600">{money(product.selling_price - product.buying_price)}</p>
          </div>
        </div>

        {/* Status + actions */}
        {canEdit && (
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <Edit3 size={14} /> Edit
            </button>
            {product.inventory_type === "quantity" && <>
              <button onClick={() => setStockAction("receive")} className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm hover:bg-green-700">Receive stock</button>
              <button onClick={() => setStockAction("adjust")} className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Adjust stock</button>
            </>}
            {product.inventory_type === "individual" && (
              <button onClick={() => setStockAction("receiveDevices")} className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-3 py-2 text-sm hover:bg-green-700">
                <Plus size={14} /> Receive devices
              </button>
            )}
            <button
              onClick={toggleActive}
              disabled={togglingActive}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${
                product.is_active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"
              }`}
            >
              {product.is_active ? <><ToggleRight size={15} /> Deactivate</> : <><ToggleLeft size={15} /> Activate</>}
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 flex gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Stock action panels */}
        {(stockAction === "receive" || stockAction === "adjust") && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-5">
            <p className="text-sm font-semibold mb-3">{stockAction === "receive" ? "Receive stock" : "Adjust stock"}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label={stockAction === "receive" ? "Units to receive" : "Change (+/-)"}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={stockAction === "receive" ? "e.g. 20" : "e.g. -5 or +10"}
              />
              <Field
                label="Reason *"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. New delivery, damaged goods"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setStockAction(null); setError(""); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Cancel</button>
              <button disabled={saving} onClick={submitStock} className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm disabled:opacity-50">
                {saving ? "Recording…" : "Confirm"}
              </button>
            </div>
          </div>
        )}

        {stockAction === "receiveDevices" && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Receive new devices</p>
              <button
                type="button"
                onClick={() => setNewDevices([...newDevices, emptyDevice()])}
                className="text-xs text-green-600 font-medium inline-flex items-center gap-1"
              >
                <Plus size={13} /> Add another
              </button>
            </div>
            {newDevices.map((d, i) => (
              <DeviceRow
                key={i}
                device={d}
                index={i}
                total={newDevices.length}
                onChange={(updated) => setNewDevices(newDevices.map((x, j) => j === i ? updated : x))}
                onRemove={() => setNewDevices(newDevices.filter((_, j) => j !== i))}
                showPrices={true}
                productBuyingPrice={String(product.buying_price)}
                productSellingPrice={String(product.selling_price)}
              />
            ))}
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setStockAction(null); setError(""); setNewDevices([emptyDevice()]); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Cancel</button>
              <button disabled={saving} onClick={submitStock} className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm disabled:opacity-50">
                {saving ? "Saving…" : `Save ${newDevices.length} device${newDevices.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}

        {/* Device inventory */}
        {product.inventory_type === "individual" ? (
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Devices ({(product.product_devices ?? []).length} total · {availableStock(product)} in stock)
            </p>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {(product.product_devices ?? []).length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No devices added yet. Use "Receive devices" to add stock.</p>
              ) : (
                (product.product_devices ?? []).map((d) => (
                  <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs font-medium text-gray-800">IMEI: {d.imei}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[d.imei_2 ? `IMEI 2: ${d.imei_2}` : null, d.serial_number, d.storage, d.ram, d.color, d.condition].filter(Boolean).join(" · ")}
                      </p>
                      {(d.buying_price !== product.buying_price || d.selling_price !== product.selling_price) && d.buying_price && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Custom price: buy {money(d.buying_price ?? 0)} · sell {money(d.selling_price ?? 0)}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      d.status === "in_stock" ? "bg-green-50 text-green-600" :
                      d.status === "sold"     ? "bg-gray-100 text-gray-500" :
                                               "bg-red-50 text-red-600"
                    }`}>
                      {d.status.replace("_", " ")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Stock details</p>
            <p className="text-sm text-gray-500">
              {product.description || "Quantity-tracked product."}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Inventory value at cost: {money(availableStock(product) * product.buying_price)}
            </p>
          </div>
        )}

        {!product.is_active && (
          <p className="mt-4 text-xs text-amber-600 font-medium">
            This product is inactive and won't appear in new sales.
          </p>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PRODUCTS PAGE
   ========================================================= */

export default function ProductsPage({ businessId, role }: Props) {
  const money = useMoney();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  // Load all products from the database
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProducts(await listProducts(businessId));
    } catch {
      setError("Could not load products. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  // After a product is saved, update it in the local list without full reload
  const handleSaved = useCallback((saved: Product) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        // Update existing
        const next = [...prev];
        next[idx] = saved;
        return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      } else {
        // Prepend new product
        return [saved, ...prev];
      }
    });
    // If the detail panel was open for this product, update it too
    if (selected?.id === saved.id) setSelected(saved);
  }, [selected]);

  // After stock change — full reload to get fresh device list (unused but kept for future use)
  void useCallback(() => { load(); }, [load]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category))).sort()],
    [products]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return products.filter((p) => {
      const text = [p.name, p.brand, p.model, p.sku, p.category, p.supplier,
        ...(p.product_devices ?? []).map((d) => d.imei),
      ].filter(Boolean).join(" ").toLowerCase();
      return text.includes(q) && (categoryFilter === "All" || p.category === categoryFilter);
    });
  }, [products, query, categoryFilter]);

  const totalValue = useMemo(
    () => products.reduce((s, p) => s + availableStock(p) * p.buying_price, 0),
    [products]
  );
  const totalInStock = useMemo(
    () => products.reduce((s, p) => s + availableStock(p), 0),
    [products]
  );

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500">
            {products.length} product{products.length !== 1 ? "s" : ""}
            {totalInStock > 0 ? ` · ${totalInStock} units in stock` : ""}
            {totalValue > 0 ? ` · ${money(totalValue)} inventory value` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} aria-label="Refresh" className="rounded-lg border border-gray-200 p-2.5 text-gray-500 hover:bg-gray-50">
            <RefreshCw size={16} />
          </button>
          {canManage(role) && (
            <button
              onClick={() => setModal("add")}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700"
            >
              <Plus size={15} /> Add product
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-72">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, brand, IMEI, SKU…"
            className="flex-1 text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 flex-wrap">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                categoryFilter === c ? "bg-green-50 text-green-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
          <button onClick={load} className="ml-auto text-red-500 hover:text-red-700 flex items-center gap-1 text-xs">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Product table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="text-sm text-gray-400">Loading products…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          {products.length === 0 ? (
            <>
              <Package size={32} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-semibold text-gray-900">No products yet</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">Add your first product to start tracking inventory.</p>
              {canManage(role) && (
                <button
                  onClick={() => setModal("add")}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium"
                >
                  <Plus size={15} /> Add product
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900">No products match.</p>
              <p className="text-sm text-gray-500 mt-1">Try a different search or category.</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Buying</th>
                  <th className="px-5 py-3 font-medium">Selling</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer ${!p.is_active ? "opacity-50" : ""}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                          {p.inventory_type === "individual"
                            ? <Smartphone size={14} className="text-green-600" />
                            : <Boxes size={14} className="text-green-600" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {[p.brand, p.model, p.sku ? `SKU: ${p.sku}` : null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.category}</td>
                    <td className="px-5 py-3 text-gray-500">{money(p.buying_price)}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{money(p.selling_price)}</td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${
                        availableStock(p) === 0 ? "text-red-600" :
                        availableStock(p) <= p.minimum_stock ? "text-amber-600" :
                        "text-gray-900"
                      }`}>
                        {availableStock(p)}
                      </span>
                      {p.inventory_type === "individual" && (
                        <span className="text-xs text-gray-400 ml-1">devices</span>
                      )}
                    </td>
                    <td className="px-5 py-3"><StatusBadge product={p} /></td>
                    <td className="px-5 py-3"><ChevronRight size={16} className="text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <ProductModal
          product={modal === "edit" && selected ? selected : undefined}
          businessId={businessId}
          onClose={() => setModal(null)}
          onSaved={(saved) => { handleSaved(saved); setModal(null); }}
        />
      )}

      {/* Detail panel */}
      {selected && modal !== "edit" && (
        <Detail
          product={selected}
          canEdit={canManage(role)}
          onClose={() => setSelected(null)}
          onEdit={() => setModal("edit")}
          onReload={() => {
            // Reload and sync the selected product
            listProducts(businessId).then((all) => {
              setProducts(all);
              const fresh = all.find((p) => p.id === selected.id);
              if (fresh) setSelected(fresh);
              else setSelected(null);
            }).catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
