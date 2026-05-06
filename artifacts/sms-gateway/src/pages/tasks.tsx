import { useState } from "react";
import { Link } from "wouter";
import { useListTasks, useDeleteTask, useListProducts } from "@workspace/api-client-react";
import { Plus, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListTasksQueryKey } from "@workspace/api-client-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sending: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function TasksPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [productFilter, setProductFilter] = useState<number | undefined>();
  const pageSize = 20;

  const qc = useQueryClient();
  const { data, isLoading } = useListTasks(
    { page, pageSize, status: (statusFilter as any) || undefined, productId: productFilter },
    { query: { queryKey: getListTasksQueryKey({ page, pageSize, status: statusFilter as any || undefined, productId: productFilter }) } }
  );
  const { data: products } = useListProducts();
  const deleteMut = useDeleteTask();

  async function handleDelete(id: number) {
    if (!confirm("Delete this task?")) return;
    await deleteMut.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">SMS Tasks</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage and track your SMS send tasks</p>
        </div>
        <Link href="/tasks/new">
          <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded hover:bg-primary/90 transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            Create Task
          </span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-card border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="sending">Sending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={productFilter ?? ""}
          onChange={(e) => { setProductFilter(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="bg-card border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="">All Workspaces</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">ID</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Task Name</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Workspace</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Total</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Sent</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Delivered</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Failed</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Cost (₱)</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Created</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    No tasks found. <Link href="/tasks/new"><span className="text-primary cursor-pointer">Create one</span></Link>
                  </td>
                </tr>
              ) : (
                data?.data.map((task) => (
                  <tr key={task.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{task.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{task.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {task.productName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded border capitalize ${STATUS_STYLES[task.status]}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{task.totalRecipients.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-400">{task.sentCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-400">{task.deliveredCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-destructive">{task.failedCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">₱{task.cost.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {new Date(task.createdAt).toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/tasks/${task.id}`}>
                          <span className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-block">
                            <Eye className="w-3.5 h-3.5" />
                          </span>
                        </Link>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed text-muted-foreground"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
