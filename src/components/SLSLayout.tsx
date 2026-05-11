"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  CheckSquare,
  DollarSign,
  CalendarDays,
  MessagesSquare,
  Users,
  Factory,
  Bell,
  Sparkles,
  BarChart3,
  Settings as SettingsIcon,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Required roles. Empty = visible to all signed-in users. */
  roles?: string[];
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const INTERNAL = ["admin", "sls_admin", "sls_rep", "sls_pm"];
const ADMINS = ["admin", "sls_admin"];

const SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Projects",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Submittals", href: "/submittals", icon: CheckSquare },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Budget", href: "/budget", icon: DollarSign, roles: [...INTERNAL, "client_architect"] },
      { label: "Timeline", href: "/timeline", icon: CalendarDays },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Messages", href: "/messages", icon: MessagesSquare },
      { label: "Team", href: "/team", icon: Users },
      { label: "Manufacturers", href: "/manufacturers", icon: Factory, roles: INTERNAL },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "AI Copilot", href: "/copilot", icon: Sparkles },
      { label: "Reports", href: "/reports", icon: BarChart3, roles: INTERNAL },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: SettingsIcon },
      { label: "Admin", href: "/admin", icon: ShieldCheck, roles: ADMINS },
    ],
  },
];

export function SLSLayout({ children }: { children: ReactNode }) {
  const { data: me } = trpc.auth.me.useQuery();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const sections = useMemo(() => {
    if (!me) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.roles || i.roles.includes(me.role)),
    })).filter((s) => s.items.length > 0);
  }, [me]);

  return (
    <div className="min-h-screen bg-sls-off-white">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between bg-sls-dark-brown px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <span className="font-slab text-lg font-bold uppercase tracking-wide text-sls-gold">
            THE GRID
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/70">by SLS</span>
        </div>
        <button onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar (desktop + mobile drawer) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 transform bg-sls-dark-brown text-white transition-transform md:static md:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-5 py-6">
              <div className="font-slab text-2xl font-bold uppercase tracking-wide text-sls-gold">
                THE GRID
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/60">
                by SLS
              </div>
              <div className="mt-4 text-xs italic text-white/70">
                On Time. On Budget. Beautiful.
              </div>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
              {sections.map((section) => (
                <div key={section.label}>
                  <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                    {section.label}
                  </div>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active =
                        pathname === item.href ||
                        (item.href !== "/" && pathname?.startsWith(item.href));
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                              active
                                ? "border-l-[3px] border-sls-gold bg-sls-gold/10 pl-[9px] text-sls-gold"
                                : "text-white/85 hover:bg-white/5",
                            )}
                          >
                            <Icon size={16} />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="border-t border-white/10 px-5 py-4 text-[11px] text-white/60">
              <div>Powered by Taptico</div>
              <div className="mt-1 text-white/40">v0.1.0</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-h-screen flex-1 px-5 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
