import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  role: "admin" | "client";
  status: "active" | "suspended";
  smsRate: number;
  balance: number;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sms_token");
    if (!stored) {
      setIsLoading(false);
      return;
    }

    setToken(stored);
    setAuthTokenGetter(() => stored);

    // Always re-validate with server so role/status are always fresh
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(fresh => {
        if (fresh) {
          setUser(fresh);
          localStorage.setItem("sms_user", JSON.stringify(fresh));
        } else {
          // Token invalid — clear everything
          localStorage.removeItem("sms_token");
          localStorage.removeItem("sms_user");
          setToken(null);
          setAuthTokenGetter(null);
        }
      })
      .catch(() => {
        // Network error — try to use cached user
        const storedUser = localStorage.getItem("sms_user");
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch { /* ignore */ }
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  function login(newToken: string, newUser: AuthUser) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("sms_token", newToken);
    localStorage.setItem("sms_user", JSON.stringify(newUser));
    setAuthTokenGetter(() => newToken);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("sms_token");
    localStorage.removeItem("sms_user");
    setAuthTokenGetter(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
