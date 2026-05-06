import { useParams, Link } from "wouter";
import { useGetTask, useListRecords, getListRecordsQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, CheckCircle, XCircle, Send, TrendingUp } from "lucide-react";

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

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const { data: task, isLoading } = useGetTask(id);
  const { data: records } = useListRecords({ taskId: id, pageSize: 50 });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="h-32 bg-card rounded-lg" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <p className="text-muted-foreground">Task not found.</p>
        <Link href="/tasks"><span className="text-primary text-sm mt-2 cursor-pointer inline-block">Back to tasks</span></Link>
      </div>
    );
  }

  const stats = [
    { label: "Total Recipients", value: task.totalRecipients.toLocaleString(), icon: Send, color: "text-foreground" },
    { label: "Sent Count", value: task.sentCount.toLocaleString(), icon: Send, color: "text-blue-400" },
    { label: "Delivered", value: task.deliveredCount.toLocaleString(), icon: CheckCircle, color: "text-green-400" },
    { label: "Failed", value: task.failedCount.toLocaleString(), icon: XCircle, color: "text-destructive" },
    { label: "Success Rate", value: `${task.successRate}%`, icon: TrendingUp, color: "text-amber-400" },
    { label: "Delivery Rate", value: `${task.deliveryRate}%`, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/tasks">
          <span className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-block">
            <ArrowLeft className="w-4 h-4" />
          </span>
        </Link>
        <div>
          <h1 className="text-base font-bold text-foreground">{task.name}</h1>
          <p className="text-xs text-muted-foreground">Task #{task.id} · {task.productName} · {new Date(task.createdAt).toLocaleString()}</p>
        </div>
        <span className={`ml-auto px-2 py-0.5 rounded border text-xs capitalize ${
          task.status === "completed" ? "bg-green-500/10 text-green-400 border-green-500/20" :
          task.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/20" :
          "bg-amber-500/10 text-amber-400 border-amber-500/20"
        }`}>
          {task.status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-card-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Message content */}
      <div className="bg-card border border-card-border rounded-lg p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Message Content</p>
        <p className="text-sm text-foreground font-mono bg-background rounded px-3 py-2 border border-border">
          {task.messageContent}
        </p>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>Sender: <span className="text-foreground">{task.senderId}</span></span>
          <span>Cost: <span className="text-primary font-mono">${task.cost.toFixed(6)}</span></span>
        </div>
      </div>

      {/* Records table */}
      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground">Delivery Records ({records?.total ?? 0} total, showing {records?.data.length ?? 0})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Recipient</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Send Result</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Delivery Result</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Delivery Time</th>
                <th className="text-center px-4 py-2.5 text-muted-foreground font-medium">Latency</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {records?.data.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-foreground">{r.recipient}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded border text-xs ${RESULT_STYLES[r.sendResult]}`}>
                      {RESULT_LABELS[r.sendResult] ?? r.sendResult}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded border text-xs ${RESULT_STYLES[r.sendResult]}`}>
                      {RESULT_LABELS[r.sendResult] ?? r.sendResult}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.deliveredAt ? new Date(r.deliveredAt).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {r.deliveryLatency != null ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        r.deliveryLatency > 100 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-400"
                      }`}>
                        {r.deliveryLatency}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{r.cost.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
