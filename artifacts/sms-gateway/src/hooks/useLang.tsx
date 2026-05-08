import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "zh";

function getStoredLang(): Lang {
  try {
    const v = localStorage.getItem("orbit_lang");
    if (v === "zh" || v === "en") return v;
  } catch {}
  return "en";
}

type Translations = Record<string, Record<Lang, string>>;

const T: Translations = {
  // Nav
  dashboard:        { en: "Dashboard",           zh: "仪表板" },
  workspace:        { en: "Workspace",            zh: "工作区" },
  smsSend:          { en: "SMS Send",             zh: "短信发送" },
  smsRecords:       { en: "SMS Records",          zh: "发送记录" },
  statistics:       { en: "Statistics",           zh: "统计" },
  finance:          { en: "Finance",              zh: "财务" },
  adminPanel:       { en: "Admin Panel",          zh: "管理后台" },
  accountSettings:  { en: "Account Settings",     zh: "账户设置" },
  signOut:          { en: "Sign out",             zh: "退出登录" },
  clientView:       { en: "Client View",          zh: "客户视图" },

  // Common
  actions:          { en: "Actions",              zh: "操作" },
  cancel:           { en: "Cancel",               zh: "取消" },
  save:             { en: "Save",                 zh: "保存" },
  saving:           { en: "Saving...",            zh: "保存中..." },
  create:           { en: "Create",               zh: "创建" },
  delete:           { en: "Delete",               zh: "删除" },
  search:           { en: "Search",               zh: "搜索" },
  exportCsv:        { en: "Export CSV",           zh: "导出CSV" },
  id:               { en: "ID",                   zh: "编号" },
  status:           { en: "Status",               zh: "状态" },
  created:          { en: "Created",              zh: "创建时间" },
  name:             { en: "Name",                 zh: "名称" },
  type:             { en: "Type",                 zh: "类型" },
  balance:          { en: "Balance",              zh: "余额" },
  allWorkspaces:    { en: "All Workspaces",       zh: "全部工作区" },
  noData:           { en: "No data",              zh: "暂无数据" },

  // Status labels
  pending:          { en: "Pending",              zh: "待处理" },
  sending:          { en: "Sending",              zh: "发送中" },
  completed:        { en: "Completed",            zh: "已完成" },
  failed:           { en: "Failed",               zh: "失败" },
  delivered:        { en: "Delivered",            zh: "已送达" },

  // Dashboard
  welcomeBack:      { en: "Welcome back",         zh: "欢迎回来" },
  balancePhp:       { en: "Balance (₱ PHP)",      zh: "余额 (₱ PHP)" },
  todaySent:        { en: "Today Sent",           zh: "今日发送" },
  monthSent:        { en: "Month Sent",           zh: "本月发送" },
  todayDelivered:   { en: "Today Delivered",      zh: "今日送达" },
  todayFailed:      { en: "Today Failed",         zh: "今日失败" },
  successRate:      { en: "Success Rate",         zh: "成功率" },
  smsTrafficMonth:  { en: "SMS Traffic (This Month)", zh: "短信流量（本月）" },
  workspaceList:    { en: "Workspace",            zh: "工作区" },
  balanceSummary:   { en: "Balance Summary",      zh: "余额汇总" },
  noTrafficData:    { en: "No traffic data for this month", zh: "本月暂无流量数据" },
  noWorkspace:      { en: "No workspace configured", zh: "未配置工作区" },

  // Tasks
  smsTasks:         { en: "SMS Tasks",            zh: "短信任务" },
  smsTasksSub:      { en: "Manage and track your SMS send tasks", zh: "管理和跟踪短信发送任务" },
  createTask:       { en: "Create Task",          zh: "创建任务" },
  allStatuses:      { en: "All Statuses",         zh: "全部状态" },
  taskName:         { en: "Task Name",            zh: "任务名称" },
  total:            { en: "Total",                zh: "总计" },
  sent:             { en: "Sent",                 zh: "已发送" },
  costPhp:          { en: "Cost (₱)",             zh: "费用 (₱)" },
  noTasks:          { en: "No tasks found.",      zh: "暂无任务。" },
  createOne:        { en: "Create one",           zh: "立即创建" },

  // Records
  sendRecords:      { en: "Send Records",         zh: "发送记录" },
  sendRecordsSub:   { en: "Detailed delivery records for all messages", zh: "所有消息的详细投递记录" },
  totalSent:        { en: "Total Sent",           zh: "总发送量" },
  deliveryRate:     { en: "Delivery Rate",        zh: "投递率" },
  totalCost:        { en: "Total Cost",           zh: "总费用" },
  avgLatency:       { en: "Avg Latency",          zh: "平均延迟" },
  sendResult:       { en: "Send Result",          zh: "发送结果" },
  recipient:        { en: "Recipient",            zh: "收件人" },
  senderId:         { en: "Sender ID",            zh: "发送方ID" },
  operator:         { en: "Operator",             zh: "运营商" },
  smsContent:       { en: "SMS Content",          zh: "短信内容" },
  reason:           { en: "Reason",               zh: "原因" },
  deliveryTime:     { en: "Delivery Time",        zh: "投递时间" },
  latency:          { en: "Latency",              zh: "延迟" },
  noRecords:        { en: "No records found",     zh: "暂无记录" },

  // Billing
  financialRecords: { en: "Financial Records",    zh: "财务记录" },
  financialSub:     { en: "Billing history and expense breakdown", zh: "账单历史与费用明细" },
  totalExpense:     { en: "Total Expense",        zh: "总支出" },
  totalMessages:    { en: "Total Messages",       zh: "总消息量" },
  task:             { en: "Task",                 zh: "任务" },
  amountPhp:        { en: "Amount (₱)",           zh: "金额 (₱)" },
  messages:         { en: "Messages",             zh: "消息数" },
  description:      { en: "Description",          zh: "描述" },
  noBilling:        { en: "No billing records found", zh: "暂无账单记录" },
  recharge:         { en: "Recharge",             zh: "充值" },
  sms:              { en: "SMS",                  zh: "短信" },

  // Statistics
  statisticsSub:    { en: "Delivery performance and traffic analytics", zh: "投递性能与流量分析" },
  dailyVolume:      { en: "Daily SMS Volume (This Month)", zh: "每日短信量（本月）" },
  trafficByProduct: { en: "Traffic by Product",   zh: "按产品流量" },
  deliveryFunnel:   { en: "Delivery Funnel",      zh: "投递漏斗" },
  noTrafficChart:   { en: "No traffic data",      zh: "暂无流量数据" },

  // Workspaces
  workspaces:       { en: "Workspaces",           zh: "工作区列表" },
  workspacesSub:    { en: "Manage your SMS sending workspaces", zh: "管理您的短信发送工作区" },
  newWorkspace:     { en: "New Workspace",         zh: "新建工作区" },
  workspaceName:    { en: "Workspace Name",        zh: "工作区名称" },
  createWorkspace:  { en: "Create Workspace",      zh: "创建工作区" },
  noWorkspaces:     { en: "No workspaces yet",     zh: "暂无工作区" },
  noWorkspacesSub:  { en: "Create a workspace to start sending SMS campaigns.", zh: "创建工作区以开始短信群发。" },
  createFirst:      { en: "Create First Workspace", zh: "创建第一个工作区" },

  // Create Task
  createTaskSub:    { en: "Compose and send an SMS campaign to Philippine numbers.", zh: "编写并发送短信群发至菲律宾号码。" },
  taskDetails:      { en: "Task Details",          zh: "任务详情" },
  smsRecipients:    { en: "SMS Recipients",        zh: "短信收件人" },
  philippinesOnly:  { en: "Philippines only",      zh: "仅限菲律宾" },
  uploadExcel:      { en: "Upload Excel / CSV",    zh: "上传 Excel/CSV" },
  readsFirstCol:    { en: "Reads first column",    zh: "读取第一列" },
  smsMessage:       { en: "SMS Message",           zh: "短信内容" },
  sendSms:          { en: "Send SMS",              zh: "发送短信" },
  sending2:         { en: "Sending...",            zh: "发送中..." },
  summary:          { en: "Summary",               zh: "摘要" },
  messageType:      { en: "Message Type",          zh: "消息类型" },
  fixedContent:     { en: "Fixed Content",         zh: "固定内容" },
  recipients:       { en: "Recipients",            zh: "收件人数" },
  sendTime:         { en: "Send Time",             zh: "发送时间" },
  immediate:        { en: "Immediate",             zh: "立即发送" },
  estCost:          { en: "Est. Cost",             zh: "预估费用" },
  messagePreview:   { en: "Message Preview",       zh: "消息预览" },
  routeBreakdown:   { en: "Route Breakdown",       zh: "路由分布" },
  operatorDetect:   { en: "Operator Detection",    zh: "运营商识别" },
  senderIdOptional: { en: "Sender ID (optional)",  zh: "发送方ID（可选）" },
  selectWorkspace:  { en: "Select workspace",      zh: "选择工作区" },
  leaveBlank:       { en: "Leave blank to use default", zh: "留空使用默认" },
};

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getStoredLang);

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem("orbit_lang", l); } catch {}
  }

  function t(key: string): string {
    return T[key]?.[lang] ?? key;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
