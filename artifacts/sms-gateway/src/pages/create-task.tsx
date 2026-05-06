import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateTask, useListProducts, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Smartphone, Upload, FileText, AlertCircle } from "lucide-react";

const MAX_SMS_CHARS = 160;

export default function CreateTaskPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: products } = useListProducts();
  const createMut = useCreateTask();

  const [taskName, setTaskName] = useState(() => new Date().toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/[,]/g, ""));
  const [productId, setProductId] = useState<number>(0);
  const [senderId, setSenderId] = useState("Sender ID");
  const [recipientMode, setRecipientMode] = useState<"manual" | "upload">("manual");
  const [recipientText, setRecipientText] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (products && products.length > 0 && productId === 0) {
      setProductId(products[0].id);
    }
  }, [products]);

  const recipients = recipientText
    .split(/[\n,]/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  const charCount = messageContent.length;
  const smsCount = Math.ceil(charCount / MAX_SMS_CHARS) || 1;
  const selectedProduct = products?.find((p) => p.id === productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) { setError("Select a workspace"); return; }
    if (recipients.length === 0) { setError("Add at least one recipient"); return; }
    if (!messageContent.trim()) { setError("Enter a message"); return; }
    setError("");
    try {
      await createMut.mutateAsync({
        data: {
          name: taskName,
          productId,
          messageContent,
          senderId,
          recipients,
        },
      });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      navigate("/tasks");
    } catch (err: any) {
      setError(err?.data?.error || err?.message || "Failed to create task");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-lg font-bold text-foreground">Create Task</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Sending an SMS is really very simple.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="bg-card border border-card-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Task Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Task Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Workspace <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(Number(e.target.value))}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    required
                  >
                    <option value={0}>Select workspace</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (spid: {p.spid})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Sender ID</label>
                  <input
                    type="text"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Send className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">SMS Recipients</h2>
              </div>
              <div className="flex gap-2 mb-3">
                {[
                  { mode: "manual", label: "Manual Input", icon: FileText },
                  { mode: "upload", label: "Upload Numbers", icon: Upload },
                ].map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRecipientMode(mode as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                      recipientMode === mode
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                value={recipientText}
                onChange={(e) => setRecipientText(e.target.value)}
                placeholder={`Multiple numbers, comma separated (include country code):\n63822468100075,6287765432101`}
                rows={5}
                className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono resize-y"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {recipients.length} recipient{recipients.length !== 1 ? "s" : ""} entered
              </p>
              <p className="text-xs text-amber-400/70 mt-1">
                Numbers must include country code, otherwise messages cannot be delivered.
              </p>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">SMS Content</h2>
              <div className="mb-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  SMS Message <span className="text-destructive">*</span>
                </label>
              </div>
              <div className="relative">
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Enter your SMS message..."
                  rows={5}
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-y"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-xs ${charCount > MAX_SMS_CHARS ? "text-amber-400" : "text-muted-foreground"}`}>
                    {charCount}/{MAX_SMS_CHARS} chars — {smsCount} SMS
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
            >
              <Send className="w-4 h-4" />
              {createMut.isPending ? "Sending..." : "Send SMS"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-foreground">Configuration Summary</h3>
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">SMS</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Message Type</span>
                  <span className="text-foreground">Fixed Content</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipients</span>
                  <span className="text-foreground font-mono">{recipients.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Send Time</span>
                  <span className="text-foreground">Immediate</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workspace</span>
                  <span className="text-foreground">{selectedProduct?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Cost</span>
                  <span className="text-primary font-mono">₱{(recipients.length * 0.25 * smsCount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-52 bg-[#1a1a2e] rounded-3xl border-4 border-[#252545] shadow-xl overflow-hidden">
                <div className="bg-[#252545] py-2 text-center">
                  <div className="text-xs text-gray-400">
                    {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex flex-col items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#252545] flex items-center justify-center mb-1">
                      <Smartphone className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400">{senderId || "Sender ID"}</p>
                    <p className="text-[10px] text-gray-600">
                      {new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-primary rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                      <p className="text-xs text-primary-foreground break-words whitespace-pre-wrap">
                        {messageContent || "Your message preview will appear here..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Message Preview</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
