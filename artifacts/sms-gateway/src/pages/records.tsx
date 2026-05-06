import { useState } from "react";
import { useListRecords, useGetRecordStats, useListProducts } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

const RESULT_STYLES: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  delivered: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  report_failed: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  report_success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  report_pending: "bg-muted/50 text-muted-foreground border-border",
};

const RESULT_LABELS: Record<string, string> = {
  submitted: "Submitted",
  delivered: "Delivered",
  failed: "Failed",
  report_failed: "Report Failed",
  report_success: "Report Success",
  report_pending: "Report Pending",
};

function exportToCsv(records: any[]) {
  const headers = ["ID", "Recipient", "Sender ID", "SMS Content", "Send Result", "Fail Reason", "Cost (₱)", "Delivery Time", "Latency (ms)", "Created At"];
  const rows = records.map(r => [
    r.id,
    r.recipient,
    r.senderId ?? "",
    `"${(r.messageContent ?? "").replace(/"/g, '""')}"`,
    r.sendResult,
    r.failReason ?? "",
    r.cost.toFixed(6),
    r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : "",
    r.deliveryLatency ?? "",
    new Date(r.createdAt).toLocaleString(),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sms-records-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RecordsPage() {
  const [page, setPage] = useState(1);
  const [sendResult, setSendResult] = useState<string>("");
  const [productId, setProductId] = useState<number | undefined>();
  const pageSize = 20;

  const params = {
    page,
    pageSize,
    sendResult: (sendResult || undefined) as any,
    productId,
  };

  const { data, isLoading } = useListRecords(params);
  const { data: stats } = useGetRecordStats();
  const { data: products } = useListProducts();

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Send Records</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Detailed delivery records for all messages</p>
        </div>
        <button
          onClick={() => data?.data && exportToCsv(data.data)}
          disabled={!data?.data?.length}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Sent", value: stats.totalSent.toLocaleString(), color: "text-foreground" },
            { label: "Delivered", value: stats.totalDelivered.toLocaleString(), color: "text-green-400" },
            { label: "Failed", value: stats.totalFailed.toLocaleString(), color: "text-destructive" },
            { label: "Delivery Rate", value: `${stats.deliveryRate}%`, color: "text-primary" },
            { label: "Total Cost", value: `₱${stats.totalCost.toFixed(4)}`, color: "text-amber-400" },
            { label: "Avg Latency", value: `${stats.avgLatencyMs}ms`, color: "text-blue-400" },
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
          <option value="">Send Result</option>
          <option value="submitted">Submitted</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="report_failed">Report Failed</option>
          <option value="report_success">Report Success</option>
          <option value="report_pending">Report Pending</option>
        </select>
        <select
          value={productId ?? ""}
          onChange={(e) => { setProductId(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="bg-card border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="">All Workspaces</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">ID</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Recipient</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Sender ID</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium min-w-[180px]">SMS Content</th>
                <th className="text-right px-3 py-3 text-muted-foreground font-medium">Cost (₱)</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Send Result</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Reason</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Delivery Time</th>
                <th className="text-center px-3 py-3 text-muted-foreground font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No records found</td>
                </tr>
              ) : (
                data?.data.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.id}</td>
                    <td className="px-3 py-2.5 font-mono text-foreground">{r.recipient}</td>
                    <td className="px-3 py-2.5 text-foreground">{r.senderId || "—"}</td>
                    <td className="px-3 py-2.5 text-foreground max-w-[220px]">
                      <span className="line-clamp-2 text-xs leading-relaxed">{r.messageContent || "—"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">₱{r.cost.toFixed(6)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border ${RESULT_STYLES[r.sendResult]}`}>
                        {RESULT_LABELS[r.sendResult] ?? r.sendResult}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{r.failReason ?? "success"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.deliveredAt
                        ? new Date(r.deliveredAt).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.deliveryLatency != null ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          r.deliveryLatency > 100 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-400"
                        }`}>
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
