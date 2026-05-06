import { useState } from "react";
import { X, CheckCircle, AlertCircle, Eye, EyeOff, Send, Shield, Phone, Mail, User, Lock, Server } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onClose: () => void;
}

type Section = "info" | "email" | "phone" | "password" | "connection";

export default function ProfileModal({ onClose }: Props) {
  const { user, token, updateUser } = useAuth();
  const [section, setSection] = useState<Section>("info");

  // Info section
  const [companyName, setCompanyName] = useState(user?.companyName ?? "");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  // Email section
  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailDevOtp, setEmailDevOtp] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Phone section
  const [newPhone, setNewPhone] = useState(user?.phone ?? "");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneDevOtp, setPhoneDevOtp] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Password section
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function callProfile(body: object) {
    const r = await fetch("/api/profile", { method: "PUT", headers, body: JSON.stringify(body) });
    const data = await r.json();
    if (r.ok) updateUser(data);
    return { ok: r.ok, data };
  }

  // --- Info ---
  async function saveInfo() {
    setInfoSaving(true); setInfoMsg("");
    const { ok } = await callProfile({ companyName });
    setInfoSaving(false);
    setInfoMsg(ok ? "Saved!" : "Failed to save");
    if (ok) setTimeout(() => setInfoMsg(""), 2000);
  }

  // --- Email ---
  async function saveEmail() {
    setEmailSaving(true); setEmailMsg(null);
    const { ok, data } = await callProfile({ email: newEmail });
    setEmailSaving(false);
    setEmailMsg(ok ? { type: "ok", text: "Email updated. Please verify." } : { type: "err", text: data.error ?? "Failed" });
    if (ok) { setEmailOtpSent(false); setEmailOtp(""); setEmailDevOtp(""); }
  }

  async function sendEmailOtp() {
    setEmailSaving(true); setEmailMsg(null);
    const r = await fetch("/api/profile/send-otp", { method: "POST", headers, body: JSON.stringify({ type: "email" }) });
    const data = await r.json();
    setEmailSaving(false);
    if (r.ok) { setEmailOtpSent(true); setEmailDevOtp(data.devOtp ?? ""); setEmailMsg({ type: "ok", text: data.message }); }
    else setEmailMsg({ type: "err", text: data.error ?? "Failed to send" });
  }

  async function verifyEmailOtp() {
    setEmailSaving(true); setEmailMsg(null);
    const r = await fetch("/api/profile/verify-otp", { method: "POST", headers, body: JSON.stringify({ type: "email", otp: emailOtp }) });
    const data = await r.json();
    setEmailSaving(false);
    if (r.ok) { updateUser(data); setEmailOtpSent(false); setEmailOtp(""); setEmailDevOtp(""); setEmailMsg({ type: "ok", text: "Email verified!" }); }
    else setEmailMsg({ type: "err", text: data.error ?? "Incorrect code" });
  }

  // --- Phone ---
  function formatPHPhone(raw: string) {
    const d = raw.replace(/\D/g, "");
    if (d.startsWith("09") && d.length <= 11) return d;
    if (d.startsWith("639") && d.length <= 12) return d;
    if (d.startsWith("9") && d.length <= 10) return "0" + d;
    return d;
  }

  async function savePhone() {
    const cleaned = newPhone.replace(/\D/g, "").replace(/^0/, "63");
    if (cleaned && !/^63\d{10}$/.test(cleaned)) {
      setPhoneMsg({ type: "err", text: "Enter a valid PH number (e.g. 09171234567 or 639171234567)" });
      return;
    }
    setPhoneSaving(true); setPhoneMsg(null);
    const { ok, data } = await callProfile({ phone: cleaned });
    setPhoneSaving(false);
    setPhoneMsg(ok ? { type: "ok", text: "Number updated. Please verify." } : { type: "err", text: data.error ?? "Failed" });
    if (ok) { setPhoneOtpSent(false); setPhoneOtp(""); setPhoneDevOtp(""); }
  }

  async function sendPhoneOtp() {
    setPhoneSaving(true); setPhoneMsg(null);
    const r = await fetch("/api/profile/send-otp", { method: "POST", headers, body: JSON.stringify({ type: "phone" }) });
    const data = await r.json();
    setPhoneSaving(false);
    if (r.ok) { setPhoneOtpSent(true); setPhoneDevOtp(data.devOtp ?? ""); setPhoneMsg({ type: "ok", text: data.message }); }
    else setPhoneMsg({ type: "err", text: data.error ?? "Failed to send" });
  }

  async function verifyPhoneOtp() {
    setPhoneSaving(true); setPhoneMsg(null);
    const r = await fetch("/api/profile/verify-otp", { method: "POST", headers, body: JSON.stringify({ type: "phone", otp: phoneOtp }) });
    const data = await r.json();
    setPhoneSaving(false);
    if (r.ok) { updateUser(data); setPhoneOtpSent(false); setPhoneOtp(""); setPhoneDevOtp(""); setPhoneMsg({ type: "ok", text: "Mobile number verified!" }); }
    else setPhoneMsg({ type: "err", text: data.error ?? "Incorrect code" });
  }

  // --- Password ---
  async function savePassword() {
    if (newPwd !== confirmPwd) { setPwdMsg({ type: "err", text: "Passwords do not match" }); return; }
    if (newPwd.length < 6) { setPwdMsg({ type: "err", text: "Password must be at least 6 characters" }); return; }
    setPwdSaving(true); setPwdMsg(null);
    const { ok, data } = await callProfile({ currentPassword: currentPwd, newPassword: newPwd });
    setPwdSaving(false);
    if (ok) { setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); setPwdMsg({ type: "ok", text: "Password changed successfully!" }); }
    else setPwdMsg({ type: "err", text: data.error ?? "Failed" });
  }

  const TABS: { id: Section; label: string; icon: any }[] = [
    { id: "info", label: "Profile", icon: User },
    { id: "email", label: "Email", icon: Mail },
    { id: "phone", label: "Mobile", icon: Phone },
    { id: "password", label: "Security", icon: Lock },
    { id: "connection", label: "Connection", icon: Server },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Account Settings</h2>
            <p className="text-xs text-muted-foreground">{user?.username}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setSection(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  section === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Profile Info */}
          {section === "info" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">{user?.username?.[0]?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{user?.username}</p>
                  <p className="text-xs text-muted-foreground">{user?.role === "admin" ? "Super Admin" : "Client Account"}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Display / Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Your company or display name"
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
              <button onClick={saveInfo} disabled={infoSaving}
                className="w-full py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {infoSaving ? "Saving..." : infoMsg || "Save Name"}
              </button>
            </div>
          )}

          {/* Email */}
          {section === "email" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Current Email</p>
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                </div>
                {user?.emailVerified ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                    <AlertCircle className="w-3 h-3" /> Unverified
                  </span>
                )}
              </div>

              {!user?.emailVerified && (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                  <p className="text-xs font-medium text-amber-400">Verify your email address</p>
                  {!emailOtpSent ? (
                    <button onClick={sendEmailOtp} disabled={emailSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                      <Send className="w-3 h-3" />
                      {emailSaving ? "Sending..." : "Send Verification Code"}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {emailDevOtp && (
                        <div className="p-2 rounded bg-primary/5 border border-primary/20">
                          <p className="text-xs text-muted-foreground">Demo OTP (would be emailed in production):</p>
                          <p className="text-sm font-mono font-bold text-primary">{emailDevOtp}</p>
                        </div>
                      )}
                      <input
                        type="text"
                        value={emailOtp}
                        onChange={e => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        className="w-full bg-background border border-input rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
                        maxLength={6}
                      />
                      <div className="flex gap-2">
                        <button onClick={verifyEmailOtp} disabled={emailSaving || emailOtp.length !== 6}
                          className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                          {emailSaving ? "Verifying..." : "Confirm Code"}
                        </button>
                        <button onClick={sendEmailOtp} disabled={emailSaving}
                          className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground">
                          Resend
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-border pt-4">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Change Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 mb-2"
                />
                <button onClick={saveEmail} disabled={emailSaving || newEmail === user?.email}
                  className="w-full py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {emailSaving ? "Saving..." : "Update Email"}
                </button>
              </div>

              {emailMsg && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded text-xs ${emailMsg.type === "ok" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                  {emailMsg.type === "ok" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {emailMsg.text}
                </div>
              )}
            </div>
          )}

          {/* Phone */}
          {section === "phone" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Current Mobile</p>
                  <p className="text-sm font-medium text-foreground font-mono">{user?.phone || "Not set"}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Philippines numbers only (63XXXXXXXXXX)</p>
                </div>
                {user?.phone && (user?.phoneVerified ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded shrink-0">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded shrink-0">
                    <AlertCircle className="w-3 h-3" /> Unverified
                  </span>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Mobile Number <span className="text-muted-foreground/50">(PH only)</span></label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={e => setNewPhone(formatPHPhone(e.target.value))}
                  placeholder="09171234567 or 639171234567"
                  className="w-full bg-background border border-input rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
                />
                <p className="text-xs text-muted-foreground/50 mt-1">Format: 09XXXXXXXXX or 63XXXXXXXXXX</p>
              </div>
              <button onClick={savePhone} disabled={phoneSaving}
                className="w-full py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {phoneSaving ? "Saving..." : "Save Number"}
              </button>

              {user?.phone && !user?.phoneVerified && (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                  <p className="text-xs font-medium text-amber-400">Verify your mobile number</p>
                  {!phoneOtpSent ? (
                    <button onClick={sendPhoneOtp} disabled={phoneSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                      <Send className="w-3 h-3" />
                      {phoneSaving ? "Sending..." : "Send Verification Code"}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {phoneDevOtp && (
                        <div className="p-2 rounded bg-primary/5 border border-primary/20">
                          <p className="text-xs text-muted-foreground">Demo OTP (would be sent via SMS in production):</p>
                          <p className="text-sm font-mono font-bold text-primary">{phoneDevOtp}</p>
                        </div>
                      )}
                      <input
                        type="text"
                        value={phoneOtp}
                        onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        className="w-full bg-background border border-input rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
                        maxLength={6}
                      />
                      <div className="flex gap-2">
                        <button onClick={verifyPhoneOtp} disabled={phoneSaving || phoneOtp.length !== 6}
                          className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50">
                          {phoneSaving ? "Verifying..." : "Confirm Code"}
                        </button>
                        <button onClick={sendPhoneOtp} disabled={phoneSaving}
                          className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground">
                          Resend
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {phoneMsg && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded text-xs ${phoneMsg.type === "ok" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                  {phoneMsg.type === "ok" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {phoneMsg.text}
                </div>
              )}
            </div>
          )}

          {/* Password */}
          {section === "password" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/50">
                <Shield className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground">Use a strong password of at least 6 characters.</p>
              </div>
              {[
                { label: "Current Password", value: currentPwd, set: setCurrentPwd },
                { label: "New Password", value: newPwd, set: setNewPwd },
                { label: "Confirm New Password", value: confirmPwd, set: setConfirmPwd },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"}
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="w-full bg-background border border-input rounded px-3 py-2 pr-9 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={savePassword} disabled={pwdSaving}
                className="w-full py-2 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {pwdSaving ? "Changing..." : "Change Password"}
              </button>
              {pwdMsg && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded text-xs ${pwdMsg.type === "ok" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                  {pwdMsg.type === "ok" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {pwdMsg.text}
                </div>
              )}
            </div>
          )}

          {/* Connection Details */}
          {section === "connection" && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
                <p className="text-xs text-muted-foreground">These credentials are assigned by the administrator for connecting to the OrbitSMS gateway.</p>
              </div>
              {[
                { label: "SMPP Host", value: user?.smppHost },
                { label: "SMPP Port", value: user?.smppPort },
                { label: "SMPP System ID", value: user?.smppSystemId },
                { label: "SMPP Password", value: user?.smppPassword, secret: true },
                { label: "HTTP API Key", value: user?.httpApiKey, secret: true },
              ].map(({ label, value, secret }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type={secret ? "password" : "text"}
                      readOnly
                      value={value ?? ""}
                      placeholder="Not configured — contact admin"
                      className="flex-1 bg-background border border-input rounded px-3 py-2 text-sm font-mono text-foreground/80 focus:outline-none cursor-default"
                    />
                    {value && (
                      <button
                        onClick={() => navigator.clipboard.writeText(value)}
                        className="px-2 py-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        title="Copy"
                      >
                        Copy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
