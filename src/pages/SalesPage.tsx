import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight, Plus, Printer, Search, Trash2, X, Filter } from "lucide-react";
import { availableStock, listProducts, Product } from "../lib/inventory";
import { CartItem, cartTotal, completeSale, createCustomer, Customer, getSale, listCustomers, listSales, Sale, updateSaleDueDate, voidSale } from "../lib/sales";
import { useMoney, formatDateTime } from "../lib/format";

type Props = { businessId: string; role: string | null; mode?: "history" | "new" };
const canVoid = (role: string | null) => role === "owner" || role === "manager";

function ProductPicker({ products, onAdd }: { products: Product[]; onAdd: (product: Product, deviceId?: string) => void }) {
  const money = useMoney();
  const [query, setQuery] = useState(""); const [deviceProduct, setDeviceProduct] = useState<Product | null>(null);
  const results = products.filter((product) => [product.name, product.brand, product.model, product.sku, ...(product.product_devices ?? []).map((device) => device.imei)].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase()) && product.is_active && availableStock(product) > 0);
  return <div className="bg-white rounded-xl border border-gray-100 p-5"><h2 className="text-sm font-semibold text-gray-900 mb-3">Find products</h2><div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 mb-4"><Search size={15} className="text-gray-400" /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, SKU, brand or IMEI..." className="flex-1 text-sm outline-none" /></div><div className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">{results.map((product) => <button key={product.id} onClick={() => product.inventory_type === "individual" ? setDeviceProduct(product) : onAdd(product)} className="w-full text-left py-3 flex items-center justify-between hover:bg-gray-50"><span><span className="block text-sm font-medium text-gray-900">{product.name}</span><span className="block text-xs text-gray-500">{product.brand || ""} {product.model || ""} · {money(product.selling_price)}</span></span><span className="text-right"><span className="block text-xs font-semibold text-gray-700">{availableStock(product)} {product.inventory_type === "individual" ? "device" : "units"}</span><Plus size={15} className="ml-auto text-green-600" /></span></button>)}{results.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No available products found.</p>}</div>{deviceProduct && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={() => setDeviceProduct(null)} /><div className="relative bg-white rounded-2xl w-full max-w-md p-6"><div className="flex justify-between mb-4"><h3 className="font-bold text-gray-900">Select device</h3><button onClick={() => setDeviceProduct(null)} aria-label="Close"><X size={18} /></button></div><div className="divide-y divide-gray-100">{(deviceProduct.product_devices ?? []).filter((device) => device.status === "in_stock").map((device) => <button key={device.id} onClick={() => { onAdd(deviceProduct, device.id); setDeviceProduct(null); }} className="w-full text-left py-3"><p className="font-mono text-xs">IMEI {device.imei}</p><p className="text-xs text-gray-500">{[device.storage, device.ram, device.color, device.condition].filter(Boolean).join(" · ")}</p></button>)}</div></div></div>}</div>;
}

function Cart({ cart, setCart, businessId, onComplete }: { cart: CartItem[]; setCart: (cart: CartItem[]) => void; businessId: string; onComplete: (receipt: { id: string; receipt_number: string }) => void }) {
  const money = useMoney();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { listCustomers(businessId).then(setCustomers).catch(() => undefined); }, [businessId]);

  const subtotal = cart.reduce((total, item) => total + item.product.selling_price * item.quantity, 0);
  const total = cartTotal(cart, Number(discount));
  const balance = Math.max(0, total - Number(paid || 0));

  const addCustomer = async () => {
    if (!newName.trim()) return;
    try { const customer = await createCustomer(businessId, newName, newPhone); setCustomers([...customers, customer]); setCustomerId(customer.id); setNewName(""); setNewPhone(""); }
    catch { setError("Could not create the customer."); }
  };

  const submit = async () => {
    setError("");
    if (!cart.length) return;
    if (Number(discount) < 0 || Number(discount) > subtotal || Number(paid) < 0 || Number(paid) > total) { setError("Check the discount and payment amounts."); return; }
    if (balance > 0 && !customerId) { setError("Choose or create a customer for an unpaid sale."); return; }
    setSaving(true);
    try {
      const receipt = await completeSale(businessId, customerId || null, Number(discount), Number(paid || 0), method, reference, cart);
      // Set due date if provided and there's a balance
      if (dueDate && balance > 0) {
        await updateSaleDueDate(receipt.id, dueDate).catch(() => undefined);
      }
      onComplete(receipt);
    } catch (caught) {
      const message = (caught as Error).message.toLowerCase();
      setError(message.includes("stock") || message.includes("device") ? "Stock changed during checkout. Refresh products and try again." : "Could not complete the sale. No changes were saved.");
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Cart</h2>
        <span className="text-xs text-gray-500">{cart.length} line{cart.length === 1 ? "" : "s"}</span>
      </div>
      {cart.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">Add a product to begin the sale.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {cart.map((item) => (
            <div key={`${item.product.id}-${item.deviceId || "quantity"}`} className="py-3 flex justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                <p className="text-xs text-gray-500">{item.deviceId ? `IMEI ${(item.product.product_devices ?? []).find((d) => d.id === item.deviceId)?.imei}` : `${money(item.product.selling_price)} × ${item.quantity}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{money(item.product.selling_price * item.quantity)}</span>
                <button onClick={() => setCart(cart.filter((c) => c !== item))} aria-label="Remove"><Trash2 size={15} className="text-red-600" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-gray-100 mt-3 pt-4 flex flex-col gap-3">
        <label className="text-sm">Customer
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="block w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Walk-in customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New customer name" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <button onClick={addCustomer} className="text-left text-xs text-green-600 font-medium">+ Add customer</button>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Discount
            <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="block w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">Amount paid
            <input type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} className="block w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </label>
        </div>
        {balance > 0 && (
          <label className="text-sm">
            <span className="block font-medium text-amber-600 mb-1">Payment due date <span className="text-gray-400 font-normal">(optional)</span></span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="block w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Payment method
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="block w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
              <option value="credit">Credit</option>
            </select>
          </label>
          <label className="text-sm">Reference
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" className="block w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="text-sm space-y-1 border-t border-gray-100 pt-3">
          <p className="flex justify-between"><span>Subtotal</span><b>{money(subtotal)}</b></p>
          <p className="flex justify-between"><span>Discount</span><b>{money(Number(discount))}</b></p>
          <p className="flex justify-between text-base"><span>Total</span><b>{money(total)}</b></p>
          {balance > 0 && <p className="flex justify-between text-amber-600"><span>Balance owing</span><b>{money(balance)}</b></p>}
        </div>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        <button disabled={saving || !cart.length} onClick={submit} className="w-full rounded-lg bg-green-600 text-white px-4 py-3 text-sm font-semibold disabled:opacity-50">
          {saving ? "Completing sale..." : "Complete sale"}
        </button>
      </div>
    </div>
  );
}

export function NewSalePage({ businessId }: { businessId: string }) { const navigate = useNavigate(); const [products, setProducts] = useState<Product[]>([]); const [cart, setCart] = useState<CartItem[]>([]); const [receipt, setReceipt] = useState<{ id: string; receipt_number: string } | null>(null); const load = () => listProducts(businessId).then(setProducts); useEffect(() => { load().catch(() => undefined); }, [businessId]); const add = (product: Product, deviceId?: string) => { if (deviceId || product.inventory_type === "individual") { if (!cart.some((item) => item.deviceId === deviceId)) setCart([...cart, { product, quantity: 1, deviceId }]); return; } const existing = cart.find((item) => item.product.id === product.id); if (existing) setCart(cart.map((item) => item === existing ? { ...item, quantity: item.quantity + 1 } : item)); else setCart([...cart, { product, quantity: 1 }]); }; return <div className="p-5 lg:p-8"><div className="flex items-center gap-3 mb-5"><button onClick={() => navigate("/app/sales")} aria-label="Back to sales" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft size={18} /> Back</button><div><h2 className="text-lg font-bold text-gray-900">New sale</h2><p className="text-sm text-gray-500">Find products, confirm payment, and complete checkout.</p></div></div>{receipt ? <ReceiptView receipt={receipt} /> : <div className="grid lg:grid-cols-5 gap-5"><div className="lg:col-span-3"><ProductPicker products={products} onAdd={add} /></div><div className="lg:col-span-2"><Cart cart={cart} setCart={setCart} businessId={businessId} onComplete={setReceipt} /></div></div>}</div>; }

function ReceiptView({ receipt }: { receipt: { id: string; receipt_number: string } }) {
  const money = useMoney();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getSale(receipt.id)
      .then(setDetail)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [receipt.id]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 p-8 print-receipt print:border-0 print:shadow-none print:p-4">
      <div className="text-center mb-6 print:mb-4">
        <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
          <Check size={24} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Sale complete</h2>
        <p className="text-sm text-gray-500 mt-1">Receipt #{receipt.receipt_number}</p>
        {detail && <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(detail.created_at)}</p>}
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-400">Loading receipt...</p>
      ) : detail ? (
        <>
          <div className="divide-y divide-gray-100 mb-5">
            {(detail.sale_items ?? []).map((item: any) => (
              <div key={item.id} className="py-3 flex justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.product_name_snapshot}</p>
                  <p className="text-xs text-gray-400">
                    {item.quantity} × {money(item.unit_price)}
                    {item.device_imei ? ` · IMEI ${item.device_imei}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">{money(item.subtotal)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm mb-5">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{money(detail.subtotal)}</span></div>
            {detail.discount > 0 && <div className="flex justify-between text-gray-600"><span>Discount</span><span>- {money(detail.discount)}</span></div>}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1"><span>Total</span><span>{money(detail.total)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Paid</span><span>{money(detail.amount_paid)}</span></div>
            {detail.balance > 0 && <div className="flex justify-between text-amber-600 font-semibold"><span>Balance owing</span><span>{money(detail.balance)}</span></div>}
          </div>

          {detail.customers?.full_name && (
            <p className="text-xs text-gray-400 mb-5 text-center">Customer: {detail.customers.full_name}</p>
          )}
        </>
      ) : null}

      <div className="flex gap-3 print:hidden">
        <button onClick={() => navigate("/app/sales")} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700">
          View sales
        </button>
        <button onClick={() => window.print()} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium">
          <Printer size={15} /> Print
        </button>
      </div>
    </div>
  );
}

export function SalesHistoryPage({ businessId, role }: Props) {
  const money = useMoney();
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const load = () => listSales(businessId).then(setSales).catch(() => setError("Could not load sales."));
  useEffect(() => { load(); }, [businessId]);

  const filtered = sales.filter((s) => {
    const text = [s.receipt_number].join(" ").toLowerCase();
    const matchQuery = !query || text.includes(query.toLowerCase());
    const matchStatus = statusFilter === "all" || s.payment_status === statusFilter || s.sale_status === statusFilter;
    const matchFrom = !fromDate || s.created_at >= fromDate;
    const matchTo = !toDate || s.created_at <= toDate + "T23:59:59";
    return matchQuery && matchStatus && matchFrom && matchTo;
  });

  const totalRevenue = filtered.filter((s) => s.sale_status !== "voided").reduce((sum, s) => sum + s.total, 0);
  const totalBalance = filtered.filter((s) => s.sale_status !== "voided").reduce((sum, s) => sum + s.balance, 0);

  return (
    <div className="p-5 lg:p-8">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Sales</h2>
          <p className="text-sm text-gray-500">
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
            {totalRevenue > 0 ? ` · ${money(totalRevenue)} revenue` : ""}
          </p>
        </div>
        <button onClick={() => navigate("/app/sales/new")} className="rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium">
          New sale
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-64">
          <Search size={14} className="text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipt number..." className="flex-1 text-sm outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="all">All status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="credit">Credit</option>
          <option value="voided">Voided</option>
        </select>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${showFilters ? "border-green-600 text-green-600 bg-green-50" : "border-gray-200 text-gray-600"}`}>
          <Filter size={14} /> Date range
        </button>
        {(query || statusFilter !== "all" || fromDate || toDate) && (
          <button onClick={() => { setQuery(""); setStatusFilter("all"); setFromDate(""); setToDate(""); }} className="text-xs text-gray-400 hover:text-gray-700">
            Clear filters
          </button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
              <th className="px-5 py-3">Receipt</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Paid</th>
              <th className="px-5 py-3">Balance</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((sale) => (
              <tr key={sale.id} onClick={() => getSale(sale.id).then(setSelected)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                <td className="px-5 py-3 font-medium">{sale.receipt_number}</td>
                <td className="px-5 py-3">{money(sale.total)}</td>
                <td className="px-5 py-3">{money(sale.amount_paid)}</td>
                <td className={`px-5 py-3 ${sale.balance > 0 ? "text-amber-600 font-medium" : "text-gray-400"}`}>{money(sale.balance)}</td>
                <td className="px-5 py-3">
                  {sale.sale_status === "voided" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Voided</span>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sale.payment_status === "paid" ? "bg-green-50 text-green-600" : sale.payment_status === "credit" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                      {sale.payment_status === "paid" ? "Paid" : sale.payment_status === "credit" ? "Credit" : "Partial"}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500">{formatDateTime(sale.created_at)}</td>
                <td className="px-5 py-3"><ChevronRight size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="p-10 text-center text-sm text-gray-500">No sales match your filters.</p>}
      </div>

      {totalBalance > 0 && (
        <p className="text-sm text-amber-600 mt-3 font-medium">Total outstanding in view: {money(totalBalance)}</p>
      )}

      {selected && (
        <SaleDetail
          sale={selected}
          canVoid={canVoid(role)}
          onClose={() => setSelected(null)}
          onVoided={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}

function SaleDetail({ sale, canVoid: allowed, onClose, onVoided }: { sale: any; canVoid: boolean; onClose: () => void; onVoided: () => void }) {
  const money = useMoney();
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState("");
  const [editDue, setEditDue] = useState(false);
  const [dueDate, setDueDate] = useState(sale.due_date?.slice(0, 10) ?? "");
  const [savingDue, setSavingDue] = useState(false);

  const isOverdue = sale.balance > 0 && sale.due_date && new Date(sale.due_date) < new Date();

  const handleVoid = async () => {
    if (!window.confirm("Void this sale and restore its stock?")) return;
    setVoiding(true);
    try { await voidSale(sale.id, "Voided from sales history"); onVoided(); }
    catch { setError("Could not void this sale."); }
    finally { setVoiding(false); }
  };

  const saveDueDate = async () => {
    setSavingDue(true);
    try { await updateSaleDueDate(sale.id, dueDate || null); sale.due_date = dueDate || null; setEditDue(false); }
    catch { setError("Could not update due date."); }
    finally { setSavingDue(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-5 top-5"><X size={18} /></button>
        <h2 className="text-lg font-bold">{sale.receipt_number}</h2>
        <p className="text-sm text-gray-500 mb-5">{formatDateTime(sale.created_at)}</p>

        <div className="divide-y divide-gray-100">
          {(sale.sale_items ?? []).map((item: any) => (
            <div key={item.id} className="py-3 flex justify-between">
              <span><b>{item.product_name_snapshot}</b><small className="block text-gray-500">{item.quantity} × {money(item.unit_price)}{item.device_id ? " · IMEI tracked" : ""}</small></span>
              <b>{money(item.subtotal)}</b>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
          <p className="flex justify-between"><span>Subtotal</span><b>{money(sale.subtotal)}</b></p>
          {sale.discount > 0 && <p className="flex justify-between"><span>Discount</span><b>- {money(sale.discount)}</b></p>}
          <p className="flex justify-between"><span>Total</span><b>{money(sale.total)}</b></p>
          <p className="flex justify-between"><span>Paid / balance</span><b>{money(sale.amount_paid)} / {money(sale.balance)}</b></p>
          <p className="flex justify-between"><span>Gross profit</span><b>{money(sale.gross_profit)}</b></p>
        </div>

        {/* Due date */}
        {sale.balance > 0 && (
          <div className={`mt-4 rounded-lg p-3 ${isOverdue ? "bg-red-50" : "bg-amber-50"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
                  {isOverdue ? "OVERDUE" : "Payment due"}
                </p>
                {sale.due_date ? (
                  <p className="text-sm font-medium text-gray-900">{new Date(sale.due_date).toLocaleDateString()}</p>
                ) : (
                  <p className="text-sm text-gray-400">No due date set</p>
                )}
              </div>
              <button onClick={() => setEditDue(!editDue)} className="text-xs text-green-600 font-medium">
                {editDue ? "Cancel" : "Edit"}
              </button>
            </div>
            {editDue && (
              <div className="flex gap-2 mt-2">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
                <button disabled={savingDue} onClick={saveDueDate} className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm disabled:opacity-50">
                  {savingDue ? "..." : "Save"}
                </button>
              </div>
            )}
          </div>
        )}

        {allowed && sale.sale_status === "completed" && (
          <button disabled={voiding} onClick={handleVoid} className="mt-5 rounded-lg bg-red-600 text-white px-4 py-2.5 text-sm">
            {voiding ? "Voiding..." : "Void sale"}
          </button>
        )}
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>
    </div>
  );
}
