import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Radar,
  Settings,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { OnboardingTour } from "./OnboardingTour";
import { AskTheGrid } from "./AskTheGrid";
import GlobalSearch from "./GlobalSearch";

// ─── Role helpers ─────────────────────────────────────────────────────────────
type UserRole = "sls_admin" | "sls_rep" | "sls_pm" | "client_architect" | "client_gc" | "user" | "admin";

function isInternal(role?: string) {
  return role === "sls_admin" || role === "sls_rep" || role === "sls_pm" || role === "admin";
}
function isAdmin(role?: string) {
  return role === "sls_admin" || role === "admin";
}
function isPM(role?: string) {
  return role === "sls_pm" || isAdmin(role);
}

// ─── Nav item type ────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: number;
}

// ─── SLS Sun Icon (SVG) ───────────────────────────────────────────────────────
function SLSSunIcon({ size = 32, color = "#d29c3c" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="10" fill={color} />
      <line x1="40" y1="6" x2="40" y2="20" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="60" x2="40" y2="74" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="6" y1="40" x2="20" y2="40" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="40" x2="74" y2="40" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="15.5" y1="15.5" x2="25.4" y2="25.4" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="54.6" y1="54.6" x2="64.5" y2="64.5" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="64.5" y1="15.5" x2="54.6" y2="25.4" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="25.4" y1="54.6" x2="15.5" y2="64.5" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role?: string }) {
  const labels: Record<string, string> = {
    sls_admin: "Admin",
    sls_rep: "Sales Rep",
    sls_pm: "Project Mgr",
    client_architect: "Architect",
    client_gc: "General Contractor",
    admin: "Admin",
    user: "User",
  };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(210,156,60,0.2)", color: "#d29c3c" }}>
      {labels[role ?? "user"] ?? role}
    </span>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
interface SLSLayoutProps {
  children: React.ReactNode;
}

export default function SLSLayout({ children }: SLSLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Global keyboard shortcut: Cmd/Ctrl+K opens search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Notification count
  const { data: notifData } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadCount = notifData?.count ?? 0;

  // Message count
  const { data: msgData } = trpc.messages.getUnreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const unreadMessages = msgData?.count ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f9f9f9" }}>
        <div className="text-center">
          <SLSSunIcon size={48} color="#d29c3c" />
          <p className="mt-4 text-sm uppercase tracking-widest" style={{ color: "#262b2e" }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Invite accept page handles its own auth flow — render without the portal shell
  if (location.startsWith("/invite/")) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const role = user?.role as UserRole | undefined;

  const primaryNav: NavItem[] = [
    { label: "Dashboard", href: "/", icon: <LayoutDashboard size={18} /> },
    { label: "Projects", href: "/projects", icon: <Building2 size={18} /> },
    { label: "Documents", href: "/documents", icon: <FolderOpen size={18} /> },
    { label: "Messages", href: "/messages", icon: <MessageSquare size={18} />, badge: unreadMessages },
  ];

  const toolsNav: NavItem[] = [
    { label: "Submittals", href: "/submittals", icon: <ClipboardCheck size={18} /> },
    {
      label: "Budget Overview",
      href: "/budget",
      icon: <DollarSign size={18} />,
      roles: ["sls_admin", "sls_pm", "admin"],
    },
    {
      label: "Timeline Overview",
      href: "/timeline",
      icon: <BarChart3 size={18} />,
      roles: ["sls_admin", "sls_pm", "admin"],
    },
    {
      label: "Prospect Radar",
      href: "/prospect-radar",
      icon: <Radar size={18} />,
      roles: ["sls_admin", "sls_rep", "sls_pm", "admin"],
    },
  ];

  const bottomNav: NavItem[] = [
    { label: "Team Directory", href: "/team", icon: <Users size={18} /> },
    { label: "Manufacturers", href: "/manufacturers", icon: <BookOpen size={18} />, roles: ["sls_admin", "sls_rep", "sls_pm", "admin"] },
    { label: "Notifications", href: "/notifications", icon: <Bell size={18} />, badge: unreadCount },
    { label: "AI Copilot", href: "/copilot", icon: <Zap size={18} /> },
    { label: "Reports", href: "/reports", icon: <FileText size={18} />, roles: ["sls_admin", "sls_pm", "admin"] },
    { label: "Settings", href: "/settings", icon: <Settings size={18} /> },
    { label: "Admin", href: "/admin", icon: <ShieldCheck size={18} />, roles: ["sls_admin", "admin"] },
  ];

  function canSee(item: NavItem) {
    if (!item.roles) return true;
    return item.roles.includes(role ?? "user");
  }

  function NavLink({ item }: { item: NavItem }) {
    if (!canSee(item)) return null;
    const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
    return (
      <Link href={item.href}>
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group cursor-pointer ${
            active
              ? "text-[#d29c3c] bg-white/10 font-medium"
              : "text-[#c8bfb0] hover:text-[#d29c3c] hover:bg-white/5"
          }`}
          style={{ fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "12px" }}
          onClick={() => setMobileOpen(false)}
        >
          <span className={`flex-shrink-0 ${active ? "text-[#d29c3c]" : "text-[#7a6e62] group-hover:text-[#d29c3c]"}`}>
            {item.icon}
          </span>
          {!collapsed && (
            <span className="flex-1 truncate">{item.label}</span>
          )}
          {!collapsed && item.badge && item.badge > 0 ? (
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-[#d29c3c] text-white font-medium min-w-[20px] text-center">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </div>
      </Link>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: "#1b110b" }}>
      {/* Logo */}
      <div className="flex flex-col border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-3">
          {collapsed ? (
            <SLSSunIcon size={28} color="#d29c3c" />
          ) : (
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/108182355/gZq5RAaJTRaYvWJVuHdyCg/sls-main-logo_f7181f53.png" alt="Southern Lighting Source" style={{ height: "40px", width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          )}
          <button
            className="ml-auto p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            style={{ color: "#7a6e62" }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        {!collapsed && (
          <div className="px-4 pb-4">
            <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "18px", color: "#d29c3c", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.1 }}>
              The GRID
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "10px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.18em", marginTop: "2px" }}>
              by SLS
            </div>
          </div>
        )}
      </div>

      {/* Search trigger */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {collapsed ? (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Search (Ctrl+K)"
          >
            <Search size={16} style={{ color: "#7a6e62" }} />
          </button>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Search size={14} style={{ color: "#7a6e62" }} />
            <span className="flex-1 text-xs" style={{ color: "#5a4e42", fontFamily: "Inter, sans-serif" }}>Search…</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#5a4e42", fontFamily: "Inter, sans-serif" }}>⌘K</kbd>
          </button>
        )}
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Tools section */}
        {!collapsed && (
          <div className="pt-4 pb-1 px-3">
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#5a4e42", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Tools
            </span>
          </div>
        )}
        {collapsed && <div className="my-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />}
        {toolsNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Bottom section */}
        {!collapsed && (
          <div className="pt-4 pb-1 px-3">
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#5a4e42", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              More
            </span>
          </div>
        )}
        {collapsed && <div className="my-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />}
        {bottomNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{ background: "#d29c3c" }}>
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: "#e8e3d8" }}>{user?.name ?? "User"}</div>
              <RoleBadge role={user?.role} />
            </div>
            <button
           onClick={logout}
              className="ml-auto p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"            style={{ color: "#7a6e62" }}
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full flex justify-center p-2 rounded hover:bg-white/10 transition-colors"
            style={{ color: "#7a6e62" }}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

      {/* Powered by Taptico */}
      {!collapsed && (
        <div className="px-4 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#32323a" }}>
          <a href="https://taptico.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Powered by
            </span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 700, color: "#a0a0b0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Taptico
            </span>
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "#f9f9f9" }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar - desktop */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ${collapsed ? "w-16" : "w-[260px]"}`}
        style={{ position: "sticky", top: 0, height: "100vh" }}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar - mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-white sticky top-0 z-30" style={{ borderColor: "#e8e3d8" }}>
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded hover:bg-gray-100">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/108182355/gZq5RAaJTRaYvWJVuHdyCg/sls-main-logo_f7181f53.png" alt="Southern Lighting Source" style={{ height: "28px", width: "auto", objectFit: "contain" }} />
          <div className="flex flex-col ml-1">
            <span style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.1 }}>The GRID</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "9px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.15em" }}>by SLS</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 page-enter">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t py-4 px-6 flex items-center justify-between" style={{ background: "#32323a", borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <SLSSunIcon size={16} color="#d29c3c" />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a0a0b0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              © 2025 Southern Lighting Source. All rights reserved.
            </span>
          </div>
          <a href="https://taptico.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Powered by
            </span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 700, color: "#c8bfb0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Taptico
            </span>
          </a>
        </footer>
      </div>

      {/* Onboarding Tour - first login only */}
      <OnboardingTour />

      {/* Ask The GRID - floating chatbot */}
      <AskTheGrid />

      {/* Global Search palette */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage() {
  const loginUrl = getLoginUrl();
  return (
    <div className="min-h-screen flex sls-watermark-bg" style={{ background: "#f9f9f9" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden" style={{ background: "#1b110b" }}>
        <div className="absolute inset-0 sls-watermark-bg opacity-10" />
        <div className="relative z-10">
          <div className="mb-8">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/108182355/gZq5RAaJTRaYvWJVuHdyCg/sls-main-logo_f7181f53.png" alt="Southern Lighting Source" style={{ height: "100px", width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </div>
          <div className="mb-10">
            <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "42px", color: "#d29c3c", textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1 }}>The GRID</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "13px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.25em", marginTop: "4px" }}>by SLS</div>
          </div>
          <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "36px", color: "#ffffff", lineHeight: 1.2, textTransform: "uppercase" }}>
            On Time.<br />On Budget.<br />
            <span style={{ color: "#d29c3c" }}>Beautiful.</span>
          </div>
          <p className="mt-6" style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", color: "#c8bfb0", lineHeight: 1.7, maxWidth: "380px" }}>
            Your centralized hub for lighting project management — from specification to installation.
          </p>
        </div>
        <div className="relative z-10">
          <div className="flex gap-6">
            {[
              { label: "Projects Managed", value: "500+" },
              { label: "Awards Won", value: "20+" },
              { label: "States Served", value: "4" },
            ].map((stat) => (
              <div key={stat.label}>
                <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "24px", color: "#d29c3c" }}>{stat.value}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em" }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <a href="https://taptico.com" target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#5a4e42", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Powered by Taptico Solutions
            </a>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/108182355/gZq5RAaJTRaYvWJVuHdyCg/sls-main-logo_f7181f53.png" alt="Southern Lighting Source" style={{ height: "80px", width: "auto", objectFit: "contain", marginBottom: "10px" }} />
            <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "28px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1 }}>The GRID</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "11px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.2em", marginTop: "3px" }}>by SLS</div>
          </div>

          <div className="mb-8">
            <h1 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "28px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Client Portal
            </h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "#262b2e", marginTop: "8px" }}>
              Sign in to access your projects, documents, and submittals.
            </p>
          </div>

          <a href={loginUrl} className="block w-full">
            <button
              className="w-full py-3 px-6 rounded-md font-medium transition-all duration-250 text-sm uppercase tracking-wider"
              style={{
                background: "#1b110b",
                color: "#ffffff",
                border: "1.5px solid #1b110b",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.06em",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "#d29c3c";
                (e.target as HTMLButtonElement).style.borderColor = "#d29c3c";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "#1b110b";
                (e.target as HTMLButtonElement).style.borderColor = "#1b110b";
              }}
            >
              Sign In to Portal
            </button>
          </a>

          <div className="mt-6 text-center">
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>
              Need access? Contact your SLS representative.
            </p>
          </div>

          <div className="mt-12 pt-6 border-t" style={{ borderColor: "#e8e3d8" }}>
            <div className="flex items-center justify-center gap-4">
              {["Georgia", "Tennessee", "Alabama", "National"].map((region) => (
                <span key={region} style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {region}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
