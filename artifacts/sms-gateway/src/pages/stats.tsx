import { useGetRecordStats, useGetDashboardTraffic, useListProducts } from "@workspace/api-client-react";
import { useLang } from "@/hooks/useLang";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#00cccc", "#3b82f6", "#a855f7", "#f59e0b", "#10b981", "#ef4444"];

export default function StatsPage() {
  const { t } = useLang();
  const { data: stats } = useGetRecordStats();
  const { data: traffic } = useGetDashboardTraffic();
  const { data: products } = useListProducts();

  const trafficByProduct = (() => {
    if (!traffic || !products) return [];
    const totals: Record<number, number> = {};
    for (const tr of traffic) { totals[tr.productId] = (totals[tr.productId] ?? 0) + tr.count; }
    return products.map((p, i) => ({ name: p.name, value: totals[p.id] ?? 0, color: COLORS[i % COLORS.length] })).filter((p) => p.value > 0);
  })();

  const dailyData = (() => {
    if (!traffic) return [];
    const dayMap: Record<number, number> = {};
    for (const tr of traffic) { dayMap[tr.day] = (dayMap[tr.day] ?? 0) + tr.count; }
    return Object.entries(dayMap).sort((a, b) => Number(a[0]) - Number(b[0])).map(([day, count]) => ({ day, count }));
  })();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">{t("statistics")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t("statisticsSub")}</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: t("totalSent"),    value: stats.totalSent.toLocaleString(),    color: "text-foreground" },
            { label: t("delivered"),    value: stats.totalDelivered.toLocaleString(), color: "text-green-400" },
            { label: t("failed"),       value: stats.totalFailed.toLocaleString(),  color: "text-destructive" },
            { label: t("deliveryRate"), value: `${stats.deliveryRate}%`,            color: "text-primary" },
            { label: t("totalCost"),    value: `₱${stats.totalCost.toFixed(4)}`,    color: "text-amber-400" },
            { label: t("avgLatency"),   value: `${stats.avgLatencyMs}ms`,           color: "text-blue-400" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-card-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("dailyVolume")}</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "4px", fontSize: "11px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Messages" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">{t("noTrafficChart")}</div>
          )}
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("trafficByProduct")}</h3>
          {trafficByProduct.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={trafficByProduct} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {trafficByProduct.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "4px", fontSize: "11px", color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">{t("noData")}</div>
          )}
        </div>
      </div>

      {stats && (
        <div className="bg-card border border-card-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("deliveryFunnel")}</h3>
          <div className="flex items-end gap-3 h-32">
            {[
              { label: t("sent"),      count: stats.totalSent,      color: "bg-primary" },
              { label: t("delivered"), count: stats.totalDelivered, color: "bg-green-500" },
              { label: t("failed"),    count: stats.totalFailed,    color: "bg-destructive" },
            ].map((item) => {
              const pct = stats.totalSent > 0 ? (item.count / stats.totalSent) * 100 : 0;
              return (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-mono text-foreground">{item.count.toLocaleString()}</span>
                  <div className="w-full relative h-24 flex items-end">
                    <div className={`w-full rounded-t ${item.color}`} style={{ height: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
