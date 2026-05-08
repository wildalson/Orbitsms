import { useState } from "react";
import { useListRecords, useGetRecordStats, useListProducts } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useLang } from "@/hooks/useLang";

const RESULT_STYLES: Record<string, string> = {
  delivered:      "bg-green-500/10 text-green-400 border-green-500/20",
  failed:         "bg-red-500/10 text-red-300 border-red-500/20",
};

function exportToCsv(records: any[]) {
  const headers = ["ID", "Recipient", "Operator", "Sender ID", "SMS Content", "Send Result", "Fail Reason", "Cost (₱)", "Delivery Time", "Latency (ms)", "Created At"];
  const rows = records.map(r => [
    r.id, r.recipient, r.operator ?? "Unknown", r.senderId ?? "",
    `"${(r.messageContent ?? "").replace(/"/g, '""')}"`,
    r.sendResult, r.failReason ?? "", r.cost.toFixed(2),
    r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : "",
    r.deliveryLatency ?? "", new Date(r.createdAt).toLocaleString(),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `sms-records-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function RecordsPage() {
  const { t } = useLang();
  const [page, setPage] = useState(1);
  const [sendResult, setSendResult] = useState<string>("");
  const [productId, setProductId] = useState<number | undefined>();
  const pageSize = 20;

  const params = { page, pageSize, sendResult: (sendResult || undefined) as any, productId };
  const { data, isLoading } = useListRecords(params);
  const { data: stats } = useGetRecordStats();
  const { data: products } = useListProducts();
  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const RESULT_LABELS: Record<string, string> = {
    delivered:      t("delivered"),
    failed:         t("failed"),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("sendRecords")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("sendRecordsSub")}</p>
        </div>
        <button
          onClick={() => data?.data && exportToCsv(data.data)}
          disabled={!data?.data?.length}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          {t("exportCsv")}
        </button>
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
              <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={sendResult}
          onChange={(e) => { setSendResult(e.target.value); setPage(1); }}
          className="bg-card border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="">{t("sendResult")}</option>
          <option value="delivered">{t("delivered")}</option>
          <option value="failed">{t("failed")}</option>
        </select>
        <select
          value={productId ?? ""}
          onChange={(e) => { setProductId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="bg-card border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="">{t("allWorkspaces")}</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">{t("id")}</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">{t("recipient")}</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">{t("operator")}</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">{t("senderId")}</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium min-w-[180px]">{t("smsContent")}</th>
                <th className="text-right px-3 py-3 text-muted-foreground font-medium">{t("costPhp")}</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">{t("sendResult")}</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">{t("reason")}</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">{t("deliveryTime")}</th>
                <th className="text-center px-3 py-3 text-muted-foreground font-medium">{t("latency")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">{t("noRecords")}</td>
                </tr>
              ) : (
                data?.data.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.id}</td>
                    <td className="px-3 py-2.5 font-mono text-foreground">{r.recipient}</td>
                    <td className="px-3 py-2.5 text-foreground">{r.operator || "Unknown"}</td>
                    <td className="px-3 py-2.5 text-foreground">{r.senderId || "—"}</td>
                    <td className="px-3 py-2.5 text-foreground max-w-[220px]">
                      <span className="line-clamp-2 text-xs leading-relaxed">{r.messageContent || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-foreground">₱{r.cost.toFixed(2)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border ${RESULT_STYLES[r.sendResult]}`}>
                        {RESULT_LABELS[r.sendResult] ?? r.sendResult}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{r.failReason ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.deliveredAt
                        ? new Date(r.deliveredAt).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.deliveryLatency != null ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${r.deliveryLatency > 100 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-400"}`}>
                          {r.deliveryLatency}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-muted/60 disabled:opacity-40 text-muted-foreground">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-muted/60 disabled:opacity-40 text-muted-foreground">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
