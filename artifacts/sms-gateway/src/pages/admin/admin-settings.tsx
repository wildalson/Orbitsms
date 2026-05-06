import { useState } from "react";
import { Settings, Globe, MessageSquare, Bell, Shield } from "lucide-react";

export default function AdminSettings() {
  const [defaultRate, setDefaultRate] = useState("0.25");
  const [currency, setCurrency] = useState("PHP");
  const [defaultSender, setDefaultSender] = useState("SMSGateway");
  const [lowBalanceWarn, setLowBalanceWarn] = useState("50");
  const [chargeMode, setChargeMode] = useState("submitted");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">System Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Global platform configuration and defaults</p>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">General Settings</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Default Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
              <option value="PHP">PHP (₱)</option>
              <option value="USD">USD ($)</option>
              <option value="SGD">SGD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Default SMS Rate (₱ per message)</label>
            <input type="number" step="0.01" value={defaultRate} onChange={e => setDefaultRate(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Default Sender Name</label>
            <input type="text" value={defaultSender} onChange={e => setDefaultSender(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Low Balance Warning (₱)</label>
            <input type="number" step="1" value={lowBalanceWarn} onChange={e => setLowBalanceWarn(e.target.value)}
              className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">SMS Charging Logic</h2>
        </div>
        <p className="text-xs text-muted-foreground">Controls when balance is deducted from client accounts.</p>
        <div className="space-y-2">
          {[
            { value: "submitted", label: "Charge on Submit", desc: "Deduct balance when SMS is submitted (all messages, regardless of delivery)" },
            { value: "delivered", label: "Charge on Delivery", desc: "Deduct balance only when SMS is confirmed delivered" },
          ].map(opt => (
            <label key={opt.value} className="flex items-start gap-3 p-3 rounded border border-border cursor-pointer hover:border-primary/30 transition-colors">
              <input type="radio" name="chargeMode" value={opt.value} checked={chargeMode === opt.value}
                onChange={() => setChargeMode(opt.value)} className="mt-0.5 accent-primary" />
              <div>
                <p className="text-xs font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Provider / API Settings</h2>
        </div>
        <p className="text-xs text-muted-foreground">Connect to an SMS provider API (Laaffic, SMPP, etc.)</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "API URL", placeholder: "https://api.laaffic.com/sms/send" },
            { label: "API Key", placeholder: "your-api-key" },
            { label: "API Secret", placeholder: "your-api-secret" },
            { label: "Default Sender ID", placeholder: "InfoSMS" },
          ].map(({ label, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
              <input type={label.includes("Secret") || label.includes("Key") ? "password" : "text"}
                placeholder={placeholder}
                className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground italic">
          Provider integration is prepared for connection. Configure channels in the client portal to activate SMPP/HTTP bindings.
        </p>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded hover:bg-primary/90 transition-colors">
          <Settings className="w-3.5 h-3.5" />
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
