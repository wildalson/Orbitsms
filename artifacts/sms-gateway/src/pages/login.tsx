import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Wifi, Satellite } from "lucide-react";
import loginBg from "@/assets/login-bg.png";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const loginMut = useLogin();
  const registerMut = useRegister();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        const data = await loginMut.mutateAsync({ data: { username, password } });
        login(data.token, {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          phone: data.user.phone,
          balance: data.user.balance,
          createdAt: String(data.user.createdAt),
        });
        navigate("/");
      } else {
        const data = await registerMut.mutateAsync({ data: { username, password, email, phone: phone || undefined } });
        login(data.token, {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          phone: data.user.phone,
          balance: data.user.balance,
          createdAt: String(data.user.createdAt),
        });
        navigate("/");
      }
    } catch (err: any) {
      setError(err?.data?.error || err?.message || "Request failed");
    }
  }

  const loading = loginMut.isPending || registerMut.isPending;

  return (
    <div className="min-h-screen flex dark">
      {/* Left panel - visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#030a14]">
        <img src={loginBg} alt="SMS Gateway" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#030a14]/60" />
        <div className="relative z-10 p-10 flex flex-col justify-between w-full">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight">SMS Gateway</span>
          </div>
          <div>
            <div className="flex gap-6 text-white/60 text-sm">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-primary/60" />
                SMPP Protocol
              </div>
              <div className="flex items-center gap-1.5">
                <Satellite className="w-4 h-4 text-primary/60" />
                HTTP Gateway
              </div>
            </div>
            <p className="text-white/30 text-xs mt-3">Telco-grade SMS infrastructure management</p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-96 xl:w-[420px] flex flex-col items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {mode === "login" ? "Back-stage management" : "Create account"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "login" ? "Sign in to your operator account" : "Register a new operator account"}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Account Number</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="langdemo"
                className="w-full bg-card border border-input rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                required
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-card border border-input rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                  required
                />
              </div>
            )}

            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone (optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="w-full bg-card border border-input rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-card border border-input rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                required
              />
            </div>

            {mode === "login" && (
              <div className="text-right">
                <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : mode === "login" ? "Login account" : "Register"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {mode === "login" ? (
              <>Register a new account?{" "}
                <button onClick={() => setMode("register")} className="text-primary hover:underline font-medium">
                  Register an account
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="text-center text-xs text-muted-foreground/40 mt-6">
            Demo: username <span className="font-mono text-muted-foreground/60">langdemo</span> / password <span className="font-mono text-muted-foreground/60">123456</span>
          </p>
        </div>
      </div>
    </div>
  );
}
