import { useEffect, useState } from "react";
import { Plus, X, UserCog, AlertTriangle, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import { listStaff, updateMemberRole, deactivateMember, reactivateMember, inviteStaff, type StaffMember } from "../lib/staff";

type Props = { businessId: string; role: string | null };

const ROLES = ["owner", "manager", "inventory", "cashier"] as const;
type Role = (typeof ROLES)[number];

const ROLE_INFO: Record<string, { label: string; desc: string; color: string }> = {
  owner: { label: "Owner", desc: "Full access to everything", color: "bg-purple-50 text-purple-600" },
  manager: { label: "Manager", desc: "All features except ownership transfer", color: "bg-blue-50 text-blue-600" },
  inventory: { label: "Inventory", desc: "Products and stock only", color: "bg-green-50 text-green-600" },
  cashier: { label: "Cashier", desc: "Sales and customers only", color: "bg-amber-50 text-amber-600" },
};

function RoleBadge({ role }: { role: string }) {
  const info = ROLE_INFO[role] ?? { label: role, color: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>{info.label}</span>;
}

function InviteModal({ businessId, onClose }: { businessId: string; onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("cashier");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); return; }
    setSaving(true);
    try {
      await inviteStaff(businessId, email.trim(), role);
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? "Could not send the invite. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">Invite team member</h2>
          <button onClick={onClose} aria-label="Close"><X size={18} className="text-gray-400" /></button>
        </div>
        {sent ? (
          <div className="text-center py-4">
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Invite sent!</p>
            <p className="text-sm text-gray-500 mt-1">A login link was sent to <b>{email}</b>. They'll join as <b>{ROLE_INFO[role]?.label}</b>.</p>
            <button onClick={onClose} className="mt-5 rounded-lg bg-green-600 text-white px-5 py-2.5 text-sm font-medium">Done</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="block text-sm">
              <span className="block font-medium text-gray-700 mb-1.5">Email address</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@shop.com" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
            </label>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">Role</span>
              <div className="flex flex-col gap-2">
                {ROLES.filter((r) => r !== "owner").map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${role === r ? "border-green-600 bg-green-50" : "border-gray-200"}`}>
                    <span className="font-semibold text-gray-900">{ROLE_INFO[r].label}</span>
                    <span className="text-gray-500 text-xs ml-2">{ROLE_INFO[r].desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 mt-1">
              <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium">Cancel</button>
              <button disabled={saving} onClick={submit} className="flex-1 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">{saving ? "Sending..." : "Send invite"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffPage({ businessId, role: myRole }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<Role>("cashier");
  const [saving, setSaving] = useState(false);

  const isOwner = myRole === "owner";

  const load = async () => {
    setLoading(true); setError("");
    try { setStaff(await listStaff(businessId)); }
    catch { setError("Could not load staff list."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [businessId]);

  const handleRoleChange = async (memberId: string) => {
    setSaving(true);
    try {
      await updateMemberRole(memberId, newRole);
      setEditingRole(null);
      await load();
    } catch { setError("Could not update the role."); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (member: StaffMember) => {
    if (!window.confirm(member.is_active ? `Deactivate ${member.full_name}? They won't be able to log in.` : `Reactivate ${member.full_name}?`)) return;
    setSaving(true);
    try {
      member.is_active ? await deactivateMember(member.id) : await reactivateMember(member.id);
      await load();
    } catch { setError("Could not update member status."); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-5 lg:p-8 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Staff</h2>
          <p className="text-sm text-gray-500">{staff.filter((s) => s.is_active).length} active members</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} aria-label="Refresh" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-gray-700"><RefreshCw size={16} /></button>
          {isOwner && (
            <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium">
              <Plus size={15} /> Invite member
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 flex gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Role reference */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES.map((r) => (
          <div key={r} className="bg-white rounded-xl border border-gray-100 p-3.5">
            <RoleBadge role={r} />
            <p className="text-xs text-gray-500 mt-1.5">{ROLE_INFO[r].desc}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-sm text-gray-400">Loading staff...</div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <UserCog size={24} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-900">No staff yet.</p>
          <p className="text-sm text-gray-500 mt-1">Invite team members to give them access to BizFlow.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                {isOwner && <th className="px-5 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {staff.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-xs font-bold text-green-600 shrink-0">
                        {(m.full_name[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{m.full_name}</p>
                        {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {editingRole === m.id ? (
                      <div className="flex items-center gap-2">
                        <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600">
                          {ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
                        </select>
                        <button disabled={saving} onClick={() => handleRoleChange(m.id)} className="text-xs text-green-600 font-medium disabled:opacity-50">Save</button>
                        <button onClick={() => setEditingRole(null)} className="text-xs text-gray-400">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <RoleBadge role={m.role} />
                        {isOwner && m.role !== "owner" && (
                          <button onClick={() => { setEditingRole(m.id); setNewRole(m.role as Role); }} className="text-xs text-gray-400 hover:text-green-600">Edit</button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                      {m.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{new Date(m.created_at).toLocaleDateString()}</td>
                  {isOwner && (
                    <td className="px-5 py-3">
                      {m.role !== "owner" && (
                        <button
                          disabled={saving}
                          onClick={() => handleToggleActive(m)}
                          aria-label={m.is_active ? "Deactivate" : "Reactivate"}
                          className={`disabled:opacity-50 ${m.is_active ? "text-red-400 hover:text-red-600" : "text-green-500 hover:text-green-700"}`}
                        >
                          {m.is_active ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && <InviteModal businessId={businessId} onClose={() => setShowInvite(false)} onInvited={load} />}
    </div>
  );
}
