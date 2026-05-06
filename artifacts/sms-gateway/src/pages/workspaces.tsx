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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Workspace name is required"); return; }
    setSaving(true); setError("");
    try {
      const autoSpid = `WS${Date.now()}`;
      await createMut.mutateAsync({ data: { name: name.trim(), spid: autoSpid, type: "WS" } });
      qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
      setShowForm(false);
      setName("");
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
          <p className="text-xs text-muted-foreground mt-0.5">Manage your SMS sending workspaces</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setName(""); setError(""); }}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Workspace
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p, i) => (
            <div key={p.id} className="bg-card border border-card-border rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20`, border: `1px solid ${COLORS[i % COLORS.length]}40` }}>
                    <Layers className="w-4 h-4" style={{ color: COLORS[i % COLORS.length] }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete workspace"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-mono text-primary font-semibold">₱{p.balance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="text-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-lg p-12 flex flex-col items-center gap-3 text-center">
          <Layers className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No workspaces yet</p>
          <p className="text-xs text-muted-foreground/60">Create a workspace to start sending SMS campaigns.</p>
          <button
            onClick={() => { setShowForm(true); setName(""); setError(""); }}
            className="mt-2 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Workspace
          </button>
        </div>
      )}

      {/* Create workspace modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-lg w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">New Workspace</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-5 space-y-4">
                {error && <div className="px-3 py-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs">{error}</div>}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Workspace Name <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Marketing, OTP, Promotions"
                    autoFocus
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
              <div className="flex gap-2 px-5 py-4 border-t border-border">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-3 py-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
