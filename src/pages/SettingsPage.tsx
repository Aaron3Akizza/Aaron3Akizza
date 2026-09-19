import { FormEvent, useEffect, useState } from "react";
import { Building2, Lock, Check, AlertTriangle, Eye, EyeOff, UserCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth, useBusiness } from "../context/AuthContext";

const money_currencies = [
  { value: "UGX", label: "UGX — Ugandan Shilling" },
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "TZS", label: "TZS — Tanzanian Shilling" },
  { value: "USD", label: "USD — US Dollar" },
];

function Field({ label, ...props }: { label: string; [key: string]: any }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <input
        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        {...props}
      />
    </label>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h2 className="text-base font-bold text-gray-900 mb-0.5">{title}</h2>
      <p className="text-sm text-gray-500 mb-5">{description}</p>
      {children}
    </div>
  );
}

function Alert({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm ${type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
      {type === "success" ? <Check size={15} /> : <AlertTriangle size={15} />}
      {message}
    </div>
  );
}

function BusinessSettings() {
  const { business } = useBusiness();
  const { refreshBusiness } = useAuth();
  const [form, setForm] = useState({
    name: business?.name ?? "",
    phone: business?.phone ?? "",
    email: business?.email ?? "",
    location: business?.location ?? "",
    currency: business?.currency ?? "UGX",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name,
        phone: business.phone ?? "",
        email: business.email ?? "",
        location: business.location ?? "",
        currency: business.currency,
      });
    }
  }, [business]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!form.name.trim()) { setStatus({ type: "error", message: "Business name is required." }); return; }
    if (!supabase || !business) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          location: form.location.trim() || null,
          currency: form.currency,
        })
        .eq("id", business.id);
      if (error) throw error;
      await refreshBusiness();
      setStatus({ type: "success", message: "Business details updated." });
    } catch {
      setStatus({ type: "error", message: "Could not save changes. Check your connection." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Business details" description="Update your shop name, contact info and currency.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Business name"
          value={form.name}
          onChange={(e: any) => setForm({ ...form, name: e.target.value })}
          required
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Phone number"
            value={form.phone}
            onChange={(e: any) => setForm({ ...form, phone: e.target.value })}
            placeholder="+256 700 000 000"
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(e: any) => setForm({ ...form, email: e.target.value })}
            placeholder="shop@business.com"
          />
        </div>
        <Field
          label="Location"
          value={form.location}
          onChange={(e: any) => setForm({ ...form, location: e.target.value })}
          placeholder="e.g. Kampala, Uganda"
        />
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1.5">Currency</span>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {money_currencies.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        {status && <Alert type={status.type} message={status.message} />}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </Section>
  );
}

function ProfileSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.user_metadata?.full_name ?? "",
    phone: user?.user_metadata?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: form.full_name.trim(), phone: form.phone.trim() },
      });
      if (error) throw error;
      // Also update profiles table
      if (user) {
        await supabase
          .from("profiles")
          .update({ full_name: form.full_name.trim(), phone: form.phone.trim() || null })
          .eq("id", user.id);
      }
      setStatus({ type: "success", message: "Profile updated." });
    } catch {
      setStatus({ type: "error", message: "Could not update profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Your profile" description="Update your name and phone number.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Full name"
            value={form.full_name}
            onChange={(e: any) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(e: any) => setForm({ ...form, phone: e.target.value })}
            placeholder="+256 700 000 000"
          />
        </div>
        <Field label="Email" value={user?.email ?? ""} disabled />
        <p className="text-xs text-gray-400 -mt-2">Email cannot be changed here. Contact support if needed.</p>
        {status && <Alert type={status.type} message={status.message} />}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update profile"}
          </button>
        </div>
      </form>
    </Section>
  );
}

function PasswordSettings() {
  const [form, setForm] = useState({ newPass: "", confirm: "" });
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (form.newPass.length < 8) { setStatus({ type: "error", message: "New password must be at least 8 characters." }); return; }
    if (form.newPass !== form.confirm) { setStatus({ type: "error", message: "Passwords do not match." }); return; }
    if (!supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: form.newPass });
      if (error) throw error;
      setForm({ newPass: "", confirm: "" });
      setStatus({ type: "success", message: "Password changed. Use your new password next time you log in." });
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() ?? "";
      if (msg.includes("same password")) {
        setStatus({ type: "error", message: "New password must be different from your current one." });
      } else {
        setStatus({ type: "error", message: "Could not change password. Try again." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Change password" description="Choose a new password of at least 8 characters. You are already verified via your active session.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1.5">New password</span>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={form.newPass}
              onChange={(e) => setForm({ ...form, newPass: e.target.value })}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-green-600"
              required
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="Toggle visibility">
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>
        <Field
          label="Confirm new password"
          type="password"
          value={form.confirm}
          onChange={(e: any) => setForm({ ...form, confirm: e.target.value })}
          placeholder="Repeat new password"
          required
        />
        {status && <Alert type={status.type} message={status.message} />}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Changing..." : "Change password"}
          </button>
        </div>
      </form>
    </Section>
  );
}

function DangerZone() {
  const { signOut } = useAuth();

  return (
    <Section title="Account" description="Sign out of BizFlow on this device.">
      <button
        onClick={signOut}
        className="rounded-lg border border-red-200 text-red-600 px-4 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
      >
        Sign out
      </button>
    </Section>
  );
}

type Tab = "business" | "profile" | "password";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "business", label: "Business", icon: Building2 },
  { id: "profile", label: "Profile", icon: UserCircle2 },
  { id: "password", label: "Password & security", icon: Lock },
];

export default function SettingsPage({ role }: { role: string | null }) {
  const [tab, setTab] = useState<Tab>("business");
  const isOwner = role === "owner";

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage your business and account settings</p>
      </div>

      <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1 w-fit">
        {TABS.filter((t) => t.id !== "business" || isOwner).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "business" && isOwner && <BusinessSettings />}
      {tab === "profile" && <ProfileSettings />}
      {tab === "password" && <PasswordSettings />}
      <DangerZone />
    </div>
  );
}
