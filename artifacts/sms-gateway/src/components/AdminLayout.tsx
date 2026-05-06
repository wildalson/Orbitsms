import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Activity,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "SMS Logs", href: "/admin/logs", icon: MessageSquare },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex dark">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-56 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="h-12 flex items-center gap-2 px-4 border-b border-sidebar-border shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-foreground tracking-tight">OrbitSMS Admin</span>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <span
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors cursor-pointer",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground truncate">Super Admin</p>
            </div>
          </div>
          <Link href="/">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer">
              <Activity className="w-3.5 h-3.5" />
              Client View
            </span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col">
        {/* Mobile header */}
        <header className="h-12 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3 md:hidden shrink-0">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-sm font-bold text-foreground">OrbitSMS Admin</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
