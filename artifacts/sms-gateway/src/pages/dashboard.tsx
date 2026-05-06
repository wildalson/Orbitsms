import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";
import { useGetDashboardSummary, useGetDashboardTraffic, useListProducts } from "@workspace/api-client-react";
import { TrendingUp, Send, CheckCircle, XCircle, Activity, CreditCard, Package } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PRODUCT_COLORS = ["#00cccc", "#3b82f6", "#a855f7", "#f59e0b", "#10b981"];

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const { data: summary } = useGetDashboardSummary();
  const { data: traffic } = useGetDashboardTraffic();
  const { data: products } = useListProducts();

  const chartData = (() => {
    if (!traffic || !products) return [];
    const days = Array.from(new Set(traffic.map((t) => t.day))).sort((a, b) => a - b);
    return days.map((day) => {
      const row: Record<string, number | string> = { day: `${day}` };
      for (const p of products) {
        const found = traffic.find((t) => t.day === day && t.productId === p.id);
        row[p.name] = found?.count ?? 0;
      }
      return row;
    });
  })();

  const balance = summary?.balance ?? user?.balance ?? 0;

  const stats = [
    { label: t("balancePhp"),      value: `₱${balance.toFixed(2)}`,                         icon: CreditCard, color: "text-primary",      bg: "bg-primary/10" },
    { label: t("todaySent"),       value: summary?.todaySent ?? 0,                            icon: Send,       color: "text-blue-400",     bg: "bg-blue-400/10" },
    { label: t("monthSent"),       value: summary?.monthSent?.toLocaleString() ?? 0,          icon: TrendingUp, color: "text-purple-400",   bg: "bg-purple-400/10" },
    { label: t("todayDelivered"),  value: summary?.todayDelivered ?? 0,                       icon: CheckCircle,color: "text-green-400",    bg: "bg-green-400/10" },
    { label: t("todayFailed"),     value: summary?.todayFailed ?? 0,                          icon: XCircle,    color: "text-destructive",  bg: "bg-destructive/10" },
    { label: t("successRate"),     value: summary ? `${summary.successRate}%` : "—",          icon: Activity,   color: "text-amber-400",    bg: "bg-amber-400/10" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome banner */}
      <div className="bg-card border border-card-border rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-primary font-bold text-lg">{user?.username?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {t("welcomeBack")}, {user?.companyName || user?.username}
            </h2>
            <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
              <span>{t("balance")}: <span className="text-primary font-mono font-semibold">₱{balance.toFixed(2)}</span></span>
              {user?.phone && <span className="font-mono">{user.phone}</span>}
              {user?.email && <span>{user.email}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic chart */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("smsTrafficMonth")}</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {products?.map((p, i) => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.name}
                    stroke={PRODUCT_COLORS[i % PRODUCT_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              {t("noTrafficData")}
            </div>
          )}
        </div>

        {/* Workspace balances */}
        <div className="bg-card border border-card-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{t("workspaceList")}</h3>
          </div>
          {products && products.length > 0 ? (
            <div className="space-y-3">
              {products.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                    style={{ background: `${PRODUCT_COLORS[i % PRODUCT_COLORS.length]}20`, color: PRODUCT_COLORS[i % PRODUCT_COLORS.length] }}
                  >
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">spid: {p.spid}</p>
                  </div>
                  <p className="text-xs font-mono font-semibold text-foreground">₱{Number(p.balance).toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noWorkspace")}</p>
          )}

          {summary && summary.productBalances.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">{t("balanceSummary")}</p>
              {summary.productBalances.map((pb) => (
                <div key={pb.productId} className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted-foreground">{pb.productName}</span>
                  <span className="text-xs font-mono text-foreground">₱{pb.balance.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
