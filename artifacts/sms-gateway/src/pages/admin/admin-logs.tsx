import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";

const RESULT_STYLES: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  delivered: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-300 border-red-500/20",
};

const RESULT_LABELS: Record<string, string> = {
  submitted: "Submitted",
  delivered: "Delivered",
  failed: "Failed",
};

function exportCsv(records: any[]) {
  const headers = ["ID", "Client", "Workspace", "Operator", "Recipient", "Sender ID", "SMS Content", "Result", "Fail Reason", "Cost (₱)", "Latency (ms)", "Created At"];
  const rows = records.map(r => [
    r.id, r.clientName, r.productName, r.operator, r.recipient, r.senderId,
    `"${(r.messageContent ?? "").replace(/"/g, '""')}"`,
    RESULT_LABELS[r.sendResult] ?? r.sendResult, r.failReason ?? "", r.cost.toFixed(2),
    r.deliveryLatency ?? "", new Date(r.createdAt).toLocaleString(),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sms-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminLogs() {
  const { token } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sendResult, setSendResult] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize) || 1;

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (sendResult) params.set("sendResult", sendResult);
    const r = await fetch(`/api/admin/records?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    setRecords(data.data ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, sendResult, token]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">SMS Logs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{total.toLocaleString()} total records across all clients</p>
        </div>
        <button onClick={() => exportCsv(records)} disabled={records.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40">
          <Download className="w-3.5 h-3.5" />
          Export Page CSV
        </button>
      </div>

      <div className="flex gap-2">
        <select value={sendResult} onChange={e => { setSendResult(e.target.value); setPage(1); }}
          className="bg-card border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50">
          <option value="">All Results</option>
          <option value="submitted">Submitted</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">ID</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Client</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Workspace</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Operator</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Recipient</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Sender ID</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium min-w-[160px]">Content</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Result</th>
                <th className="text-left px-3 py-3 text-muted-foreground font-medium">Reason</th>
                <th className="text-right px-3 py-3 text-muted-foreground font-medium">Cost (₱)</th>
                <th className="text-center px-3 py-3 text-muted-foreground font-medium">Latency</th>
                <th className="text-right px-3 py-3 text-muted-foreground font-medium">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">No logs found</td></tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.id}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground">{r.clientName || "—"}</div>
                      {r.clientCompany && <div className="text-[11px] text-muted-foreground">{r.clientCompany}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{r.productName}</span>
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{r.operator || "Unknown"}</td>
                    <td className="px-3 py-2.5 font-mono text-foreground">{r.recipient}</td>
                    <td className="px-3 py-2.5 text-foreground">{r.senderId || "Laaffic default"}</td>
                    <td className="px-3 py-2.5 max-w-[180px] text-foreground"><span className="line-clamp-2 leading-relaxed">{r.messageContent || "—"}</span></td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border ${RESULT_STYLES[r.sendResult] ?? ""}`}>{RESULT_LABELS[r.sendResult] ?? r.sendResult}</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.failReason ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-primary">₱{r.cost.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-center">
                      {r.deliveryLatency != null ? (
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${r.deliveryLatency > 100 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-400"}`}>
                          {r.deliveryLatency}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
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
