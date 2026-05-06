import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Users, Send, CheckCircle, XCircle, DollarSign, TrendingUp, UserCheck, Activity } from "lucide-react";

interface AdminStats {
  totalClients: number;
  activeClients: number;
  totalBalance: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, c] = await Promise.all([
        fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch("/api/admin/clients", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setStats(s);
      setClients(Array.isArray(c) ? c.slice(0, 5) : []);
      setLoading(false);
    }
    load();
  }, [token]);

  const statCards = stats ? [
    { label: "Total Clients", value: stats.totalClients, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Active Clients", value: stats.activeClients, icon: UserCheck, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Total Balance (₱)", value: `₱${stats.totalBalance.toFixed(2)}`, icon: DollarSign, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Total Revenue (₱)", value: `₱${stats.totalRevenue.toFixed(2)}`, icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Total Sent", value: stats.totalSent.toLocaleString(), icon: Send, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Delivered", value: stats.totalDelivered.toLocaleString(), icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Failed", value: stats.totalFailed.toLocaleString(), icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Delivery Rate", value: `${stats.deliveryRate}%`, icon: Activity, color: "text-primary", bg: "bg-primary/10" },
  ] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">System-wide overview and management</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-lg p-3 animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border border-card-border rounded-lg p-3">
                <div className={`w-7 h-7 rounded ${s.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
                <p className="text-xs text-muted-foreground leading-none mb-1">{s.label}</p>
                <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent clients */}
      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recent Clients</h3>
          <Link href="/admin/clients">
            <span className="text-xs text-primary hover:text-primary/80 cursor-pointer transition-colors">View all →</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Username</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Company</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Balance (₱)</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Rate/SMS (₱)</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No clients yet. <Link href="/admin/clients"><span className="text-primary cursor-pointer">Create one</span></Link>
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/clients/${c.id}`}>
                        <span className="text-primary cursor-pointer hover:underline font-medium">{c.username}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.companyName ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border text-xs ${
                        c.status === "active"
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">₱{c.balance.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">₱{c.smsRate.toFixed(4)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
