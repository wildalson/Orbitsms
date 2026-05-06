import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useCreateTask, useListProducts, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Smartphone, Upload, FileText, AlertCircle, X } from "lucide-react";
import { detectOperator } from "@/lib/ph-operators";
import { useLang } from "@/hooks/useLang";
import * as XLSX from "xlsx";

const MAX_SMS_CHARS = 160;

export default function CreateTaskPage() {
  const { t } = useLang();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: products } = useListProducts();
  const createMut = useCreateTask();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [taskName, setTaskName] = useState(() => new Date().toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/[,]/g, ""));
  const [productId, setProductId] = useState<number>(0);
  const [senderId, setSenderId] = useState("");
  const [recipientText, setRecipientText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
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

  const operatorBreakdown = recipients.reduce<Record<string, number>>((acc, num) => {
    const op = detectOperator(num);
    const label = op ? op.routeVia : "Unknown";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  const OPERATOR_COLORS: Record<string, string> = {
    Globe:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
    Smart:   "text-green-400 bg-green-500/10 border-green-500/20",
    DITO:    "text-purple-400 bg-purple-500/10 border-purple-500/20",
    Unknown: "text-muted-foreground bg-muted/30 border-border",
  };

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const numbers: string[] = [];
        for (const row of rows) {
          const cell = row[0];
          if (cell !== undefined && cell !== null && String(cell).trim() !== "") {
            numbers.push(String(cell).trim());
          }
        }
        if (numbers.length > 0) {
          setRecipientText(prev => {
            const existing = prev.trim();
            return existing ? `${existing}\n${numbers.join("\n")}` : numbers.join("\n");
          });
        }
      } catch {
        setError("Could not parse file. Please use a valid Excel (.xlsx/.xls) or CSV file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  function clearUpload() {
    setUploadedFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) { setError("Select a workspace"); return; }
    if (recipients.length === 0) { setError("Add at least one recipient"); return; }
    if (!messageContent.trim()) { setError("Enter a message"); return; }
    setError("");
    try {
      await createMut.mutateAsync({
        data: { name: taskName, productId, messageContent, senderId: senderId.trim() || undefined, recipients },
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
        <h1 className="text-lg font-bold text-foreground">{t("createTask")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t("createTaskSub")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-5">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="bg-card border border-card-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">{t("taskDetails")}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {t("taskName")} <span className="text-destructive">*</span>
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
                    {t("workspace")} <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(Number(e.target.value))}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    required
                  >
                    <option value={0}>{t("selectWorkspace")}</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t("senderIdOptional")}</label>
                  <input
                    type="text"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    placeholder={t("leaveBlank")}
                    maxLength={11}
                    className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  />
                  <p className="text-xs text-muted-foreground/60 mt-1">Max 11 characters. Displayed as sender name on recipient's phone.</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Send className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">{t("smsRecipients")}</h2>
                <span className="ml-auto text-xs text-muted-foreground">{t("philippinesOnly")}</span>
              </div>

              <textarea
                value={recipientText}
                onChange={(e) => setRecipientText(e.target.value)}
                placeholder={"Multiple numbers can be inputted by separating them with a comma:\n63999999999,6399999911,63917123456\n\nOr one per line:\n09171234567\n09281234567"}
                rows={6}
                className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono resize-y"
              />

              <div className="mt-3 flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="recipient-file-upload"
                />
                <label
                  htmlFor="recipient-file-upload"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t("uploadExcel")}
                </label>
                {uploadedFileName && (
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[180px]">{uploadedFileName}</span>
                    <button type="button" onClick={clearUpload} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground/50 ml-auto">{t("readsFirstCol")}</p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {recipients.length} {t("recipients").toLowerCase()}
                </p>
              </div>

              {recipients.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t("operatorDetect")}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(operatorBreakdown).map(([op, count]) => (
                      <span key={op} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${OPERATOR_COLORS[op] ?? OPERATOR_COLORS.Unknown}`}>
                        <span className="font-semibold">{op}</span>
                        <span className="opacity-70">×{count}</span>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground/50 mt-1.5">
                    Globe → 51502 · Smart → 51503 · DITO → 51566
                  </p>
                </div>
              )}
            </div>

            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">{t("smsContent")}</h2>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("smsMessage")} <span className="text-destructive">*</span>
              </label>
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

            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
            >
              <Send className="w-4 h-4" />
              {createMut.isPending ? t("sending2") : t("sendSms")}
            </button>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-card-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-foreground">{t("summary")}</h3>
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">PH Only</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("messageType")}</span>
                  <span className="text-foreground">{t("fixedContent")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("recipients")}</span>
                  <span className="text-foreground font-mono">{recipients.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("sendTime")}</span>
                  <span className="text-foreground">{t("immediate")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("workspace")}</span>
                  <span className="text-foreground">{selectedProduct?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("estCost")}</span>
                  <span className="text-primary font-mono">₱{(recipients.length * 0.25 * smsCount).toFixed(2)}</span>
                </div>
              </div>
              {recipients.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1.5">{t("routeBreakdown")}</p>
                  {Object.entries(operatorBreakdown).map(([op, count]) => (
                    <div key={op} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{op}</span>
                      <span className="font-mono text-foreground">{count} nums</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phone preview */}
            <div className="flex flex-col items-center">
              <div className="w-72 bg-[#1a1a2e] rounded-3xl border-4 border-[#252545] shadow-xl overflow-hidden">
                <div className="bg-[#252545] px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                  <div className="flex gap-1">
                    <div className="w-3 h-1.5 bg-gray-500 rounded-sm" />
                    <div className="w-3 h-1.5 bg-gray-500 rounded-sm" />
                    <div className="w-3 h-1.5 bg-gray-500 rounded-sm" />
                  </div>
                </div>
                <div className="bg-[#1e1e38] px-4 py-3 flex items-center gap-3 border-b border-[#252545]">
                  <div className="w-9 h-9 rounded-full bg-[#252545] flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{senderId || "OrbitSMS"}</p>
                    <p className="text-xs text-gray-500">SMS</p>
                  </div>
                </div>
                <div className="p-4 min-h-[140px]">
                  <div className="flex justify-end">
                    <div className="bg-primary rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                      <p className="text-sm text-primary-foreground break-words whitespace-pre-wrap leading-relaxed">
                        {messageContent || "Your message preview will appear here..."}
                      </p>
                      <p className="text-xs text-primary-foreground/60 mt-1.5 text-right">
                        {new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t("messagePreview")}</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
