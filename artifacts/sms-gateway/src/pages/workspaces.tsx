import { useState } from "react";
import { useListProducts, useCreateProduct, useDeleteProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Layers, X } from "lucide-react";

const COLORS = ["#00cccc", "#3b82f6", "#a855f7", "#f59e0b", "#10b981", "#ef4444"];

export default function WorkspacesPage() {
  const qc = useQueryClient();
  const { data: products, isLoading } = useListProducts();
  const createMut = useCreateProduct();
  const deleteMut = useDeleteProduct();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [spid, setSpid] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Workspace name is required"); return; }
    if (!spid.trim()) { setError("SPID is required"); return; }
    setSaving(true); setError("");
    try {
      await createMut.mutateAsync({ data: { name: name.trim(), spid: spid.trim() } });
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setShowForm(false);
      setName(""); setSpid("");
    } catch (err: any) {
      setError(err?.data?.error || err?.message || "Failed to create workspace");
    }
    setSaving(false);
  }

  async function handleDelete(id: number, wname: string) {
    if (!confirm(`Delete workspace "${wname}"? This cannot be undone.`)) return;
    await deleteMut.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Workspaces</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create and manage your SMS workspaces</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setName(""); setSpid(""); setError(""); }}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Workspace
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-lg p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-3" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div className="py-20 text-center">
          <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">No workspaces yet.</p>
          <button onClick={() => setShowForm(true)} className="text-primary text-sm mt-1 hover:underline">
            Create your first workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products?.map((p, i) => (
            <div key={p.id} className="bg-card border border-card-border rounded-lg p-5 hover:border-primary/20 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ background: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length] }}
                >
                  {p.name[0]?.toUpperCase()}
                </div>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">SPID: {p.spid}</p>
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <span className="text-xs font-mono font-semibold text-primary">₱{Number(p.balance).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-lg w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">New Workspace</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-5 space-y-3">
                {error && (
                  <div className="px-3 py-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs">{error}</div>
                )}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Workspace Name <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Marketing, OTP, Notifications"
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">SPID <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={spid}
                    onChange={e => setSpid(e.target.value)}
                    placeholder="e.g. SP001"
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                  <p className="text-xs text-muted-foreground/60 mt-1">Service Provider ID used for routing</p>
                </div>
              </div>
              <div className="flex gap-2 px-5 py-4 border-t border-border">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-3 py-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
