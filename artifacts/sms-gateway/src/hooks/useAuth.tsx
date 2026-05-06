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
  emailVerified: boolean;
  phoneVerified: boolean;
  smppHost?: string | null;
  smppPort?: string | null;
  smppSystemId?: string | null;
  smppPassword?: string | null;
  httpApiKey?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
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

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(fresh => {
        if (fresh) {
          setUser(fresh);
          localStorage.setItem("sms_user", JSON.stringify(fresh));
        } else {
          localStorage.removeItem("sms_token");
          localStorage.removeItem("sms_user");
          setToken(null);
          setAuthTokenGetter(null);
        }
      })
      .catch(() => {
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

  function updateUser(newUser: AuthUser) {
    setUser(newUser);
    localStorage.setItem("sms_user", JSON.stringify(newUser));
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
