import { useState } from "react";
import { useListBilling, useGetBillingSummary, useListProducts } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useLang } from "@/hooks/useLang";

function exportToCsv(records: any[]) {
  const headers = ["ID", "Workspace", "Type", "Task", "Amount (₱)", "Messages", "Description", "Created At"];
  const rows = records.map(r => [
    r.id, r.productName, r.type, r.taskName ?? "",
    r.amount.toFixed(2), r.messageCount,
    `"${(r.description ?? "").replace(/"/g, '""')}"`,
    new Date(r.createdAt).toLocaleString(),
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `billing-records-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function BillingPage() {
  const { t } = useLang();
  const [page, setPage] = useState(1);
  const [productId, setProductId] = useState<number | undefined>();
  const pageSize = 20;

  const params = { page, pageSize, productId };
  const { data, isLoading } = useListBilling(params);
  const { data: summary } = useGetBillingSummary();
  const { data: products } = useListProducts();
  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("financialRecords")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("financialSub")}</p>
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

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: t("totalExpense"),  value: `₱${summary.totalExpense.toFixed(2)}`,      color: "text-primary" },
            { label: t("totalMessages"), value: summary.totalMessages.toLocaleString(),       color: "text-foreground" },
            { label: t("totalSent"),     value: summary.totalSent.toLocaleString(),           color: "text-blue-400" },
            { label: t("delivered"),     value: summary.totalDelivered.toLocaleString(),      color: "text-green-400" },
            { label: t("failed"),        value: summary.totalFailed.toLocaleString(),         color: "text-destructive" },
            { label: t("deliveryRate"),  value: `${summary.deliveryRate}%`,                  color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-card-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-base font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
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
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t("id")}</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t("workspace")}</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t("type")}</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t("task")}</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t("amountPhp")}</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t("messages")}</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t("description")}</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t("created")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">{t("noBilling")}</td>
                </tr>
              ) : (
                data?.data.map((b) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{b.id}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{b.productName}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border capitalize ${b.type === "sms" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                        {b.type === "sms" ? t("sms") : t("recharge")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground max-w-[120px] truncate">{b.taskName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-primary">₱{b.amount.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-foreground">{b.messageCount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-foreground max-w-[200px] truncate">{b.description}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {new Date(b.createdAt).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
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
