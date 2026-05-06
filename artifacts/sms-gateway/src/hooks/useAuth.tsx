import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
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
    const storedUser = localStorage.getItem("sms_user");
    if (stored && storedUser) {
      setToken(stored);
      setUser(JSON.parse(storedUser));
      setAuthTokenGetter(() => stored);
    }
    setIsLoading(false);
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
