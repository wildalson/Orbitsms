import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Save, DollarSign, X } from "lucide-react";

const PERM_LABELS: Record<string, string> = {
  sendSms: "Send SMS",
  sendBulkSms: "Bulk SMS",
  uploadContacts: "Upload Contacts",
  viewDeliveryReports: "Delivery Reports",
  accessApiCredentials: "API Credentials",
  useSenderId: "Sender ID",
  exportReports: "Export Reports",
};

const RESULT_STYLES: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-400",
  delivered: "bg-green-500/10 text-green-400",
  failed: "bg-destructive/10 text-destructive",
  report_success: "bg-emerald-500/10 text-emerald-400",
  report_failed: "bg-orange-500/10 text-orange-400",
  report_pending: "bg-muted/50 text-muted-foreground",
};

export default function AdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [balanceModal, setBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNote, setBalanceNote] = useState("");
  const [balanceSaving, setBalanceSaving] = useState(false);

  async function load() {
    const r = await fetch(`/api/admin/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    setClient(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id, token]);

  async function handleSave() {
    setSaving(true); setSaveMsg("");
    const r = await fetch(`/api/admin/clients/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        username: client.username,
        email: client.email,
        phone: client.phone,
        companyName: client.companyName,
        smsRate: client.smsRate,
        status: client.status,
        permissions: client.permissions,
      }),
    });
    const data = await r.json();
    setSaving(false);
    if (r.ok) { setClient(data); setSaveMsg("Saved!"); setTimeout(() => setSaveMsg(""), 2000); }
  }

  async function handleBalanceAdjust() {
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount === 0) { alert("Enter a valid amount"); return; }
    setBalanceSaving(true);
    await fetch(`/api/admin/clients/${id}/balance`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, description: balanceNote || undefined }),
    });
    setBalanceSaving(false);
    setBalanceModal(false);
    setBalanceAmount(""); setBalanceNote("");
    load();
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!client || client.error) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Client not found. <Link href="/admin/clients"><span className="text-primary cursor-pointer">Back to list</span></Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients">
          <span className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground cursor-pointer inline-block">
            <ArrowLeft className="w-4 h-4" />
          </span>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{client.username}</h1>
          <p className="text-xs text-muted-foreground">{client.companyName ?? "No company"} · {client.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setBalanceModal(true); setBalanceAmount(""); setBalanceNote(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/10 transition-colors">
            <DollarSign className="w-3.5 h-3.5" />
            Adjust Balance
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : saveMsg || "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Account info */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Account Details</h2>
          <div className="space-y-3">
            {[
              { label: "Username", key: "username" },
              { label: "Email", key: "email" },
              { label: "Phone", key: "phone" },
              { label: "Company Name", key: "companyName" },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                <input type="text" value={client[key] ?? ""}
                  onChange={e => setClient((c: any) => ({ ...c, [key]: e.target.value }))}
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">SMS Rate (₱/msg)</label>
                <input type="number" step="0.01" value={client.smsRate}
                  onChange={e => setClient((c: any) => ({ ...c, smsRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                <select value={client.status}
                  onChange={e => setClient((c: any) => ({ ...c, status: e.target.value }))}
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Balance + permissions */}
        <div className="space-y-4">
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Balance</h2>
            <p className="text-3xl font-bold font-mono text-primary">₱{client.balance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">SMS rate: ₱{client.smsRate.toFixed(4)} per message</p>
          </div>

          <div className="bg-card border border-card-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Permissions</h2>
            <div className="space-y-2">
              {Object.entries(PERM_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-foreground">{label}</span>
                  <input type="checkbox"
                    checked={client.permissions?.[key] ?? false}
                    onChange={e => setClient((c: any) => ({ ...c, permissions: { ...c.permissions, [key]: e.target.checked } }))}
                    className="w-3.5 h-3.5 accent-primary" />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent SMS records */}
      {client.records && client.records.length > 0 && (
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Recent SMS Records</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Recipient</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Sender ID</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Content</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Cost (₱)</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {client.records.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 font-mono">{r.recipient}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.senderId || "—"}</td>
                    <td className="px-4 py-2 max-w-[180px]"><span className="line-clamp-1">{r.messageContent || "—"}</span></td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded ${RESULT_STYLES[r.sendResult] ?? ""}`}>{r.sendResult}</span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">₱{r.cost.toFixed(6)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Billing history */}
      {client.billing && client.billing.length > 0 && (
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Balance History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Type</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Amount (₱)</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Description</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {client.billing.map((b: any) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded capitalize ${b.type === "recharge" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>
                        {b.type === "recharge" ? "Top-up" : "Charge"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">₱{b.amount.toFixed(2)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{b.description}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Balance modal */}
      {balanceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-lg w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Adjust Balance</h2>
              <button onClick={() => setBalanceModal(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">Current: <span className="text-primary font-mono">₱{client.balance.toFixed(2)}</span></p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (₱) — positive to add, negative to deduct</label>
                <input type="number" step="0.01" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)}
                  placeholder="e.g. 500 or -100"
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Note / Reference</label>
                <input type="text" value={balanceNote} onChange={e => setBalanceNote(e.target.value)}
                  placeholder="Payment reference..."
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button onClick={() => setBalanceModal(false)} className="flex-1 px-3 py-2 rounded border border-border text-xs text-muted-foreground">Cancel</button>
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
