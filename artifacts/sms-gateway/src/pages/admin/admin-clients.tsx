import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Trash2, DollarSign, Eye, X, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_PERMS = { sendSms: true, sendBulkSms: true, uploadContacts: false, viewDeliveryReports: true, accessApiCredentials: false, useSenderId: true, exportReports: true };

interface ClientForm {
  username: string; email: string; password: string; phone: string;
  companyName: string; smsRate: number; balance: number; permissions: typeof DEFAULT_PERMS;
  smppHost: string; smppPort: string; smppSystemId: string; smppPassword: string; httpApiKey: string;
}

const EMPTY_FORM: ClientForm = {
  username: "", email: "", password: "", phone: "", companyName: "",
  smsRate: 0.25, balance: 0, permissions: { ...DEFAULT_PERMS },
  smppHost: "", smppPort: "2775", smppSystemId: "", smppPassword: "", httpApiKey: "",
};

export default function AdminClients() {
  const { token } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showConn, setShowConn] = useState(false);
  const [balanceModal, setBalanceModal] = useState<{ id: number; username: string; balance: number } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNote, setBalanceNote] = useState("");
  const [balanceSaving, setBalanceSaving] = useState(false);

  async function loadClients() {
    setLoading(true);
    const r = await fetch("/api/admin/clients", { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    setClients(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadClients(); }, [token]);

  async function handleCreate() {
    if (!form.username || !form.email || !form.password) { setFormError("Username, email and password are required"); return; }
    setSaving(true); setFormError("");
    const r = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    setSaving(false);
    if (!r.ok) { setFormError(data.error ?? "Failed"); return; }
    setShowForm(false);
    setForm(EMPTY_FORM);
    loadClients();
  }

  async function handleDelete(id: number, username: string) {
    if (!confirm(`Delete client "${username}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/clients/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadClients();
  }

  async function handleBalanceAdjust() {
    if (!balanceModal) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount === 0) { alert("Enter a valid amount (positive to add, negative to deduct)"); return; }
    setBalanceSaving(true);
    await fetch(`/api/admin/clients/${balanceModal.id}/balance`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, description: balanceNote || undefined }),
    });
    setBalanceSaving(false);
    setBalanceModal(null);
    setBalanceAmount(""); setBalanceNote("");
    loadClients();
  }

  const filtered = clients.filter(c =>
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    (c.companyName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const PERM_LABELS: Record<string, string> = {
    sendSms: "Send SMS", sendBulkSms: "Bulk SMS", uploadContacts: "Upload Contacts",
    viewDeliveryReports: "Delivery Reports", accessApiCredentials: "API Credentials",
    useSenderId: "Sender ID", exportReports: "Export Reports",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Client Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{clients.length} registered client accounts</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setFormError(""); setShowConn(false); }}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          New Client
        </button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by username, company, email..."
          className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
      </div>

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Username</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Company</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Balance (₱)</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Rate/SMS (₱)</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Joined</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? "No clients match your search" : "No clients yet. Create one to get started."}
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{c.username}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.companyName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border ${c.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-primary">₱{c.balance.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">₱{c.smsRate.toFixed(4)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/admin/clients/${c.id}`}>
                          <span className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground cursor-pointer inline-block transition-colors" title="View details">
                            <Eye className="w-3.5 h-3.5" />
                          </span>
                        </Link>
                        <button onClick={() => { setBalanceModal({ id: c.id, username: c.username, balance: c.balance }); setBalanceAmount(""); setBalanceNote(""); }}
                          className="p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors" title="Adjust balance">
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id, c.username)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create client modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-card-border rounded-lg w-full max-w-lg shadow-xl my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Create Client Account</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && <div className="px-3 py-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs">{formError}</div>}

              {/* Account info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Account Information</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Username *", key: "username", type: "text" },
                    { label: "Email *", key: "email", type: "email" },
                    { label: "Password *", key: "password", type: "password" },
                    { label: "Phone", key: "phone", type: "text" },
                    { label: "Company Name", key: "companyName", type: "text" },
                  ].map(({ label, key, type }) => (
                    <div key={key} className={key === "companyName" ? "col-span-2" : ""}>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                      <input type={type} value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">SMS Rate (₱/msg)</label>
                    <input type="number" step="0.01" value={form.smsRate}
                      onChange={e => setForm(f => ({ ...f, smsRate: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Initial Balance (₱)</label>
                    <input type="number" step="1" value={form.balance}
                      onChange={e => setForm(f => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
                  </div>
                </div>
              </div>

              {/* SMPP Connection config */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowConn(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  {showConn ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  Connection Settings (SMPP / HTTP)
                </button>
                {showConn && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {[
                      { label: "SMPP Host / IP", key: "smppHost", type: "text", placeholder: "192.168.1.100" },
                      { label: "SMPP Port", key: "smppPort", type: "text", placeholder: "2775" },
                      { label: "SMPP System ID", key: "smppSystemId", type: "text", placeholder: "client_id" },
                      { label: "SMPP Password", key: "smppPassword", type: "password", placeholder: "••••••••" },
                      { label: "HTTP API Key", key: "httpApiKey", type: "text", placeholder: "sk_live_..." },
                    ].map(({ label, key, type, placeholder }) => (
                      <div key={key} className={key === "httpApiKey" ? "col-span-2" : ""}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                        <input type={type} value={(form as any)[key]} placeholder={placeholder}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Permissions</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(PERM_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={(form.permissions as any)[key] ?? false}
                        onChange={e => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: e.target.checked } }))}
                        className="w-3.5 h-3.5 accent-primary" />
                      <span className="text-xs text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button onClick={() => setShowForm(false)} className="flex-1 px-3 py-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? "Creating..." : "Create Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance modal */}
      {balanceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-lg w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Adjust Balance</h2>
              <button onClick={() => setBalanceModal(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">Client: <span className="text-foreground font-medium">{balanceModal.username}</span></p>
              <p className="text-xs text-muted-foreground">Current balance: <span className="text-primary font-mono">₱{balanceModal.balance.toFixed(2)}</span></p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (₱) — positive to add, negative to deduct</label>
                <input type="number" step="0.01" value={balanceAmount}
                  onChange={e => setBalanceAmount(e.target.value)}
                  placeholder="e.g. 500 or -100"
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Note / Reference</label>
                <input type="text" value={balanceNote}
                  onChange={e => setBalanceNote(e.target.value)}
                  placeholder="Payment reference, reason..."
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button onClick={() => setBalanceModal(null)} className="flex-1 px-3 py-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={handleBalanceAdjust} disabled={balanceSaving}
                className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                {balanceSaving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
