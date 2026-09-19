import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, ChevronRight, Edit3, Package, Plus, RefreshCw, Search, Smartphone, X, ToggleLeft, ToggleRight } from "lucide-react";
import { adjustStock, availableStock, createProduct, isValidImei, listProducts, Product, receiveStock, receiveDevices, setProductActive, stockState, updateProduct } from "../lib/inventory";
import { useMoney } from "../lib/format";

type Props = { businessId: string; role: string | null };
type ProductForm = { name: string; sku: string; category: string; brand: string; model: string; inventory_type: "quantity" | "individual"; buying_price: string; selling_price: string; quantity: string; minimum_stock: string; supplier: string; description: string; devices: { imei: string; imei_2: string; serial_number: string; storage: string; ram: string; color: string; condition: string }[] };
const emptyForm: ProductForm = { name: "", sku: "", category: "", brand: "", model: "", inventory_type: "quantity", buying_price: "", selling_price: "", quantity: "", minimum_stock: "0", supplier: "", description: "", devices: [{ imei: "", imei_2: "", serial_number: "", storage: "", ram: "", color: "", condition: "New" }] };
const canManage = (role: string | null) => role === "owner" || role === "manager" || role === "inventory";

function Field({ label, ...props }: { label: string; [key: string]: string | number | boolean | ((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) }) {
  return <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span><input className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" {...props} /></label>;
}
function Status({ product }: { product: Product }) { const state = stockState(product); return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${state === "healthy" ? "bg-green-50 text-green-600" : state === "low" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>{state === "healthy" ? "In stock" : state === "low" ? "Low stock" : "Out of stock"}</span>; }

function ProductModal({ product, businessId, onClose, onSaved }: { product?: Product; businessId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ProductForm>(() => product ? { ...emptyForm, name: product.name, sku: product.sku ?? "", category: product.category, brand: product.brand ?? "", model: product.model ?? "", inventory_type: product.inventory_type, buying_price: String(product.buying_price), selling_price: String(product.selling_price), quantity: String(product.quantity), minimum_stock: String(product.minimum_stock), supplier: product.supplier ?? "", description: product.description ?? "", devices: [] } : emptyForm);
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const set = (key: keyof ProductForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    const buying = Number(form.buying_price); const selling = Number(form.selling_price); const quantity = Number(form.quantity || 0);
    if (!form.name.trim() || !form.category.trim() || !Number.isFinite(buying) || !Number.isFinite(selling) || buying < 0 || selling < 0) { setError("Enter a name, category, and valid non-negative prices."); return; }
    if (selling < buying) { setError("Selling price should not be below buying price."); return; }
    if (!product && (form.inventory_type === "quantity" ? quantity < 0 : form.devices.length === 0 || form.devices.some((device) => !isValidImei(device.imei)))) { setError(form.inventory_type === "quantity" ? "Quantity cannot be negative." : "Each device needs a valid 15-digit IMEI with a valid checksum."); return; }
    setSaving(true);
    try {
      if (product) await updateProduct(product.id, { name: form.name.trim(), sku: form.sku.trim() || null, category: form.category.trim(), brand: form.brand.trim() || null, model: form.model.trim() || null, buying_price: buying, selling_price: selling, minimum_stock: Number(form.minimum_stock || 0), supplier: form.supplier.trim() || null, description: form.description.trim() || null });
      else await createProduct(businessId, { name: form.name.trim(), sku: form.sku.trim() || null, category: form.category.trim(), brand: form.brand.trim() || null, model: form.model.trim() || null, inventory_type: form.inventory_type, buying_price: buying, selling_price: selling, quantity: form.inventory_type === "quantity" ? quantity : 0, minimum_stock: Number(form.minimum_stock || 0), supplier: form.supplier.trim() || null, image_url: null, description: form.description.trim() || null, devices: form.devices });
      onSaved(); onClose();
    } catch (caught) { setError((caught as Error).message.toLowerCase().includes("duplicate") ? "That SKU or IMEI already exists in this business." : "Could not save the product. Check your connection and try again."); } finally { setSaving(false); }
  };
  const addDevice = () => setForm((current) => ({ ...current, devices: [...current.devices, { imei: "", imei_2: "", serial_number: "", storage: "", ram: "", color: "", condition: "New" }] }));
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={onClose} /><div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6"><div className="flex items-center justify-between mb-5"><h2 className="text-base font-bold text-gray-900">{product ? "Edit product" : "Add product"}</h2><button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button></div>{error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}<form onSubmit={submit} className="flex flex-col gap-4"><div className="grid sm:grid-cols-2 gap-4"><Field label="Product name" value={form.name} onChange={(e) => set("name", e.target.value)} required /><Field label="Category" value={form.category} onChange={(e) => set("category", e.target.value)} required /><Field label="Brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} /><Field label="Model" value={form.model} onChange={(e) => set("model", e.target.value)} /><Field label="SKU" value={form.sku} onChange={(e) => set("sku", e.target.value)} /></div><div className="grid sm:grid-cols-2 gap-4"><Field label="Buying price (UGX)" type="number" min="0" step="0.01" value={form.buying_price} onChange={(e) => set("buying_price", e.target.value)} required /><Field label="Selling price (UGX)" type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => set("selling_price", e.target.value)} required /></div>{!product && <><div><span className="block text-sm font-medium text-gray-700 mb-2">Inventory type</span><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setForm({ ...form, inventory_type: "quantity" })} className={`rounded-lg border px-3 py-3 text-left text-sm ${form.inventory_type === "quantity" ? "border-green-600 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"}`}><Boxes size={16} /><p className="font-semibold mt-1">Track quantity</p><p className="text-xs text-gray-500">Accessories and bulk stock</p></button><button type="button" onClick={() => setForm({ ...form, inventory_type: "individual" })} className={`rounded-lg border px-3 py-3 text-left text-sm ${form.inventory_type === "individual" ? "border-green-600 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"}`}><Smartphone size={16} /><p className="font-semibold mt-1">Track devices</p><p className="text-xs text-gray-500">Phones by IMEI</p></button></div></div>{form.inventory_type === "quantity" ? <Field label="Initial quantity" type="number" min="0" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /> : <div className="rounded-lg border border-gray-200 p-4"><div className="flex justify-between items-center mb-3"><p className="text-sm font-semibold text-gray-900">Devices</p><button type="button" onClick={addDevice} className="text-xs text-green-600 font-medium"><Plus size={14} className="inline" /> Add device</button></div>{form.devices.map((device, index) => <div key={index} className="border-t border-gray-100 pt-3 mt-3 grid sm:grid-cols-2 gap-3"><Field label="IMEI" value={device.imei} onChange={(e) => setForm({ ...form, devices: form.devices.map((item, i) => i === index ? { ...item, imei: e.target.value } : item) })} required /><Field label="IMEI 2 (optional)" value={device.imei_2} onChange={(e) => setForm({ ...form, devices: form.devices.map((item, i) => i === index ? { ...item, imei_2: e.target.value } : item) })} /><Field label="Serial number" value={device.serial_number} onChange={(e) => setForm({ ...form, devices: form.devices.map((item, i) => i === index ? { ...item, serial_number: e.target.value } : item) })} /><Field label="Storage" value={device.storage} onChange={(e) => setForm({ ...form, devices: form.devices.map((item, i) => i === index ? { ...item, storage: e.target.value } : item) })} /><Field label="RAM" value={device.ram} onChange={(e) => setForm({ ...form, devices: form.devices.map((item, i) => i === index ? { ...item, ram: e.target.value } : item) })} /><Field label="Color" value={device.color} onChange={(e) => setForm({ ...form, devices: form.devices.map((item, i) => i === index ? { ...item, color: e.target.value } : item) })} /><Field label="Condition" value={device.condition} onChange={(e) => setForm({ ...form, devices: form.devices.map((item, i) => i === index ? { ...item, condition: e.target.value } : item) })} /></div>)}</div>}</>}<div className="grid sm:grid-cols-2 gap-4"><Field label="Minimum stock" type="number" min="0" value={form.minimum_stock} onChange={(e) => set("minimum_stock", e.target.value)} /><Field label="Supplier" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></div><label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Description</span><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" /></label><div className="flex gap-3 mt-2"><button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium">Cancel</button><button disabled={saving} className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save product"}</button></div></form></div></div>;
}

function Detail({ product, onClose, onEdit, onReload, canEdit }: { product: Product; onClose: () => void; onEdit: () => void; onReload: () => void; canEdit: boolean }) {
  const money = useMoney();
  const [stockAction, setStockAction] = useState<"receive" | "adjust" | "receiveDevices" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  // New device form fields
  const emptyDevice = { imei: "", imei_2: "", serial_number: "", storage: "", ram: "", color: "", condition: "New" };
  const [newDevices, setNewDevices] = useState([{ ...emptyDevice }]);

  const submitStock = async () => {
    setError(""); setSaving(true);
    try {
      if (stockAction === "receive") await receiveStock(product.id, Number(amount), reason);
      else if (stockAction === "adjust") await adjustStock(product.id, Number(amount), reason);
      else if (stockAction === "receiveDevices") {
        const invalidIdx = newDevices.findIndex((d) => !isValidImei(d.imei));
        if (invalidIdx !== -1) { setError(`Device ${invalidIdx + 1}: invalid 15-digit IMEI.`); setSaving(false); return; }
        await receiveDevices(product.id, newDevices);
        setNewDevices([{ ...emptyDevice }]);
      }
      setStockAction(null); setAmount(""); setReason(""); onReload();
    } catch { setError("Could not record this stock change. Check the values and try again."); }
    finally { setSaving(false); }
  };

  const toggleActive = async () => {
    setTogglingActive(true);
    try { await setProductActive(product.id, !product.is_active); onReload(); }
    catch { setError("Could not update product status."); }
    finally { setTogglingActive(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={onClose} /><div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
    <div className="flex justify-between gap-4">
      <div>
        <p className="text-xs text-gray-400">{product.category} {product.brand ? `· ${product.brand}` : ""}</p>
        <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
        <p className="text-sm text-gray-500">{product.model || ""} {product.sku ? `· SKU ${product.sku}` : ""}</p>
      </div>
      <button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
      <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Available stock</p><p className="font-bold text-gray-900">{availableStock(product)}</p></div>
      <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Selling price</p><p className="font-bold text-gray-900">{money(product.selling_price)}</p></div>
      <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Estimated margin</p><p className="font-bold text-green-600">{money(product.selling_price - product.buying_price)}</p></div>
      <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">Status</p><Status product={product} /></div>
    </div>

    {canEdit && (
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"><Edit3 size={15} /> Edit</button>
        {product.inventory_type === "quantity" && (
          <>
            <button onClick={() => setStockAction("receive")} className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm">Receive stock</button>
            <button onClick={() => setStockAction("adjust")} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Adjust stock</button>
          </>
        )}
        {product.inventory_type === "individual" && (
          <button onClick={() => setStockAction("receiveDevices")} className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm inline-flex items-center gap-2">
            <Plus size={14} /> Receive devices
          </button>
        )}
        <button
          onClick={toggleActive}
          disabled={togglingActive}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${product.is_active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
        >
          {product.is_active ? <><ToggleRight size={15} /> Deactivate</> : <><ToggleLeft size={15} /> Activate</>}
        </button>
      </div>
    )}

    {stockAction === "receiveDevices" && (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-5">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-gray-900">Receive new devices</p>
          <button type="button" onClick={() => setNewDevices([...newDevices, { ...emptyDevice }])} className="text-xs text-green-600 font-medium">
            <Plus size={13} className="inline" /> Add another
          </button>
        </div>
        {newDevices.map((d, i) => (
          <div key={i} className={`grid sm:grid-cols-2 gap-3 ${i > 0 ? "border-t border-gray-200 pt-3 mt-3" : ""}`}>
            <Field label="IMEI" value={d.imei} onChange={(e: any) => setNewDevices(newDevices.map((x, j) => j === i ? { ...x, imei: e.target.value } : x))} />
            <Field label="IMEI 2 (optional)" value={d.imei_2} onChange={(e: any) => setNewDevices(newDevices.map((x, j) => j === i ? { ...x, imei_2: e.target.value } : x))} />
            <Field label="Storage" value={d.storage} onChange={(e: any) => setNewDevices(newDevices.map((x, j) => j === i ? { ...x, storage: e.target.value } : x))} />
            <Field label="RAM" value={d.ram} onChange={(e: any) => setNewDevices(newDevices.map((x, j) => j === i ? { ...x, ram: e.target.value } : x))} />
            <Field label="Color" value={d.color} onChange={(e: any) => setNewDevices(newDevices.map((x, j) => j === i ? { ...x, color: e.target.value } : x))} />
            <Field label="Condition" value={d.condition} onChange={(e: any) => setNewDevices(newDevices.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))} />
          </div>
        ))}
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button onClick={() => { setStockAction(null); setError(""); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submitStock} className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm disabled:opacity-50">{saving ? "Receiving..." : "Save devices"}</button>
        </div>
      </div>
    )}

    {(stockAction === "receive" || stockAction === "adjust") && (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-5">
        <p className="text-sm font-semibold mb-3">{stockAction === "receive" ? "Receive stock" : "Adjust stock"}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={stockAction === "receive" ? "Units to receive" : "Change (+/-)"} type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
          <Field label="Reason" value={reason} onChange={(e: any) => setReason(e.target.value)} required />
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <button disabled={saving} onClick={submitStock} className="mt-3 rounded-lg bg-green-600 text-white px-3 py-2 text-sm disabled:opacity-50">{saving ? "Recording..." : "Record change"}</button>
      </div>
    )}

    <div className="flex justify-between items-center mb-2">
      <h3 className="text-sm font-semibold text-gray-900">Device inventory</h3>
      <Status product={product} />
    </div>
    {product.inventory_type === "individual" ? (
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
        {(product.product_devices ?? []).map((device) => (
          <div key={device.id} className="p-3 flex justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-gray-700">IMEI {device.imei}</p>
              <p className="text-xs text-gray-500">{[device.imei_2 && `IMEI 2 ${device.imei_2}`, device.serial_number, device.storage, device.ram, device.color, device.condition].filter(Boolean).join(" · ")}</p>
            </div>
            <span className="text-xs text-gray-500">{device.status}</span>
          </div>
        ))}
        {(product.product_devices ?? []).length === 0 && <p className="p-4 text-sm text-gray-400">No devices added yet.</p>}
      </div>
    ) : (
      <p className="text-sm text-gray-500">{product.description || "Quantity-tracked stock. Every receipt and adjustment is recorded in inventory history."}</p>
    )}
    <p className="text-xs text-gray-400 mt-5">Estimated inventory value: {money(availableStock(product) * product.buying_price)}</p>
    {!product.is_active && <p className="text-xs text-amber-600 mt-2 font-medium">This product is inactive and won't appear in sales.</p>}
  </div></div>;
}

export default function ProductsPage({ businessId, role }: Props) {
  const money = useMoney();
  const [products, setProducts] = useState<Product[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [query, setQuery] = useState(""); const [category, setCategory] = useState("All"); const [type, setType] = useState("All"); const [status, setStatus] = useState("All"); const [modal, setModal] = useState<"add" | "edit" | null>(null); const [selected, setSelected] = useState<Product | null>(null);
  const load = async () => { setLoading(true); setError(""); try { setProducts(await listProducts(businessId)); } catch { setError("Could not load products. Check your connection and try again."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [businessId]);
  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category)))];
  const filtered = useMemo(() => products.filter((product) => { const text = [product.name, product.brand, product.model, product.sku, ...(product.product_devices ?? []).map((device) => device.imei)].filter(Boolean).join(" ").toLowerCase(); return text.includes(query.toLowerCase()) && (category === "All" || product.category === category) && (type === "All" || product.inventory_type === type) && (status === "All" || stockState(product) === status); }), [products, query, category, type, status]);
  const value = products.reduce((total, product) => total + availableStock(product) * product.buying_price, 0);
  return <div className="p-5 lg:p-8 flex flex-col gap-5"><div className="flex items-center justify-between flex-wrap gap-3"><div><h2 className="text-lg font-bold text-gray-900">Products</h2><p className="text-sm text-gray-500">{products.length} products · Estimated inventory value {money(value)}</p></div>{canManage(role) && <button onClick={() => setModal("add")} className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium"><Plus size={15} /> Add product</button>}</div><div className="flex flex-wrap gap-2"><div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-80"><Search size={15} className="text-gray-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, SKU, brand or IMEI..." className="flex-1 text-sm outline-none" /></div><select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="All">All types</option><option value="quantity">Quantity</option><option value="individual">Devices</option></select><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="All">All stock</option><option value="healthy">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select><button onClick={load} aria-label="Refresh products" className="rounded-lg border border-gray-200 p-2 text-gray-500"><RefreshCw size={16} /></button></div>{error && <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"><AlertTriangle size={16} className="inline mr-2" />{error}</div>}{loading ? <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-sm text-gray-500">Loading products...</div> : filtered.length === 0 ? <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><Package size={24} className="mx-auto text-gray-300 mb-3" /><p className="text-sm font-semibold text-gray-900">{products.length ? "No products match these filters." : "No products yet."}</p><p className="text-sm text-gray-500 mt-1">{products.length ? "Try a different search or filter." : "Add your first product to start managing your inventory."}</p></div> : <div className="bg-white rounded-xl border border-gray-100 overflow-hidden"><div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-400 border-b border-gray-50"><th className="px-5 py-3 font-medium">Product</th><th className="px-5 py-3 font-medium">Category</th><th className="px-5 py-3 font-medium">Type</th><th className="px-5 py-3 font-medium">Stock</th><th className="px-5 py-3 font-medium">Selling price</th><th className="px-5 py-3 font-medium">Status</th><th /></tr></thead><tbody>{filtered.map((product) => <tr key={product.id} onClick={() => setSelected(product)} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"><td className="px-5 py-3"><p className="font-medium text-gray-900">{product.name}</p><p className="text-xs text-gray-400">{product.brand || ""} {product.sku ? `· ${product.sku}` : ""}</p></td><td className="px-5 py-3 text-gray-500">{product.category}</td><td className="px-5 py-3 text-gray-500">{product.inventory_type === "individual" ? "Devices" : "Quantity"}</td><td className="px-5 py-3 font-semibold">{availableStock(product)} {product.inventory_type === "individual" ? "devices" : "units"}</td><td className="px-5 py-3 font-medium">{money(product.selling_price)}</td><td className="px-5 py-3"><Status product={product} /></td><td className="px-5 py-3"><ChevronRight size={16} className="text-gray-300" /></td></tr>)}</tbody></table></div><div className="md:hidden divide-y divide-gray-100">{filtered.map((product) => <button key={product.id} onClick={() => setSelected(product)} className="w-full text-left p-4 flex items-center justify-between"><div><p className="font-medium text-gray-900">{product.name}</p><p className="text-xs text-gray-500 mt-1">{availableStock(product)} {product.inventory_type === "individual" ? "devices" : "units"} · {money(product.selling_price)}</p><div className="mt-2"><Status product={product} /></div></div><ChevronRight size={16} className="text-gray-300" /></button>)}</div></div>}{selected && <Detail product={selected} canEdit={canManage(role)} onClose={() => setSelected(null)} onEdit={() => { setModal("edit"); }} onReload={async () => { await load(); setSelected(null); }} />}{modal && <ProductModal product={modal === "edit" ? selected ?? undefined : undefined} businessId={businessId} onClose={() => setModal(null)} onSaved={load} />}</div>;
}
