import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Send,
  MessageSquare,
  Link2,
  BarChart3,
  DollarSign,
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
  Activity,
  ShieldCheck,
  Layers,
  Settings,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProfileModal from "@/components/ProfileModal";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Workspace", href: "/workspaces", icon: Layers },
  { label: "SMS Send", href: "/tasks", icon: Send },
  { label: "SMS Records", href: "/records", icon: MessageSquare },
  { label: "Channels", href: "/channels", icon: Link2 },
  { label: "Statistics", href: "/stats", icon: BarChart3 },
  { label: "Finance", href: "/billing", icon: DollarSign },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col dark">
      {/* Top Nav */}
      <header className="h-12 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-4 shrink-0 z-50">
        <div className="flex items-center gap-2 text-primary font-bold text-lg tracking-tight">
          <Activity className="w-5 h-5" />
          <span>OrbitSMS</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          {/* Verification badges */}
          <div className="hidden lg:flex items-center gap-1.5">
            {user?.emailVerified ? (
              <span className="flex items-center gap-1 text-xs text-green-400" title="Email verified">
                <CheckCircle className="w-3 h-3" />
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-400/60" title="Email not verified">
                <AlertCircle className="w-3 h-3" />
              </span>
            )}
            {user?.phone && (user?.phoneVerified ? (
              <span className="flex items-center gap-1 text-xs text-green-400" title="Phone verified">
                <CheckCircle className="w-3 h-3" />
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-400/60" title="Phone not verified">
                <AlertCircle className="w-3 h-3" />
              </span>
            ))}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2 text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="hidden md:block">{user?.username}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-popover border border-popover-border rounded shadow-lg z-50">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium text-foreground">{user?.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <div className="flex gap-2 mt-1">
                    {user?.emailVerified ? (
                      <span className="text-xs text-green-400 flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Email</span>
                    ) : (
                      <span className="text-xs text-amber-400 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" /> Email</span>
                    )}
                    {user?.phone && (user?.phoneVerified ? (
                      <span className="text-xs text-green-400 flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Mobile</span>
                    ) : (
                      <span className="text-xs text-amber-400 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" /> Mobile</span>
                    ))}
                  </div>
                </div>
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs text-muted-foreground">Balance (PHP)</p>
                  <p className="text-sm font-mono font-semibold text-primary">₱{(user?.balance ?? 0).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => { setUserMenuOpen(false); setProfileOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/40 transition-colors border-b border-border"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  Account Settings
                </button>
                {user?.role === "admin" && (
                  <Link href="/admin">
                    <span className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer border-b border-border">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Admin Panel
                    </span>
                  </Link>
                )}
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-12 bg-sidebar z-40 p-4">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded text-sm font-medium cursor-pointer transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
            {user?.role === "admin" && (
              <Link href="/admin">
                <span onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded text-sm font-medium cursor-pointer transition-colors text-red-400 hover:bg-red-500/10">
                  <ShieldCheck className="w-4 h-4" />
                  Admin Panel
                </span>
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Profile modal */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
