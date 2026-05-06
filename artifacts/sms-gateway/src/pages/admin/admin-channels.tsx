import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, Edit2, X, Server, Wifi } from "lucide-react";

interface ChannelForm {
  name: string;
  protocol: "SMPP" | "HTTP";
  host: string;
  port: number;
  username: string;
  password: string;
  maxBindings: number;
  channelType: "transmitter" | "receiver" | "transceiver";
  status: "active" | "inactive" | "error";
}

const EMPTY_FORM: ChannelForm = {
  name: "",
  protocol: "SMPP",
  host: "",
  port: 2775,
  username: "",
  password: "",
  maxBindings: 5,
  channelType: "transmitter",
  status: "active",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  inactive: "bg-muted/50 text-muted-foreground border-border",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AdminChannels() {
  const { token } = useAuth();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ChannelForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/channels", { headers });
    const data = await r.json();
    setChannels(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(ch: any) {
    setEditId(ch.id);
    setForm({
      name: ch.name,
      protocol: ch.protocol,
      host: ch.host,
      port: ch.port,
      username: ch.username,
      password: "",
      maxBindings: ch.maxBindings,
      channelType: ch.channelType,
      status: ch.status,
    });
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.host || !form.username) { setError("Name, host and username are required"); return; }
    if (!editId && !form.password) { setError("Password is required"); return; }
    setSaving(true); setError("");

    const body = { ...form };
    if (editId && !form.password) delete (body as any).password;

    const url = editId ? `/api/admin/channels/${editId}` : "/api/admin/channels";
    const method = editId ? "PUT" : "POST";

    const r = await fetch(url, { method, headers, body: JSON.stringify(body) });
    const data = await r.json();
    setSaving(false);

    if (!r.ok) { setError(data.error ?? "Failed to save"); return; }
    setShowForm(false);
    load();
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete channel "${name}"?`)) return;
    await fetch(`/api/admin/channels/${id}`, { method: "DELETE", headers });
    load();
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Channel Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure SMPP and HTTP telco connections</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Add Channel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
            </div>
          ))
        ) : channels.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-muted-foreground">
            No channels configured. <button onClick={openCreate} className="text-primary hover:underline">Add one</button>
          </div>
        ) : (
          channels.map((ch) => (
            <div key={ch.id} className="bg-card border border-card-border rounded-lg p-4 hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {ch.protocol === "SMPP" ? <Server className="w-4 h-4 text-primary" /> : <Wifi className="w-4 h-4 text-blue-400" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{ch.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ch.protocol === "SMPP" ? "bg-primary/10 text-primary border-primary/20" : "bg-blue-400/10 text-blue-400 border-blue-400/20"}`}>
                        {ch.protocol}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_STYLES[ch.status]}`}>
                        {ch.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(ch)} className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(ch.id, ch.name)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Host</span>
                  <span className="font-mono text-foreground">{ch.host}:{ch.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-mono text-foreground">{ch.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground capitalize">{ch.channelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Bindings</span>
                  <span className="font-mono text-foreground">{ch.maxBindings}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-lg w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">{editId ? "Edit Channel" : "Add Channel"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {error && <div className="px-3 py-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs">{error}</div>}

              {[
                { label: "Channel Name", key: "name", type: "text", placeholder: "OTP-SMPP-01" },
                { label: "Remote IP / Host", key: "host", type: "text", placeholder: "smpp.telco.com" },
                { label: "Remote Port", key: "port", type: "number", placeholder: "2775" },
                { label: "Username / System ID", key: "username", type: "text", placeholder: "operator_user" },
                { label: `Password${editId ? " (leave blank to keep)" : ""}`, key: "password", type: "password", placeholder: "••••••••" },
                { label: "Max Bindings", key: "maxBindings", type: "number", placeholder: "5" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Protocol</label>
                  <select value={form.protocol} onChange={(e) => setForm(f => ({ ...f, protocol: e.target.value as any }))}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                    <option value="SMPP">SMPP</option>
                    <option value="HTTP">HTTP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Channel Type</label>
                  <select value={form.channelType} onChange={(e) => setForm(f => ({ ...f, channelType: e.target.value as any }))}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                    <option value="transmitter">Transmitter</option>
                    <option value="receiver">Receiver</option>
                    <option value="transceiver">Transceiver</option>
                  </select>
                </div>
              </div>

              {editId && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-border">
              <button onClick={() => setShowForm(false)} className="flex-1 px-3 py-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
